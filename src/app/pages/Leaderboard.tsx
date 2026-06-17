import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getGame } from '../../games/registry'
import { fetchLeaderboard } from '../../data/leaderboard'
import type { Leaderboard as LeaderboardData } from '../../data/leaderboard'
import { isOnline } from '../../data/supabase'
import { useSession } from '../useSession'

const MEDALS = ['🥇', '🥈', '🥉']

export function Leaderboard() {
  const { id } = useParams()
  const entry = id ? getGame(id) : undefined
  const { session } = useSession()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [data, setData] = useState<LeaderboardData | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    setStatus('loading')
    fetchLeaderboard(id).then((d) => {
      if (!alive) return
      if (d) {
        setData(d)
        setStatus('ok')
      } else {
        setStatus('error')
      }
    })
    return () => {
      alive = false
    }
  }, [id])

  const youInTop = data?.entries.some((e) => e.isYou) ?? false

  return (
    <div className="leaderboard">
      <nav className="play-nav">
        <Link to="/" className="back">
          ← Arcade
        </Link>
        <span className="play-title">
          🏆 Ranking{entry ? ` · ${entry.meta.name}` : ''}
        </span>
        {entry && (
          <Link to={`/play/${entry.meta.id}`} className="play-controls lb-play-link">
            Jugar →
          </Link>
        )}
      </nav>

      <div className="lb-body">
        {isOnline() && !session && (
          <Link to="/profile" className="lb-login">
            Inicia sesión para aparecer en el ranking →
          </Link>
        )}
        {status === 'loading' && <p className="lb-msg">Cargando ranking…</p>}
        {status === 'error' && (
          <p className="lb-msg">
            El ranking online no está disponible (sin conexión o sin configurar).
            <br />
            Tus récords locales se siguen guardando igual.
          </p>
        )}
        {status === 'ok' && data && (
          <>
            {data.entries.length === 0 && (
              <p className="lb-msg">Aún no hay marcas. ¡Sé el primero!</p>
            )}
            <ol className="lb-list">
              {data.entries.map((e, i) => (
                <li key={i} className={e.isYou ? 'lb-row you' : 'lb-row'}>
                  <span className="lb-rank">{MEDALS[i] ?? i + 1}</span>
                  <span className="lb-avatar">{e.avatar}</span>
                  <span className="lb-name">
                    {e.name}
                    {e.isYou && <span className="lb-tag">tú</span>}
                  </span>
                  <span className="lb-score">{e.score}</span>
                </li>
              ))}
            </ol>
            {!youInTop && data.you && data.yourRank && (
              <div className="lb-you-summary">
                <span className="lb-rank">{data.yourRank}</span>
                <span className="lb-avatar">{data.you.avatar}</span>
                <span className="lb-name">
                  {data.you.name}
                  <span className="lb-tag">tú</span>
                </span>
                <span className="lb-score">{data.you.score}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
