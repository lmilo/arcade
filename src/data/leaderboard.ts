import { supabase } from './supabase'

export interface LeaderEntry {
  name: string
  avatar: string
  score: number
  isYou: boolean
}

export interface Leaderboard {
  entries: LeaderEntry[]
  you: LeaderEntry | null
  yourRank: number | null
  total: number
}

export interface CloudProfile {
  name: string
  avatar: string
  nameSet: boolean
}

/**
 * Cliente de leaderboard sobre Supabase. Toda llamada degrada a `null` si no hay online
 * configurado, no hay sesión o falla la red, para que el juego siga funcionando.
 */
export async function submitScore(gameId: string, score: number): Promise<number | null> {
  if (!supabase) return null
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) return null
  const { data, error } = await supabase.rpc('submit_score', { p_game: gameId, p_score: score })
  if (error) return null
  return data as number
}

export async function fetchLeaderboard(gameId: string): Promise<Leaderboard | null> {
  if (!supabase) return null
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const myId = sessionData.session?.user.id ?? null

    const { data: rows, error } = await supabase.rpc('get_leaderboard', { p_game: gameId, p_limit: 20 })
    if (error) return null

    const entries: LeaderEntry[] = (rows ?? []).map((r: LeaderRow) => ({
      name: r.name,
      avatar: r.avatar,
      score: r.score,
      isYou: myId !== null && r.user_id === myId,
    }))

    const { count } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId)

    let you: LeaderEntry | null = null
    let yourRank: number | null = null
    if (myId) {
      const { data: mine } = await supabase.rpc('get_my_rank', { p_game: gameId })
      const row = (mine ?? [])[0] as MyRankRow | undefined
      if (row) {
        you = { name: row.name, avatar: row.avatar, score: row.score, isYou: true }
        yourRank = Number(row.rank)
      }
    }

    return { entries, you, yourRank, total: count ?? entries.length }
  } catch {
    return null
  }
}

export async function fetchMyProfile(): Promise<CloudProfile | null> {
  if (!supabase) return null
  const { data: sessionData } = await supabase.auth.getSession()
  const uid = sessionData.session?.user.id
  if (!uid) return null
  const { data, error } = await supabase.from('profiles').select('name, avatar, name_set').eq('id', uid).single()
  if (error || !data) return null
  return { name: data.name, avatar: data.avatar, nameSet: data.name_set }
}

export interface SetProfileResult {
  ok: boolean
  error?: string
}

/** Fija nombre (único) + avatar de la cuenta. Devuelve error en español si el nombre está tomado. */
export async function setProfile(name: string, avatar: string): Promise<SetProfileResult> {
  if (!supabase) return { ok: false, error: 'Sin conexión.' }
  const { error } = await supabase.rpc('set_profile', { p_name: name, p_avatar: avatar })
  if (!error) return { ok: true }
  const m = (error.message ?? '').toUpperCase()
  if (m.includes('NOMBRE_EN_USO')) return { ok: false, error: 'Ese nombre ya está en uso. Elige otro.' }
  if (m.includes('NOMBRE_LARGO')) return { ok: false, error: 'El nombre debe tener entre 2 y 16 caracteres.' }
  return { ok: false, error: 'No se pudo guardar tu identidad.' }
}

interface LeaderRow {
  user_id: string
  name: string
  avatar: string
  score: number
  rank: number
}

interface MyRankRow {
  name: string
  avatar: string
  score: number
  rank: number
}
