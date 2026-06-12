export const AVATARS = ['🦊', '🐼', '🐸', '🐵', '🐙', '🦄', '🐲', '👾', '🤖', '🐯', '🦁', '🐧'] as const

export interface Profile {
  name: string
  avatar: string
  createdAt: number
}

export interface ScoreEntry {
  score: number
  at: number
}

export interface GameStats {
  best: number
  plays: number
  totalScore: number
  recent: ScoreEntry[]
}

export interface Persisted {
  version: number
  profile: Profile
  stats: Record<string, GameStats>
  achievements: string[]
}

export const STORE_VERSION = 1

export function emptyStats(): GameStats {
  return { best: 0, plays: 0, totalScore: 0, recent: [] }
}

export function defaultPersisted(): Persisted {
  return {
    version: STORE_VERSION,
    profile: {
      name: 'Jugador',
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      createdAt: Date.now(),
    },
    stats: {},
    achievements: [],
  }
}
