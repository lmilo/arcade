import { useEffect } from 'react'
import type { GameMeta } from '../../engine/types'

const SECTIONS: { icon: string; title: string; key: keyof GameMeta['help'] }[] = [
  { icon: '📜', title: 'Reglas', key: 'rules' },
  { icon: '🎮', title: 'Cómo jugar', key: 'howTo' },
  { icon: '🏆', title: 'Cómo se gana', key: 'win' },
  { icon: '💀', title: 'Cómo se pierde', key: 'lose' },
]

export function HelpModal({ meta, onClose }: { meta: GameMeta; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal-head">
          <h3>
            {meta.emoji} {meta.name}
          </h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        {SECTIONS.map((s) => (
          <section key={s.key} className="modal-section">
            <h4>
              {s.icon} {s.title}
            </h4>
            <p>{meta.help[s.key]}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
