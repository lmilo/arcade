import { useEffect, useRef, useState } from 'react'
import { GameLoop } from '../../engine/GameLoop'
import { Input } from '../../engine/Input'
import { Renderer } from '../../engine/Renderer'
import type { Game, GameEvent } from '../../engine/Game'
import type { BoardSize } from '../../engine/types'
import type { GameEntry } from '../../games/registry'
import { audio } from '../../engine/Audio'
import { store } from '../../data/store'
import type { Achievement } from '../../data/achievements'
import { HelpModal } from './HelpModal'

type Phase = 'ready' | 'playing' | 'over'

const SIZE_LABELS: Record<BoardSize, string> = {
  small: 'Pequeño',
  normal: 'Normal',
  large: 'Grande',
}

/**
 * Puente React <-> motor: monta el canvas, instancia el juego con el tamaño elegido,
 * arranca el loop e input, y traduce los eventos del juego a estado de UI (fase, score).
 * El loop se congela mientras el modal de ayuda está abierto.
 */
export function GameHost({ entry }: { entry: GameEntry }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Game | null>(null)
  const pausedRef = useRef(false)

  const [size, setSize] = useState<BoardSize>(entry.defaultSize ?? 'normal')
  const [phase, setPhase] = useState<Phase>('ready')
  const [score, setScore] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const [muted, setMuted] = useState(audio.muted)
  const [best, setBest] = useState(() => store.getBest(entry.meta.id))
  const [newBest, setNewBest] = useState(false)
  const [toasts, setToasts] = useState<Achievement[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const emit = (e: GameEvent) => {
      if (e.type === 'score') {
        setScore(e.value)
      } else if (e.type === 'gameover') {
        setFinalScore(e.score)
        const res = store.recordScore(entry.meta.id, e.score)
        setBest(res.best)
        setNewBest(res.isBest)
        if (res.unlocked.length > 0) setToasts((t) => [...t, ...res.unlocked])
      } else if (e.type === 'state') {
        if (e.state === 'playing') {
          setPhase('playing')
          setNewBest(false)
        } else {
          setPhase(e.state === 'over' ? 'over' : 'ready')
        }
      }
    }

    const game = entry.create(emit, size)
    gameRef.current = game
    const renderer = new Renderer(canvas, game.width, game.height)
    const input = new Input()
    input.attach(wrap, canvas)
    game.init()

    const fit = () => {
      const rect = wrap.getBoundingClientRect()
      renderer.fit(rect.width, rect.height)
    }
    fit()
    window.addEventListener('resize', fit)

    const loop = new GameLoop(
      (dt) => {
        if (!pausedRef.current) game.update(dt, input)
      },
      () => game.render(renderer.ctx),
    )
    loop.start()

    return () => {
      loop.stop()
      input.detach()
      game.destroy()
      gameRef.current = null
      window.removeEventListener('resize', fit)
    }
  }, [entry, size])

  useEffect(() => {
    pausedRef.current = showHelp
  }, [showHelp])

  useEffect(() => {
    if (toasts.length === 0) return
    const t = setTimeout(() => setToasts([]), 3500)
    return () => clearTimeout(t)
  }, [toasts])

  const start = () => {
    audio.unlock()
    gameRef.current?.start()
  }
  const restart = () => {
    const game = gameRef.current
    if (!game) return
    game.reset()
    game.start()
  }
  const toggleMute = () => {
    const next = !muted
    audio.setMuted(next)
    setMuted(next)
  }

  const sizes = entry.sizes
  const labels = entry.sizeLabels ?? SIZE_LABELS
  const sizePicker = sizes && (
    <div className="size-picker">
      <span className="size-label">Tablero</span>
      <div className="seg">
        {sizes.map((s) => (
          <button
            key={s}
            className={s === size ? 'seg-btn active' : 'seg-btn'}
            onClick={() => setSize(s)}
          >
            {labels[s]}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="game-host">
      {toasts.length > 0 && (
        <div className="toasts">
          {toasts.map((a) => (
            <div key={a.id} className="toast">
              <span className="toast-icon">{a.icon}</span>
              <span className="toast-body">
                <span className="toast-title">¡Logro! {a.name}</span>
                <span className="toast-desc">{a.desc}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="stage">
        <div className="board">
          <div className="canvas-wrap" ref={wrapRef}>
            <canvas ref={canvasRef} />
          </div>

          {phase === 'ready' && (
            <div className="overlay">
              <h2 className="overlay-title">{entry.meta.name}</h2>
              {sizePicker}
              <button className="btn-primary" onClick={start}>
                ▶ Iniciar
              </button>
              <p className="overlay-hint">{entry.meta.controls}</p>
            </div>
          )}

          {phase === 'over' && (
            <div className="overlay">
              <h2 className="overlay-title">Game Over</h2>
              {newBest && <p className="new-best">🎉 ¡Nuevo récord!</p>}
              <p className="final-score">
                Puntuación: <strong>{finalScore}</strong>
              </p>
              <button className="btn-primary" onClick={restart}>
                ↻ Jugar de nuevo
              </button>
              {sizePicker}
            </div>
          )}
        </div>

        <aside className="side">
          <div className="hud">
            <span className="hud-label">Score</span>
            <span className="hud-score">{score}</span>
          </div>
          <div className="hud">
            <span className="hud-label">Récord</span>
            <span className="hud-record">{best}</span>
          </div>
          <button className="side-help" onClick={() => setShowHelp(true)}>
            <span className="side-help-icon">ℹ️</span>
            <span>Cómo jugar</span>
          </button>
          <button className="side-help" onClick={toggleMute}>
            <span className="side-help-icon">{muted ? '🔇' : '🔊'}</span>
            <span>{muted ? 'Sonido off' : 'Sonido on'}</span>
          </button>
        </aside>
      </div>

      {showHelp && <HelpModal meta={entry.meta} onClose={() => setShowHelp(false)} />}
    </div>
  )
}
