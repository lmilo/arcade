-- Arcade — esquema de Supabase (pegar en SQL Editor → Run).
-- Idempotente: se puede correr varias veces sin romper nada.

-- ── Perfiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  name       text not null default 'Jugador',
  avatar     text not null default '🕹️',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "perfiles visibles para todos" on public.profiles;
create policy "perfiles visibles para todos"
  on public.profiles for select using (true);

drop policy if exists "edita tu propio perfil" on public.profiles;
create policy "edita tu propio perfil"
  on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- Crea el perfil automáticamente al registrarse.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Puntuaciones ─────────────────────────────────────────────────────────────
create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users on delete cascade,
  game_id    text not null,
  score      int  not null check (score >= 0 and score <= 10000000),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create index if not exists scores_game_score_idx on public.scores (game_id, score desc);

alter table public.scores enable row level security;

drop policy if exists "rankings visibles para todos" on public.scores;
create policy "rankings visibles para todos"
  on public.scores for select using (true);

drop policy if exists "escribe solo tus puntajes" on public.scores;
create policy "escribe solo tus puntajes"
  on public.scores for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── RPCs ─────────────────────────────────────────────────────────────────────
-- Guarda el puntaje del usuario actual quedándose con el mejor. Devuelve el mejor.
create or replace function public.submit_score(p_game text, p_score int)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_best int;
begin
  if auth.uid() is null then
    raise exception 'no autenticado';
  end if;
  if p_score < 0 or p_score > 10000000 then
    raise exception 'puntaje fuera de rango';
  end if;

  insert into public.scores (user_id, game_id, score, updated_at)
  values (auth.uid(), p_game, p_score, now())
  on conflict (user_id, game_id)
  do update set score = greatest(public.scores.score, excluded.score),
                updated_at = now()
  returning score into v_best;

  return v_best;
end;
$$;

-- Top N de un juego con nombre, avatar, score y posición.
create or replace function public.get_leaderboard(p_game text, p_limit int default 20)
returns table (user_id uuid, name text, avatar text, score int, rank bigint)
language sql stable security definer set search_path = public as $$
  select s.user_id,
         coalesce(p.name, 'Jugador') as name,
         coalesce(p.avatar, '🕹️')   as avatar,
         s.score,
         rank() over (order by s.score desc) as rank
  from public.scores s
  left join public.profiles p on p.id = s.user_id
  where s.game_id = p_game
  order by s.score desc
  limit greatest(1, least(p_limit, 100));
$$;

-- Posición del usuario actual en un juego (aunque no esté en el top).
create or replace function public.get_my_rank(p_game text)
returns table (name text, avatar text, score int, rank bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(p.name, 'Jugador'),
         coalesce(p.avatar, '🕹️'),
         s.score,
         (select count(*) + 1 from public.scores s2
            where s2.game_id = p_game and s2.score > s.score) as rank
  from public.scores s
  left join public.profiles p on p.id = s.user_id
  where s.game_id = p_game and s.user_id = auth.uid();
$$;
