import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const GRID = 3
const PAD = 16
const HUD_TOP = 50
const CELL = 108
const W = PAD * 2 + GRID * CELL
const H = HUD_TOP + PAD + GRID * CELL
const GAME_TIME = 30

interface Hole {
  up: boolean
  t: number
  life: number
}

export class WhackAMole extends Game {
  readonly width = W
  readonly height = H

  private holes: Hole[] = []
  private spawnTimer = 0
  private timeLeft = GAME_TIME
  private score = 0
  private alive = true
  private started = false

  private readonly particles = new Particles()
  private readonly shake = new Shake(8)

  constructor(emit: Emit, _size: BoardSize) {
    super(emit)
    void _size
    this.reset()
  }

  reset() {
    this.holes = Array.from({ length: GRID * GRID }, () => ({ up: false, t: 0, life: 1 }))
    this.spawnTimer = 0.6
    this.timeLeft = GAME_TIME
    this.score = 0
    this.alive = true
    this.started = false
    this.particles.clear()
    this.emit({ type: 'score', value: 0 })
    this.emit({ type: 'state', state: 'ready' })
  }

  start() {
    if (this.started || !this.alive) return
    this.started = true
    audio.play('start')
    this.emit({ type: 'state', state: 'playing' })
  }

  update(dt: number, input: Input) {
    this.shake.update(dt)
    this.particles.update(dt)

    if (!this.alive) {
      if (input.consumeAction()) {
        this.reset()
        this.start()
      }
      input.consumeTap()
      return
    }
    if (!this.started) {
      if (input.consumeAction()) this.start()
      input.consumeTap()
      return
    }

    this.timeLeft -= dt
    if (this.timeLeft <= 0) {
      this.timeLeft = 0
      this.gameOver()
      return
    }

    const elapsed = GAME_TIME - this.timeLeft
    for (const h of this.holes) {
      if (!h.up) continue
      h.t += dt
      if (h.t >= h.life) h.up = false
    }

    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      const free = this.holes.map((h, i) => (h.up ? -1 : i)).filter((i) => i >= 0)
      if (free.length) {
        const h = this.holes[free[Math.floor(Math.random() * free.length)]]
        h.up = true
        h.t = 0
        h.life = Math.max(0.6, 1.3 - elapsed * 0.025)
      }
      this.spawnTimer = Math.max(0.35, 0.9 - elapsed * 0.018)
    }

    const tap = input.consumeTap()
    if (tap) this.whack(tap.x, tap.y)
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, W, H)

    // Barra de tiempo.
    ctx.fillStyle = PALETTE.card
    ctx.beginPath()
    ctx.roundRect(PAD, 16, W - PAD * 2, 14, 7)
    ctx.fill()
    ctx.fillStyle = this.timeLeft < 6 ? PALETTE.danger : PALETTE.accent2
    ctx.beginPath()
    ctx.roundRect(PAD, 16, (W - PAD * 2) * (this.timeLeft / GAME_TIME), 14, 7)
    ctx.fill()

    this.shake.begin(ctx)
    this.holes.forEach((h, i) => {
      const cx = PAD + (i % GRID) * CELL + CELL / 2
      const cy = HUD_TOP + Math.floor(i / GRID) * CELL + CELL / 2
      ctx.fillStyle = '#15151f'
      ctx.beginPath()
      ctx.ellipse(cx, cy + 18, CELL * 0.38, CELL * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()

      if (h.up) {
        const pop = Math.min(1, h.t * 9)
        const r = CELL * 0.32 * pop
        ctx.fillStyle = '#a16207'
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fde68a'
        ctx.beginPath()
        ctx.arc(cx, cy + r * 0.3, r * 0.6, 0, Math.PI, true)
        ctx.fill()
        if (pop > 0.6) {
          ctx.fillStyle = '#0f0f1a'
          ctx.beginPath()
          ctx.arc(cx - r * 0.35, cy - r * 0.2, r * 0.12, 0, Math.PI * 2)
          ctx.arc(cx + r * 0.35, cy - r * 0.2, r * 0.12, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    })
    this.particles.render(ctx)
    this.shake.end(ctx)
  }

  // --- mecánica ---

  private whack(nx: number, ny: number) {
    const col = Math.floor((nx * W - PAD) / CELL)
    const row = Math.floor((ny * H - HUD_TOP) / CELL)
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return
    const h = this.holes[row * GRID + col]
    if (!h.up) return
    h.up = false
    this.score += 1
    this.shake.add(0.18)
    const cx = PAD + col * CELL + CELL / 2
    const cy = HUD_TOP + row * CELL + CELL / 2
    this.particles.burst(cx, cy, { count: 12, color: ['#fde68a', '#a16207', '#ffffff'], speed: 150, life: 0.4 })
    audio.play('brick')
    this.emit({ type: 'score', value: this.score })
  }

  private gameOver() {
    this.alive = false
    audio.play('die')
    this.emit({ type: 'gameover', score: this.score })
    this.emit({ type: 'state', state: 'over' })
  }
}
