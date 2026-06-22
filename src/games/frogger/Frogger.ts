import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize, Dir } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const COLS = 11
const CELL = 38
const VISIBLE_ROWS = 11
const W = COLS * CELL
const H = VISIBLE_ROWS * CELL
const MAX_LANES = 60
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
  private frogRow = 0
  private goalRow = 6
  private lanes: Lane[] = []
  private respawnTimer = 0
  private lives = 3
  private level = 1
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
    this.level = 1
    this.score = 0
    this.alive = true
    this.started = false
    this.respawnTimer = 0
    this.particles.clear()
    this.buildLevel()
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

    if (!this.alive) return
    if (!this.started) {
      if (input.consumeAction()) this.start()
      return
    }

    // Los autos siempre avanzan.
    for (const lane of this.lanes) {
      for (let i = 0; i < lane.cars.length; i++) {
        lane.cars[i] += lane.speed * dt
        if (lane.speed > 0 && lane.cars[i] > W) lane.cars[i] -= W + lane.carW
        else if (lane.speed < 0 && lane.cars[i] < -lane.carW) lane.cars[i] += W + lane.carW
      }
    }

    // Pausa tras morir para que el avance "spameado" no arrastre.
    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt
      while (input.nextDir() !== null) {
        /* descarta */
      }
      return
    }

    let d: Dir | null
    while ((d = input.nextDir()) !== null) {
      if (d === 'up') this.frogRow = Math.min(this.goalRow, this.frogRow + 1)
      else if (d === 'down') this.frogRow = Math.max(0, this.frogRow - 1)
      else if (d === 'left') this.col = Math.max(0, this.col - 1)
      else if (d === 'right') this.col = Math.min(COLS - 1, this.col + 1)
      audio.play('move')
      if (this.frogRow >= this.goalRow) {
        this.crossed()
        return
      }
    }

    const lane = this.lanes.find((l) => l.row === this.frogRow)
    if (lane) {
      const fcx = this.col * CELL + CELL / 2
      const fhw = CELL * 0.3
      const inset = 5
      for (const cx of lane.cars) {
        if (fcx + fhw > cx + inset && fcx - fhw < cx + lane.carW - inset) {
          this.hit()
          return
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, W, H)

    this.shake.begin(ctx)

    const cb = this.camBottom()
    for (let i = 0; i <= VISIBLE_ROWS; i++) {
      const r = cb + i
      const sy = this.screenY(r)
      let color: string
      if (r === 0) color = '#1e293b'
      else if (r === this.goalRow) color = '#14532d'
      else if (r > this.goalRow) color = PALETTE.bg
      else color = r % 2 ? '#15151f' : '#181826'
      ctx.fillStyle = color
      ctx.fillRect(0, sy, W, CELL)
    }

    for (const lane of this.lanes) {
      if (lane.row < cb - 1 || lane.row > cb + VISIBLE_ROWS) continue
      const sy = this.screenY(lane.row)
      ctx.fillStyle = lane.color
      for (const cx of lane.cars) {
        ctx.beginPath()
        ctx.roundRect(cx, sy + 5, lane.carW, CELL - 10, 6)
        ctx.fill()
      }
    }

    const fx = this.col * CELL + CELL / 2
    const fy = this.screenY(this.frogRow) + CELL / 2
    const blink = this.respawnTimer > 0 && Math.floor(this.respawnTimer * 10) % 2 === 0
    ctx.globalAlpha = blink ? 0.35 : 1
    ctx.fillStyle = PALETTE.success
    ctx.beginPath()
    ctx.arc(fx, fy, CELL * 0.34, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(fx - 5, fy - 4, 2.5, 0, Math.PI * 2)
    ctx.arc(fx + 5, fy - 4, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // Barra de progreso del cruce (derecha).
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillRect(W - 6, 0, 6, H)
    ctx.fillStyle = PALETTE.success
    const prog = this.frogRow / this.goalRow
    ctx.fillRect(W - 6, H * (1 - prog), 6, H * prog)

    // HUD: vidas + nivel.
    for (let i = 0; i < this.lives; i++) {
      ctx.fillStyle = PALETTE.success
      ctx.beginPath()
      ctx.arc(12 + i * 16, 12, 5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = PALETTE.muted
    ctx.font = '700 13px system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillText(`NIVEL ${this.level}`, W - 14, 8)

    this.shake.end(ctx)
  }

  // --- mecánica ---

  private camBottom(): number {
    const maxBottom = Math.max(0, this.goalRow - VISIBLE_ROWS + 1)
    return Math.max(0, Math.min(maxBottom, this.frogRow - 2))
  }

  private screenY(row: number): number {
    return H - (row - this.camBottom() + 1) * CELL
  }

  private buildLevel() {
    const laneCount = Math.min(MAX_LANES, 5 + (this.level - 1) * 2)
    this.goalRow = laneCount + 1
    const lanes: Lane[] = []
    for (let row = 1; row <= laneCount; row++) {
      const dir = row % 2 === 0 ? 1 : -1
      // Velocidad constante por nivel: la dificultad la da la longitud, no la rapidez.
      const speed = (45 + Math.random() * 30) * dir
      const carW = CELL * (1.2 + Math.random() * 0.8)
      const cars = [Math.random() * 30, W / 2 + Math.random() * 30]
      lanes.push({ row, speed, carW, color: CAR_COLORS[row % CAR_COLORS.length], cars })
    }
    this.lanes = lanes
  }

  private resetFrog() {
    this.col = Math.floor(COLS / 2)
    this.frogRow = 0
  }

  private crossed() {
    this.score += 1
    this.level += 1
    audio.play('win')
    this.particles.burst(this.col * CELL + CELL / 2, this.screenY(this.goalRow) + CELL / 2, {
      count: 16,
      color: [PALETTE.success, '#fff'],
      speed: 150,
      life: 0.5,
    })
    this.emit({ type: 'score', value: this.score })
    this.buildLevel()
    this.resetFrog()
  }

  private hit() {
    this.lives -= 1
    this.shake.add(0.6)
    this.particles.burst(this.col * CELL + CELL / 2, this.screenY(this.frogRow) + CELL / 2, {
      count: 16,
      color: [PALETTE.success, PALETTE.danger, '#fff'],
      speed: 170,
      life: 0.6,
    })
    audio.play('die')
    if (this.lives <= 0) {
      this.alive = false
      this.emit({ type: 'gameover', score: this.score })
      this.emit({ type: 'state', state: 'over' })
      return
    }
    this.resetFrog()
    this.respawnTimer = 0.8
  }
}
