import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize, Dir } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const CELL = 38
const COLS = 11
const ROWS = 11
const W = COLS * CELL
const H = ROWS * CELL
const CAR_COLORS = ['#ef4444', '#fb923c', '#22d3ee', '#a855f7', '#22c55e']

interface Lane {
  row: number
  speed: number
  carW: number
  color: string
  cars: number[]
}

export class Frogger extends Game {
  readonly width = W
  readonly height = H

  private col = 5
  private row = ROWS - 1
  private lanes: Lane[] = []
  private lives = 3
  private score = 0
  private alive = true
  private started = false

  private readonly particles = new Particles()
  private readonly shake = new Shake(10)

  constructor(emit: Emit, _size: BoardSize) {
    super(emit)
    void _size
    this.reset()
  }

  reset() {
    this.lives = 3
    this.score = 0
    this.alive = true
    this.started = false
    this.particles.clear()
    this.buildLanes()
    this.resetFrog()
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
      return
    }
    if (!this.started) {
      if (input.consumeAction()) this.start()
      return
    }

    let d: Dir | null
    while ((d = input.nextDir()) !== null) {
      if (d === 'up') this.row = Math.max(0, this.row - 1)
      else if (d === 'down') this.row = Math.min(ROWS - 1, this.row + 1)
      else if (d === 'left') this.col = Math.max(0, this.col - 1)
      else if (d === 'right') this.col = Math.min(COLS - 1, this.col + 1)
      audio.play('move')
      if (this.row === 0) {
        this.crossed()
        return
      }
    }

    const span = W
    for (const lane of this.lanes) {
      for (let i = 0; i < lane.cars.length; i++) {
        lane.cars[i] += lane.speed * dt
        if (lane.speed > 0 && lane.cars[i] > span) lane.cars[i] -= span + lane.carW
        else if (lane.speed < 0 && lane.cars[i] < -lane.carW) lane.cars[i] += span + lane.carW
      }
    }

    const lane = this.lanes.find((l) => l.row === this.row)
    if (lane) {
      const fx = this.col * CELL
      for (const cx of lane.cars) {
        if (fx + CELL > cx && fx < cx + lane.carW) {
          this.hit()
          return
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (let r = 0; r < ROWS; r++) {
      ctx.fillStyle = r === 0 ? '#14532d' : r === ROWS - 1 ? '#1e293b' : r % 2 ? '#15151f' : '#181826'
      ctx.fillRect(0, r * CELL, W, CELL)
    }

    this.shake.begin(ctx)

    for (const lane of this.lanes) {
      ctx.fillStyle = lane.color
      for (const cx of lane.cars) {
        ctx.beginPath()
        ctx.roundRect(cx, lane.row * CELL + 5, lane.carW, CELL - 10, 6)
        ctx.fill()
      }
    }

    const fx = this.col * CELL + CELL / 2
    const fy = this.row * CELL + CELL / 2
    ctx.fillStyle = PALETTE.success
    ctx.beginPath()
    ctx.arc(fx, fy, CELL * 0.34, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(fx - 5, fy - 4, 2.5, 0, Math.PI * 2)
    ctx.arc(fx + 5, fy - 4, 2.5, 0, Math.PI * 2)
    ctx.fill()

    for (let i = 0; i < this.lives; i++) {
      ctx.fillStyle = PALETTE.success
      ctx.beginPath()
      ctx.arc(12 + i * 16, 12, 5, 0, Math.PI * 2)
      ctx.fill()
    }

    this.particles.render(ctx)
    this.shake.end(ctx)
  }

  // --- mecánica ---

  private buildLanes() {
    this.lanes = []
    for (let row = 1; row <= ROWS - 2; row++) {
      const dir = row % 2 === 0 ? 1 : -1
      const speed = (55 + Math.random() * 45 + this.score * 6) * dir
      const carW = CELL * (1.3 + Math.random() * 1.1)
      const count = 2 + (row % 2)
      const cars: number[] = []
      for (let i = 0; i < count; i++) cars.push((W / count) * i + Math.random() * 40)
      this.lanes.push({ row, speed, carW, color: CAR_COLORS[row % CAR_COLORS.length], cars })
    }
  }

  private resetFrog() {
    this.col = Math.floor(COLS / 2)
    this.row = ROWS - 1
  }

  private crossed() {
    this.score += 1
    audio.play('win')
    this.particles.burst(this.col * CELL + CELL / 2, CELL / 2, { count: 14, color: [PALETTE.success, '#fff'], speed: 150, life: 0.5 })
    this.emit({ type: 'score', value: this.score })
    this.buildLanes()
    this.resetFrog()
  }

  private hit() {
    this.lives -= 1
    this.shake.add(0.6)
    this.particles.burst(this.col * CELL + CELL / 2, this.row * CELL + CELL / 2, { count: 16, color: [PALETTE.success, PALETTE.danger, '#fff'], speed: 170, life: 0.6 })
    audio.play('die')
    if (this.lives <= 0) {
      this.alive = false
      this.emit({ type: 'gameover', score: this.score })
      this.emit({ type: 'state', state: 'over' })
      return
    }
    this.resetFrog()
  }
}
