# 🕹️ Pixel Pulse

**Pixel Pulse** es un arcade web de **20 juegos clásicos** que se sienten vivos: motor propio
en Canvas con audio, partículas y screen-shake, perfil con progresión local, y leaderboards
online (con login) y retos por link.

🔗 **En vivo:** https://arcade-xi-sable.vercel.app

> Reescritura completa del proyecto original en Python/tkinter (archivado en la rama
> `legacy-python` y el tag `python-v1`).

---

## 🚀 Cómo correr

Requisitos: **Node 20+**. El online usa **Supabase** (opcional para jugar).

```bash
npm install
cp .env.example .env.local   # pega tu Project URL y anon key de Supabase
npm run dev                  # http://localhost:5173
```

El online es **Supabase directo** (Postgres + Auth + RLS): no hay servidor propio que
levantar. Sin `.env.local`, la app funciona offline (juego + récords locales) y el ranking
se desactiva solo. El esquema de la base está en `supabase/schema.sql` (pegar en el SQL Editor
del proyecto Supabase).

```bash
npm run build         # build de producción
npm run preview       # sirve el build
```

---

## 🎮 Catálogo

| | Juego | Mecánica |
|---|---|---|
| 🐍 | **Snake** | Crece sin morderte; tablero pequeño/normal/grande. |
| 🧱 | **Tetris** | Piezas, rotación, hold (C) y pieza siguiente. |
| 🔢 | **2048** | Combina fichas; cuadrícula 4×4 / 5×5 / 6×6. |
| 🧱 | **Breakout** | Ladrillos, power-ups, debuffs y bloques duros. |
| 🐤 | **Flappy** | Un botón: aletea y esquiva tuberías. |
| 👾 | **Space Invaders** | Defiende la galaxia por oleadas. |
| 🏓 | **Pong** | Duelo de paletas contra la IA. |
| 🧠 | **Memory** | Parejas por niveles: el tablero crece. |
| 🚩 | **Buscaminas** | Clic izq destapa / der marca; 3 dificultades. |
| ❌ | **Tic-Tac-Toe** | Tres en raya vs IA; racha de victorias. |
| 🔵 | **Conecta 4** | Cuatro en línea vs IA; racha de victorias. |
| 🔴 | **Simon** | Repite secuencias de color cada vez más largas. |
| 🔨 | **Topos** | Aporrea topos contrarreloj (30 s). |
| 🚀 | **Asteroids** | Inercia, disparo y pantalla envolvente. |
| 🌠 | **Esquiva** | Esquiva la lluvia que cae y acelera. |
| 🟦 | **Tron** | Duelo de estelas en rejilla vs IA. |
| 🦘 | **Saltarín** | Sube saltando; bloques resorte y desvanecentes. |
| 🐸 | **Cruce** | Cruza los carriles esquivando el tráfico. |
| 🛡️ | **Defensa** | Intercepta misiles con explosiones. |
| 💡 | **Apaga Luces** | Apaga el tablero a tiempo; 3 dificultades. |

Cada juego trae su tutorial (botón **ℹ️ Cómo jugar**), récord local, logros y ranking.

---

## 🧱 Arquitectura

Separación dura entre el **motor** (TypeScript puro, agnóstico de React y de cada juego)
y el **shell** (React, todo lo que rodea al canvas).

```
src/
├─ engine/        # GameLoop (paso fijo), Game (clase base + bus de eventos),
│                 # Input (teclado/táctil/puntero), Renderer (DPR),
│                 # Audio (sfx por Web Audio), Particles, Camera (shake), Tween
├─ games/         # un directorio por juego + registry.ts (catálogo)
├─ app/           # shell React: menú, juego (GameHost), perfil/cuenta, ranking, ayuda
├─ data/          # store local + cliente Supabase (auth, leaderboard, perfil)
└─ shared/        # tema/paleta
supabase/         # schema.sql: tablas, RLS y RPCs para pegar en Supabase
server/           # backend FastAPI legado (DEPRECADO, reemplazado por Supabase)
```

**Añadir un juego** = una clase que extiende `Game` (`update`, `render`, `reset`,
emite `score`/`gameover`) + una entrada en `src/games/registry.ts`. Hereda gratis el
game loop, el input, el juice, la pantalla de inicio, el récord, los logros, el ranking
y el botón de compartir.

---

## ✨ Qué lo hace "vivo"

- **Juice:** audio sintetizado (sin assets), partículas, screen-shake, tweens y
  transiciones; pantalla de inicio con botón Iniciar.
- **Progresión local:** perfil con avatar y nombre, récord por juego, logros y monedas,
  todo en `localStorage`.
- **Social:** cuentas con **login** (Supabase Auth), leaderboards globales por juego con tu
  posición resaltada, y **retos por link** (`/play/:id?reto=N&por=nombre`) para desafiar a un amigo.

---

## 🛠️ Stack

- **Frontend:** Vite + TypeScript + React (shell) + Canvas2D (juegos).
- **Online:** Supabase (Postgres + Auth + RLS), consumido directo desde el front.
- Sin dependencias de motores de juego: el engine es propio.
