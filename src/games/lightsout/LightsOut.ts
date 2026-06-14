import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'

const GAP = 8
const PAD = 14
const HUD_TOP = 50
const TARGET = 330
const START_TIME = 25
const SOLVE_BONUS = 8
const N_BY_SIZE: Record<BoardSize, number> = { small: 4, normal: 5, large: 6 }

export class LightsOut extends Game {
  readonly width: number
  readonly height: number
  private readonly n: number
  private readonly cell: number

  private grid: boolean[] = []
  private timeLeft = START_TIME
  private level = 1
  private score = 0
  private alive = true
  private started = false

  private readonly particles = new Particles()

  constructor(emit: Emit, size: BoardSize) {
    super(emit)
    this.n = N_BY_SIZE[size]
    this.cell = (TARGET - (this.n - 1) * GAP) / this.n
    const span = this.n * this.cell + (this.n - 1) * GAP
    this.width = PAD * 2 + span
    this.height = HUD_TOP + PAD + span
    this.reset()
  }

  reset() {
    this.timeLeft = START_TIME
    this.level = 1
    this.score = 0
    this.alive = true
    this.started = false
    this.particles.clear()
    this.scramble()
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
    this.particles.update(dt)

    if (!this.alive) return
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

    const tap = input.consumeTap()
    if (tap) this.handleTap(tap.x, tap.y)
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.fillStyle = PALETTE.muted
    ctx.font = '700 13px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`NIVEL ${this.level}`, PAD, 18)

    ctx.fillStyle = PALETTE.card
    ctx.beginPath()
    ctx.roundRect(PAD, 30, this.width - PAD * 2, 10, 5)
    ctx.fill()
    ctx.fillStyle = this.timeLeft < 6 ? PALETTE.danger : PALETTE.accent2
    ctx.beginPath()
    ctx.roundRect(PAD, 30, (this.width - PAD * 2) * (this.timeLeft / START_TIME), 10, 5)
    ctx.fill()

    for (let i = 0; i < this.n * this.n; i++) {
      const x = PAD + (i % this.n) * (this.cell + GAP)
      const y = HUD_TOP + Math.floor(i / this.n) * (this.cell + GAP)
      ctx.fillStyle = this.grid[i] ? PALETTE.warning : '#23232f'
      ctx.beginPath()
      ctx.roundRect(x, y, this.cell, this.cell, 12)
      ctx.fill()
      if (this.grid[i]) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.beginPath()
        ctx.arc(x + this.cell / 2, y + this.cell / 2, this.cell * 0.18, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    this.particles.render(ctx)
  }

  // --- mecánica ---

  private handleTap(nx: number, ny: number) {
    const px = nx * this.width
    const py = ny * this.height
    if (py < HUD_TOP) return
    const col = Math.floor((px - PAD) / (this.cell + GAP))
    const row = Math.floor((py - HUD_TOP) / (this.cell + GAP))
    if (col < 0 || col >= this.n || row < 0 || row >= this.n) return
    this.toggle(row * this.n + col)
    audio.play('move')
    if (this.grid.every((v) => !v)) this.solved()
  }

  private toggle(i: number) {
    const r = Math.floor(i / this.n)
    const c = i % this.n
    const flip = (rr: number, cc: number) => {
      if (rr >= 0 && rr < this.n && cc >= 0 && cc < this.n) this.grid[rr * this.n + cc] = !this.grid[rr * this.n + cc]
    }
    flip(r, c)
    flip(r - 1, c)
    flip(r + 1, c)
    flip(r, c - 1)
    flip(r, c + 1)
  }

  private scramble() {
    this.grid = Array(this.n * this.n).fill(false)
    const moves = 3 + this.level
    for (let k = 0; k < moves; k++) this.toggle(Math.floor(Math.random() * this.n * this.n))
    if (this.grid.every((v) => !v)) this.toggle(Math.floor(Math.random() * this.n * this.n))
  }

  private solved() {
    this.score += 1
    this.level += 1
    this.timeLeft = Math.min(START_TIME, this.timeLeft + SOLVE_BONUS)
    audio.play('win')
    this.particles.burst(this.width / 2, this.height / 2, { count: 20, color: [PALETTE.warning, '#fff'], speed: 180, life: 0.6 })
    this.emit({ type: 'score', value: this.score })
    this.scramble()
  }

  private gameOver() {
    this.alive = false
    audio.play('die')
    this.emit({ type: 'gameover', score: this.score })
    this.emit({ type: 'state', state: 'over' })
  }
}
