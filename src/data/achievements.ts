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

const RULES: Rule[] = [
  { id: 'welcome', name: 'Primer cartucho', desc: 'Juega tu primera partida', icon: '🎮', check: (c) => c.totalPlays >= 1 },
  { id: 'snake15', name: 'Serpiente glotona', desc: 'Llega a 15 en Snake', icon: '🐍', check: (c) => best(c.stats, 'snake') >= 15 },
  { id: 'tetris1000', name: 'Maestro del bloque', desc: 'Suma 1000 en Tetris', icon: '🧱', check: (c) => best(c.stats, 'tetris') >= 1000 },
  { id: 'n2048_1500', name: 'Potencias de dos', desc: 'Suma 1500 en 2048', icon: '🔢', check: (c) => best(c.stats, '2048') >= 1500 },
  { id: 'breakout500', name: 'Demoledor', desc: 'Suma 500 en Breakout', icon: '🧱', check: (c) => best(c.stats, 'breakout') >= 500 },
  { id: 'allrounder', name: 'Todoterreno', desc: 'Prueba los 4 juegos', icon: '🎯', check: (c) => c.gamesPlayed >= 4 },
  { id: 'dedicated', name: 'Enganchado', desc: 'Juega 10 partidas en total', icon: '⭐', check: (c) => c.totalPlays >= 10 },
  { id: 'veteran', name: 'Veterano', desc: 'Juega 50 partidas en total', icon: '🏆', check: (c) => c.totalPlays >= 50 },
  { id: 'highroller', name: 'Acumulador', desc: 'Suma 5000 puntos en total', icon: '💎', check: (c) => c.totalScore >= 5000 },
]

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
