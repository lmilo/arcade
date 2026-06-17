import { Link } from 'react-router-dom'
import { GAMES } from '../../games/registry'
import { store } from '../../data/store'
import { isOnline } from '../../data/supabase'
import { useSession } from '../useSession'

export function Home() {
  const profile = store.getProfile()
  const { session } = useSession()
  const guest = isOnline() && !session

  return (
    <div className="home">
      <header className="home-header">
        {guest ? (
          <Link to="/profile" className="profile-chip guest">
            <span className="profile-chip-avatar">👤</span>
            <span className="profile-chip-name">Invitado</span>
            <span className="login-cta">Iniciar sesión</span>
          </Link>
        ) : (
          <Link to="/profile" className="profile-chip">
            <span className="profile-chip-avatar">{profile.avatar}</span>
            <span className="profile-chip-name">{profile.name}</span>
            {session && <span className="online-dot" title="Conectado" />}
          </Link>
        )}
        <h1 className="logo">PIXEL PULSE</h1>
        <p className="tagline">Clásicos que se sienten vivos</p>
        {guest && <p className="guest-hint">Juegas como invitado · inicia sesión para competir en los rankings</p>}
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
