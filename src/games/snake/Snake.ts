import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize, Dir } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const SIZES: Record<BoardSize, number> = { small: 15, normal: 19, large: 25 }
const CELL = 20
const MOVE_INTERVAL = 0.12 // segundos por celda

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
const DELTA: Record<Dir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

interface Cell {
  x: number
  y: number
}

export class Snake extends Game {
  readonly width: number
  readonly height: number
  private readonly cols: number
  private readonly rows: number

  private body: Cell[] = []
  private dir: Dir = 'right'
  private pendingDir: Dir = 'right'
  private food: Cell = { x: 0, y: 0 }
  private timer = 0
  private time = 0
  private score = 0
  private alive = true
  private started = false

  private readonly particles = new Particles()
  private readonly shake = new Shake(10)

  constructor(emit: Emit, size: BoardSize) {
    super(emit)
    const n = SIZES[size]
    this.cols = n
    this.rows = n
    this.width = n * CELL
    this.height = n * CELL
    this.reset()
  }

  reset() {
    const cx = Math.floor(this.cols / 2)
    const cy = Math.floor(this.rows / 2)
    this.body = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ]
    this.dir = 'right'
    this.pendingDir = 'right'
    this.score = 0
    this.alive = true
    this.started = false
    this.timer = 0
    this.particles.clear()
    this.spawnFood()
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
    this.time += dt
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
      if (d !== OPPOSITE[this.dir] && d !== this.dir) {
        this.pendingDir = d
        break
      }
    }

    this.timer += dt
    if (this.timer < MOVE_INTERVAL) return
    this.timer -= MOVE_INTERVAL

    this.dir = this.pendingDir
    const [dx, dy] = DELTA[this.dir]
    const head = this.body[0]
    const next: Cell = { x: head.x + dx, y: head.y + dy }

    const hitsWall = next.x < 0 || next.x >= this.cols || next.y < 0 || next.y >= this.rows
    if (hitsWall || this.occupies(next)) {
      this.alive = false
      this.shake.add(0.85)
      this.particles.burst((head.x + 0.5) * CELL, (head.y + 0.5) * CELL, {
        count: 24,
        color: [PALETTE.accent, PALETTE.accent2, PALETTE.danger],
        speed: 180,
        life: 0.7,
        size: 4,
      })
      audio.play('die')
      this.emit({ type: 'gameover', score: this.score })
      this.emit({ type: 'state', state: 'over' })
      return
    }

    this.body.unshift(next)
    if (next.x === this.food.x && next.y === this.food.y) {
      this.score += 1
      this.shake.add(0.18)
      this.particles.burst((this.food.x + 0.5) * CELL, (this.food.y + 0.5) * CELL, {
        count: 14,
        color: [PALETTE.success, PALETTE.accent2, '#bbf7d0'],
        speed: 150,
        life: 0.5,
      })
      audio.play('eat')
      this.emit({ type: 'score', value: this.score })
      this.spawnFood()
    } else {
      this.body.pop()
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, this.width, this.height)

    this.shake.begin(ctx)

    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath()
      ctx.moveTo(x * CELL, 0)
      ctx.lineTo(x * CELL, this.height)
      ctx.stroke()
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * CELL)
      ctx.lineTo(this.width, y * CELL)
      ctx.stroke()
    }

    // Comida con pulso.
    const pulse = 1 + Math.sin(this.time * 6) * 0.12
    const fc = CELL * 0.5
    const fx = (this.food.x + 0.5) * CELL
    const fy = (this.food.y + 0.5) * CELL
    ctx.fillStyle = PALETTE.danger
    ctx.beginPath()
    ctx.arc(fx, fy, fc * 0.42 * pulse, 0, Math.PI * 2)
    ctx.fill()

    this.body.forEach((c, i) => {
      ctx.fillStyle = i === 0 ? PALETTE.accent2 : PALETTE.accent
      this.drawCell(ctx, c)
    })

    this.particles.render(ctx)

    this.shake.end(ctx)
  }

  private drawCell(ctx: CanvasRenderingContext2D, c: Cell) {
    const pad = 2
    const r = 4
    const x = c.x * CELL + pad
    const y = c.y * CELL + pad
    const s = CELL - pad * 2
    ctx.beginPath()
    ctx.roundRect(x, y, s, s, r)
    ctx.fill()
  }

  private occupies(c: Cell) {
    return this.body.some((s) => s.x === c.x && s.y === c.y)
  }

  private spawnFood() {
    let c: Cell
    do {
      c = { x: Math.floor(Math.random() * this.cols), y: Math.floor(Math.random() * this.rows) }
    } while (this.occupies(c))
    this.food = c
  }
}
