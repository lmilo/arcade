import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getGame } from '../../games/registry'
import { GameHost } from '../components/GameHost'
import type { Challenge } from '../components/GameHost'

export function Play() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const entry = id ? getGame(id) : undefined

  if (!entry) {
    return (
      <div className="play">
        <nav className="play-nav">
          <Link to="/" className="back">
            ← Arcade
          </Link>
        </nav>
        <p className="not-found">Ese juego no existe (todavía).</p>
      </div>
    )
  }

  const reto = Number(params.get('reto'))
  const challenge: Challenge | undefined =
    params.get('reto') && Number.isFinite(reto) ? { score: reto, by: params.get('por') } : undefined

  return (
    <div className="play">
      <nav className="play-nav">
        <Link to="/" className="back">
          ← Arcade
        </Link>
        <span className="play-title">
          {entry.meta.emoji} {entry.meta.name}
        </span>
        <span className="play-controls">{entry.meta.controls}</span>
      </nav>
      <GameHost key={entry.meta.id} entry={entry} challenge={challenge} />
    </div>
  )
}
