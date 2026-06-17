import type { GameStats, Persisted } from './model'

export interface Achievement {
  id: string
  name: string
  desc: string
  icon: string
}

interface CheckCtx {
  stats: Record<string, GameStats>
  totalPlays: number
  totalScore: number
  gamesPlayed: number
}

type Rule = Achievement & { check: (c: CheckCtx) => boolean }

const best = (stats: Record<string, GameStats>, id: string) => stats[id]?.best ?? 0

// Tres metas de mejor puntaje por juego. Los umbrales van acorde a cómo puntúa cada uno.
interface GameTier {
  id: string
  name: string
  t: [number, number, number]
}

const GAME_TIERS: GameTier[] = [
  { id: 'snake', name: 'Snake', t: [10, 25, 50] },
  { id: 'tetris', name: 'Tetris', t: [1000, 5000, 15000] },
  { id: '2048', name: '2048', t: [1000, 5000, 20000] },
  { id: 'breakout', name: 'Breakout', t: [300, 1000, 3000] },
  { id: 'flappy', name: 'Flappy', t: [10, 25, 50] },
  { id: 'invaders', name: 'Space Invaders', t: [300, 1000, 3000] },
  { id: 'pong', name: 'Pong', t: [5, 15, 30] },
  { id: 'memory', name: 'Memory', t: [500, 1500, 4000] },
  { id: 'mines', name: 'Buscaminas', t: [30, 100, 300] },
  { id: 'tictactoe', name: 'Tic-Tac-Toe', t: [1, 5, 10] },
  { id: 'connect4', name: 'Conecta 4', t: [1, 3, 7] },
  { id: 'simon', name: 'Simon', t: [5, 10, 20] },
  { id: 'whack', name: 'Topos', t: [15, 30, 50] },
  { id: 'asteroids', name: 'Asteroids', t: [500, 2000, 6000] },
  { id: 'dodge', name: 'Esquiva', t: [200, 600, 1500] },
  { id: 'tron', name: 'Tron', t: [1, 5, 12] },
  { id: 'jumper', name: 'Saltarín', t: [100, 300, 800] },
  { id: 'frogger', name: 'Cruce', t: [3, 10, 25] },
  { id: 'defense', name: 'Defensa', t: [100, 400, 1000] },
  { id: 'lightsout', name: 'Apaga Luces', t: [1, 3, 8] },
]

const TIER_NAME = ['Novato', 'Experto', 'Leyenda']
const TIER_ICON = ['🥉', '🥈', '🥇']

const gameRules: Rule[] = GAME_TIERS.flatMap((g) =>
  g.t.map((thr, i) => ({
    id: `${g.id}-t${i + 1}`,
    name: `${g.name} · ${TIER_NAME[i]}`,
    desc: `Alcanza ${thr} en ${g.name}`,
    icon: TIER_ICON[i],
    check: (c: CheckCtx) => best(c.stats, g.id) >= thr,
  })),
)

const globalRules: Rule[] = [
  { id: 'welcome', name: 'Primer cartucho', desc: 'Juega tu primera partida', icon: '🎮', check: (c) => c.totalPlays >= 1 },
  { id: 'explorer', name: 'Explorador', desc: 'Prueba 10 juegos distintos', icon: '🧭', check: (c) => c.gamesPlayed >= 10 },
  { id: 'completionist', name: 'Todoterreno', desc: 'Prueba los 20 juegos', icon: '🌈', check: (c) => c.gamesPlayed >= 20 },
  { id: 'dedicated', name: 'Enganchado', desc: 'Juega 25 partidas en total', icon: '⭐', check: (c) => c.totalPlays >= 25 },
  { id: 'veteran', name: 'Veterano', desc: 'Juega 100 partidas en total', icon: '🏆', check: (c) => c.totalPlays >= 100 },
  { id: 'highroller', name: 'Acumulador', desc: 'Suma 25 000 puntos en total', icon: '💎', check: (c) => c.totalScore >= 25000 },
]

const RULES: Rule[] = [...globalRules, ...gameRules]

export const ACHIEVEMENTS: Achievement[] = RULES.map(({ check: _check, ...a }) => {
  void _check
  return a
})

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

/** Devuelve los ids de todos los logros cumplidos según el estado actual. */
export function evaluateUnlocked(data: Persisted): string[] {
  const stats = data.stats
  let totalPlays = 0
  let totalScore = 0
  let gamesPlayed = 0
  for (const id in stats) {
    totalPlays += stats[id].plays
    totalScore += stats[id].totalScore
    if (stats[id].plays > 0) gamesPlayed += 1
  }
  const ctx: CheckCtx = { stats, totalPlays, totalScore, gamesPlayed }
  return RULES.filter((r) => r.check(ctx)).map((r) => r.id)
}
