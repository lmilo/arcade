import { store } from './store'

const API = (import.meta.env.VITE_API_URL ?? '') as string

export interface LeaderEntry {
  name: string
  score: number
  isYou: boolean
}

export interface Leaderboard {
  entries: LeaderEntry[]
  you: LeaderEntry | null
  yourRank: number | null
  total: number
}

export interface SubmitResult {
  best: number
  rank: number
  total: number
}

/**
 * Cliente del leaderboard. Toda llamada degrada a `null` si el backend no responde,
 * para que el juego siga funcionando sin conexión (la progresión local es la fuente fiable).
 */
export async function submitScore(gameId: string, score: number): Promise<SubmitResult | null> {
  try {
    const res = await fetch(`${API}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        score,
        deviceId: store.getDeviceId(),
        name: store.getProfile().name,
      }),
    })
    if (!res.ok) return null
    return (await res.json()) as SubmitResult
  } catch {
    return null
  }
}

export async function fetchLeaderboard(gameId: string): Promise<Leaderboard | null> {
  try {
    const res = await fetch(`${API}/api/leaderboard/${gameId}?deviceId=${store.getDeviceId()}`)
    if (!res.ok) return null
    return (await res.json()) as Leaderboard
  } catch {
    return null
  }
}
