import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GAMES } from '../../games/registry'
import { store } from '../../data/store'
import { ACHIEVEMENTS } from '../../data/achievements'
import { isOnline } from '../../data/supabase'
import { signIn, signUp, signOut } from '../../data/auth'
import { fetchMyProfile, upsertMyProfile } from '../../data/leaderboard'
import { useSession } from '../useSession'

export function Profile() {
  const { session } = useSession()
  const initial = store.getProfile()
  const [name, setName] = useState(initial.name)
  const [avatar, setAvatar] = useState(initial.avatar)
  const unlocked = new Set(store.getUnlocked())

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMsg, setAuthMsg] = useState<string | null>(null)
  const [msgType, setMsgType] = useState<'error' | 'info'>('error')
  const [busy, setBusy] = useState(false)

  // Al iniciar sesión: si ya hay perfil en la nube, se refleja localmente; si no, se sube el local.
  useEffect(() => {
    if (!session) return
    fetchMyProfile().then((cloud) => {
      if (cloud) {
        setName(cloud.name)
        setAvatar(cloud.avatar)
        store.updateProfile({ name: cloud.name, avatar: cloud.avatar })
      } else {
        upsertMyProfile({ name: store.getProfile().name, avatar: store.getProfile().avatar })
      }
    })
  }, [session])

  const fail = (m: string) => {
    setMsgType('error')
    setAuthMsg(m)
  }

  const doAuth = async (mode: 'in' | 'up') => {
    const mail = email.trim()
    if (!mail || !password) return fail('Escribe tu correo y tu contraseña.')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return fail('El correo no parece válido.')
    if (mode === 'up' && password.length < 6) return fail('La contraseña debe tener al menos 6 caracteres.')

    setBusy(true)
    setAuthMsg(null)
    const res = mode === 'in' ? await signIn(mail, password) : await signUp(mail, password)
    setBusy(false)
    if (!res.ok) {
      fail(res.error ?? 'No se pudo completar.')
    } else if (mode === 'up') {
      setMsgType('info')
      setAuthMsg('¡Cuenta creada! Si se pide verificación, revisa tu correo.')
    }
  }

  return (
    <div className="profile">
      <nav className="play-nav">
        <Link to="/" className="back">
          ← Arcade
        </Link>
        <span className="play-title">Perfil</span>
      </nav>

      <div className="profile-body">
        {isOnline() && (
          <section className="account">
            {session ? (
              <div className="account-in">
                <span>
                  Conectado como <strong>{session.user.email}</strong>
                </span>
                <button className="seg-btn active" onClick={() => void signOut()}>
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <div className="account-form">
                <h3 className="section-title">Cuenta — compite en el ranking</h3>
                <input
                  className="name-input"
                  type="email"
                  placeholder="correo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  className="name-input"
                  type="password"
                  placeholder="contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="account-actions">
                  <button className="btn-primary" disabled={busy} onClick={() => void doAuth('in')}>
                    Entrar
                  </button>
                  <button className="seg-btn" disabled={busy} onClick={() => void doAuth('up')}>
                    Crear cuenta
                  </button>
                </div>
                {authMsg && <p className={msgType === 'error' ? 'account-msg error' : 'account-msg info'}>{authMsg}</p>}
              </div>
            )}
          </section>
        )}

        {session && (
          <section className="profile-card">
            <div className="profile-avatar">{avatar}</div>
            <span className="profile-name-readonly">{name}</span>
          </section>
        )}

        <section>
          <h3 className="section-title">Tus marcas</h3>
          <div className="stats-grid">
            {GAMES.map(({ meta }) => {
              const s = store.getStats(meta.id)
              return (
                <div key={meta.id} className="stat-row">
                  <span className="stat-emoji">{meta.emoji}</span>
                  <span className="stat-name">{meta.name}</span>
                  <span className="stat-best">{s.best}</span>
                  <span className="stat-plays">{s.plays} partidas</span>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h3 className="section-title">
            Logros · {unlocked.size}/{ACHIEVEMENTS.length}
          </h3>
          <div className="ach-grid">
            {ACHIEVEMENTS.map((a) => {
              const got = unlocked.has(a.id)
              return (
                <div key={a.id} className={got ? 'ach got' : 'ach'}>
                  <span className="ach-icon">{got ? a.icon : '🔒'}</span>
                  <span className="ach-name">{a.name}</span>
                  <span className="ach-desc">{a.desc}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
