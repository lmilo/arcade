import { Link } from 'react-router-dom'
import { GAMES } from '../../games/registry'
import { store } from '../../data/store'

export function Home() {
  const profile = store.getProfile()

  return (
    <div className="home">
      <header className="home-header">
        <Link to="/profile" className="profile-chip">
          <span className="profile-chip-avatar">{profile.avatar}</span>
          <span className="profile-chip-name">{profile.name}</span>
        </Link>
        <h1 className="logo">🕹️ ARCADE</h1>
        <p className="tagline">Clásicos que se sienten vivos</p>
      </header>

      <div className="grid">
        {GAMES.map(({ meta }) => {
          const best = store.getBest(meta.id)
          return (
            <Link key={meta.id} to={`/play/${meta.id}`} className="card">
              <span className="card-emoji">{meta.emoji}</span>
              <span className="card-name">{meta.name}</span>
              <span className="card-tagline">{meta.tagline}</span>
              {best > 0 && <span className="card-best">Récord {best}</span>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
