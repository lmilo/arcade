import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const W = 480
const H = 480
const ROT_SPEED = 3.4
const THRUST = 280
const FRICTION = 0.5
const BULLET_SPEED = 460
const BULLET_LIFE = 1.0
const SHOOT_CD = 0.26
const SIZE_R = { 3: 36, 2: 22, 1: 12 } as const
const SIZE_SCORE = { 3: 20, 2: 50, 1: 100 } as const

interface Asteroid {
  x: number
  y: number
  vx: number
  vy: number
  size: 1 | 2 | 3
}

interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

export class Asteroids extends Game {
  readonly width = W
  readonly height = H

  private x = W / 2
  private y = H / 2
  private angle = 0
  private vx = 0
  private vy = 0
  private invuln = 0
  private shootTimer = 0
  private bullets: Bullet[] = []
  private rocks: Asteroid[] = []
  private lives = 3
  private wave = 1
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
    this.x = W / 2
    this.y = H / 2
    this.angle = 0
    this.vx = 0
    this.vy = 0
    this.invuln = 1.5
    this.shootTimer = 0
    this.bullets = []
    this.lives = 3
    this.wave = 1
    this.score = 0
    this.alive = true
    this.started = false
    this.particles.clear()
    this.spawnWave()
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
    this.shootTimer = Math.max(0, this.shootTimer - dt)
    if (this.invuln > 0) this.invuln -= dt

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

    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) this.angle -= ROT_SPEED * dt
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) this.angle += ROT_SPEED * dt
    const thrusting = input.isDown('ArrowUp') || input.isDown('KeyW')
    if (thrusting) {
      this.vx += Math.sin(this.angle) * THRUST * dt
      this.vy += -Math.cos(this.angle) * THRUST * dt
      if (Math.random() < 0.5) {
        this.particles.burst(this.x - Math.sin(this.angle) * 14, this.y + Math.cos(this.angle) * 14, {
          count: 2,
          color: ['#fb923c', '#fbbf24'],
          speed: 60,
          life: 0.3,
        })
      }
    }
    if (input.consumeAction() && this.shootTimer <= 0) this.shoot()

    this.vx *= Math.max(0, 1 - FRICTION * dt)
    this.vy *= Math.max(0, 1 - FRICTION * dt)
    this.x = wrap(this.x + this.vx * dt, W)
    this.y = wrap(this.y + this.vy * dt, H)

    for (const b of this.bullets) {
      b.x = wrap(b.x + b.vx * dt, W)
      b.y = wrap(b.y + b.vy * dt, H)
      b.life -= dt
    }
    this.bullets = this.bullets.filter((b) => b.life > 0)

    for (const r of this.rocks) {
      r.x = wrap(r.x + r.vx * dt, W)
      r.y = wrap(r.y + r.vy * dt, H)
    }

    this.collisions()
    if (this.rocks.length === 0) this.nextWave()
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, W, H)

    this.shake.begin(ctx)

    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2
    for (const r of this.rocks) {
      ctx.beginPath()
      ctx.arc(r.x, r.y, SIZE_R[r.size], 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.fillStyle = PALETTE.accent2
    for (const b of this.bullets) {
      ctx.beginPath()
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    if (this.alive && !(this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0)) {
      ctx.save()
      ctx.translate(this.x, this.y)
      ctx.rotate(this.angle)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, -14)
      ctx.lineTo(10, 12)
      ctx.lineTo(0, 6)
      ctx.lineTo(-10, 12)
      ctx.closePath()
      ctx.stroke()
      ctx.restore()
    }

    for (let i = 0; i < this.lives; i++) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(16 + i * 18, 12)
      ctx.lineTo(22 + i * 18, 26)
      ctx.lineTo(10 + i * 18, 26)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = PALETTE.muted
    ctx.font = '700 14px system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(`OLEADA ${this.wave}`, W - 14, 18)

    this.particles.render(ctx)
    this.shake.end(ctx)
  }

  // --- mecánica ---

  private shoot() {
    this.bullets.push({
      x: this.x + Math.sin(this.angle) * 14,
      y: this.y - Math.cos(this.angle) * 14,
      vx: this.vx + Math.sin(this.angle) * BULLET_SPEED,
      vy: this.vy - Math.cos(this.angle) * BULLET_SPEED,
      life: BULLET_LIFE,
    })
    this.shootTimer = SHOOT_CD
    audio.play('launch')
  }

  private collisions() {
    for (const b of this.bullets) {
      for (const r of this.rocks) {
        if (Math.hypot(b.x - r.x, b.y - r.y) < SIZE_R[r.size]) {
          b.life = 0
          this.breakRock(r)
          break
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0)

    if (this.invuln <= 0) {
      for (const r of this.rocks) {
        if (Math.hypot(this.x - r.x, this.y - r.y) < SIZE_R[r.size] + 8) {
          this.hit()
          break
        }
      }
    }
  }

  private breakRock(r: Asteroid) {
    this.score += SIZE_SCORE[r.size]
    this.shake.add(0.15)
    this.particles.burst(r.x, r.y, { count: 12, color: ['#94a3b8', '#ffffff'], speed: 140, life: 0.5 })
    audio.play('brick')
    this.emit({ type: 'score', value: this.score })
    this.rocks = this.rocks.filter((x) => x !== r)
    if (r.size > 1) {
      const next = (r.size - 1) as 1 | 2
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 50 + Math.random() * 60
        this.rocks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: next })
      }
    }
  }

  private hit() {
    this.lives -= 1
    this.shake.add(0.8)
    this.particles.burst(this.x, this.y, { count: 22, color: ['#ffffff', PALETTE.danger], speed: 200, life: 0.7 })
    audio.play('die')
    if (this.lives <= 0) {
      this.alive = false
      this.emit({ type: 'gameover', score: this.score })
      this.emit({ type: 'state', state: 'over' })
      return
    }
    this.x = W / 2
    this.y = H / 2
    this.vx = 0
    this.vy = 0
    this.invuln = 2
  }

  private nextWave() {
    if (!this.alive) return
    this.wave += 1
    audio.play('win')
    this.spawnWave()
  }

  private spawnWave() {
    const n = 3 + this.wave
    this.rocks = []
    for (let i = 0; i < n; i++) {
      const edge = Math.random()
      const x = edge < 0.5 ? Math.random() * W : Math.random() < 0.5 ? 0 : W
      const y = edge < 0.5 ? (Math.random() < 0.5 ? 0 : H) : Math.random() * H
      const a = Math.random() * Math.PI * 2
      const sp = 30 + Math.random() * 40 + this.wave * 6
      this.rocks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: 3 })
    }
  }
}

function wrap(v: number, max: number): number {
  if (v < 0) return v + max
  if (v >= max) return v - max
  return v
}
