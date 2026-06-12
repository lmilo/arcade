import { Link, useParams } from 'react-router-dom'
import { getGame } from '../../games/registry'
import { GameHost } from '../components/GameHost'

export function Play() {
  const { id } = useParams()
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
      <GameHost key={entry.meta.id} entry={entry} />
    </div>
  )
}
