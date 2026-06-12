import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'

const N = 5
const CELL = 62
const GAP = 8
const PAD = 14
const HUD_TOP = 50
const START_TIME = 25
const SOLVE_BONUS = 8

export class LightsOut extends Game {
  readonly width = PAD * 2 + N * CELL + (N - 1) * GAP
  readonly height = HUD_TOP + PAD + N * CELL + (N - 1) * GAP

  private grid: boolean[] = []
  private timeLeft = START_TIME
  private level = 1
  private score = 0
  private alive = true
  private started = false

  private readonly particles = new Particles()

  constructor(emit: Emit, _size: BoardSize) {
    super(emit)
    void _size
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

    for (let i = 0; i < N * N; i++) {
      const x = PAD + (i % N) * (CELL + GAP)
      const y = HUD_TOP + Math.floor(i / N) * (CELL + GAP)
      ctx.fillStyle = this.grid[i] ? PALETTE.warning : '#23232f'
      ctx.beginPath()
      ctx.roundRect(x, y, CELL, CELL, 12)
      ctx.fill()
      if (this.grid[i]) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.beginPath()
        ctx.arc(x + CELL / 2, y + CELL / 2, CELL * 0.18, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    this.particles.render(ctx)
  }

  // --- mecánica ---

  private handleTap(nx: number, ny: number) {
    const px = nx * this.width
    const py = ny * this.height
    const col = Math.floor((px - PAD) / (CELL + GAP))
    const row = Math.floor((py - HUD_TOP) / (CELL + GAP))
    if (col < 0 || col >= N || row < 0 || row >= N || py < HUD_TOP) return
    this.toggle(row * N + col)
    audio.play('move')
    if (this.grid.every((v) => !v)) this.solved()
  }

  private toggle(i: number) {
    const r = Math.floor(i / N)
    const c = i % N
    const flip = (rr: number, cc: number) => {
      if (rr >= 0 && rr < N && cc >= 0 && cc < N) this.grid[rr * N + cc] = !this.grid[rr * N + cc]
    }
    flip(r, c)
    flip(r - 1, c)
    flip(r + 1, c)
    flip(r, c - 1)
    flip(r, c + 1)
  }

  private scramble() {
    this.grid = Array(N * N).fill(false)
    const moves = 3 + this.level
    for (let k = 0; k < moves; k++) this.toggle(Math.floor(Math.random() * N * N))
    if (this.grid.every((v) => !v)) this.toggle(Math.floor(Math.random() * N * N))
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
