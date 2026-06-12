import type { GameStats, Persisted, Profile } from './model'
import { defaultPersisted, emptyStats, STORE_VERSION } from './model'
import { evaluateUnlocked, getAchievement } from './achievements'
import type { Achievement } from './achievements'

const KEY = 'arcade.save.v1'

export interface RecordResult {
  isBest: boolean
  best: number
  unlocked: Achievement[]
}

/**
 * Almacén local de perfil y progresión, persistido en localStorage. Es síncrono a
 * propósito (lee de una copia en memoria) para un consumo cómodo desde React. La Fase 3
 * añadirá un cliente de leaderboard aparte; este puerto se mantiene como fuente local.
 */
class LocalStore {
  private data: Persisted

  constructor() {
    this.data = load()
  }

  getProfile(): Profile {
    return { ...this.data.profile }
  }

  updateProfile(patch: Partial<Profile>) {
    this.data.profile = { ...this.data.profile, ...patch }
    this.save()
  }

  getStats(gameId: string): GameStats {
    return this.data.stats[gameId] ?? emptyStats()
  }

  getBest(gameId: string): number {
    return this.data.stats[gameId]?.best ?? 0
  }

  getUnlocked(): string[] {
    return this.data.achievements
  }

  getDeviceId(): string {
    if (!this.data.deviceId) {
      this.data.deviceId = crypto.randomUUID()
      this.save()
    }
    return this.data.deviceId
  }

  recordScore(gameId: string, score: number): RecordResult {
    const prev = this.data.stats[gameId] ?? emptyStats()
    const isBest = score > prev.best
    const next: GameStats = {
      best: Math.max(prev.best, score),
      plays: prev.plays + 1,
      totalScore: prev.totalScore + score,
      recent: [{ score, at: Date.now() }, ...prev.recent].slice(0, 8),
    }
    this.data.stats[gameId] = next

    const before = new Set(this.data.achievements)
    const all = evaluateUnlocked(this.data)
    this.data.achievements = all
    const unlocked = all
      .filter((id) => !before.has(id))
      .map((id) => getAchievement(id))
      .filter((a): a is Achievement => a !== undefined)

    this.save()
    return { isBest, best: next.best, unlocked }
  }

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data))
    } catch {
      /* almacenamiento no disponible: la sesión sigue funcionando en memoria */
    }
  }
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Persisted
      if (parsed.version === STORE_VERSION) return parsed
    }
  } catch {
    /* corrupto o no disponible: arrancamos limpio */
  }
  return defaultPersisted()
}

export const store = new LocalStore()
