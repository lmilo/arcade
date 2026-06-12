import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const W = 460
const H = 460
const BASE_Y = H - 28
const MAX_R = 46

interface Missile {
  x: number
  y: number
  vx: number
  vy: number
  sx: number
  sy: number
}

interface Boom {
  x: number
  y: number
  t: number
}

export class Defense extends Game {
  readonly width = W
  readonly height = H

  private missiles: Missile[] = []
  private booms: Boom[] = []
  private spawnTimer = 0
  private elapsed = 0
  private lives = 3
  private score = 0
  private alive = true
  private started = false

  private readonly particles = new Particles()
  private readonly shake = new Shake(12)

  constructor(emit: Emit, _size: BoardSize) {
    super(emit)
    void _size
    this.reset()
  }

  reset() {
    this.missiles = []
    this.booms = []
    this.spawnTimer = 1
    this.elapsed = 0
    this.lives = 3
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

    this.elapsed += dt
    const tap = input.consumeTap()
    if (tap) {
      this.booms.push({ x: tap.x * W, y: tap.y * H, t: 0 })
      audio.play('launch')
    }

    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawn()
      this.spawnTimer = Math.max(0.45, 1.3 - this.elapsed * 0.02)
    }

    for (const b of this.booms) b.t += dt
    this.booms = this.booms.filter((b) => b.t < 0.7)

    const survivors: Missile[] = []
    for (const m of this.missiles) {
      m.x += m.vx * dt
      m.y += m.vy * dt
      const boom = this.booms.find((b) => Math.hypot(b.x - m.x, b.y - m.y) < boomRadius(b))
      if (boom) {
        this.score += 10
        this.particles.burst(m.x, m.y, { count: 10, color: ['#fbbf24', '#fff'], speed: 130, life: 0.4 })
        audio.play('brick')
        this.emit({ type: 'score', value: this.score })
        continue
      }
      if (m.y >= BASE_Y) {
        this.hit(m.x)
        continue
      }
      survivors.push(m)
    }
    this.missiles = survivors
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, W, H)

    this.shake.begin(ctx)

    // Estelas + cabezas de misil.
    ctx.lineWidth = 2
    for (const m of this.missiles) {
      ctx.strokeStyle = 'rgba(239,68,68,0.4)'
      ctx.beginPath()
      ctx.moveTo(m.sx, m.sy)
      ctx.lineTo(m.x, m.y)
      ctx.stroke()
      ctx.fillStyle = PALETTE.danger
      ctx.beginPath()
      ctx.arc(m.x, m.y, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const b of this.booms) {
      const r = boomRadius(b)
      ctx.fillStyle = `rgba(34,211,238,${0.35 * (1 - b.t / 0.7)})`
      ctx.beginPath()
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // Base.
    ctx.fillStyle = this.alive ? PALETTE.accent : PALETTE.danger
    ctx.fillRect(0, BASE_Y, W, H - BASE_Y)

    for (let i = 0; i < this.lives; i++) {
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(14 + i * 16, 16, 5, 0, Math.PI * 2)
      ctx.fill()
    }

    this.particles.render(ctx)
    this.shake.end(ctx)
  }

  // --- mecánica ---

  private spawn() {
    const sx = Math.random() * W
    const tx = Math.random() * W
    const speed = 50 + this.elapsed * 2.5 + Math.random() * 30
    const dx = tx - sx
    const dy = BASE_Y
    const len = Math.hypot(dx, dy)
    this.missiles.push({ x: sx, y: 0, sx, sy: 0, vx: (dx / len) * speed, vy: (dy / len) * speed })
  }

  private hit(x: number) {
    this.lives -= 1
    this.shake.add(0.7)
    this.particles.burst(x, BASE_Y, { count: 20, color: [PALETTE.danger, '#fb923c', '#fff'], speed: 190, life: 0.6 })
    audio.play('die')
    if (this.lives <= 0) {
      this.alive = false
      this.emit({ type: 'gameover', score: this.score })
      this.emit({ type: 'state', state: 'over' })
    }
  }
}

function boomRadius(b: Boom): number {
  return b.t < 0.3 ? MAX_R * (b.t / 0.3) : MAX_R * (1 - (b.t - 0.3) / 0.4)
}
