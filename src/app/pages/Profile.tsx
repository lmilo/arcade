import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GAMES } from '../../games/registry'
import { store } from '../../data/store'
import { AVATARS } from '../../data/model'
import { ACHIEVEMENTS } from '../../data/achievements'

export function Profile() {
  const initial = store.getProfile()
  const [name, setName] = useState(initial.name)
  const [avatar, setAvatar] = useState(initial.avatar)
  const unlocked = new Set(store.getUnlocked())

  const onName = (value: string) => {
    setName(value)
    store.updateProfile({ name: value })
  }
  const onAvatar = (a: string) => {
    setAvatar(a)
    store.updateProfile({ avatar: a })
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
        <section className="profile-card">
          <div className="profile-avatar">{avatar}</div>
          <input
            className="name-input"
            value={name}
            maxLength={16}
            placeholder="Tu nombre"
            onChange={(e) => onName(e.target.value)}
          />
          <div className="avatar-grid">
            {AVATARS.map((a) => (
              <button
                key={a}
                className={a === avatar ? 'avatar-opt active' : 'avatar-opt'}
                onClick={() => onAvatar(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </section>

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
