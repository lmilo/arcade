import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const W = 400
const H = 560
const BIRD_X = 120
const BIRD_R = 13
const GRAVITY = 1500
const FLAP = -430
const PIPE_W = 64
const GAP = 165
const PIPE_SPEED = 155
const SPAWN_INTERVAL = 1.5
const GROUND_H = 40

interface Pipe {
  x: number
  gapY: number
  passed: boolean
}

export class Flappy extends Game {
  readonly width = W
  readonly height = H

  private birdY = H / 2
  private vy = 0
  private pipes: Pipe[] = []
  private spawnTimer = 0
  private score = 0
  private time = 0
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
    this.birdY = H / 2
    this.vy = 0
    this.pipes = []
    this.spawnTimer = 0
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
    this.flap()
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
    if (input.consumeAction()) this.flap()

    this.vy += GRAVITY * dt
    this.birdY += this.vy * dt

    this.spawnTimer += dt
    if (this.spawnTimer >= SPAWN_INTERVAL) {
      this.spawnTimer -= SPAWN_INTERVAL
      const margin = 70
      const range = H - GROUND_H - GAP - margin * 2
      const gapY = margin + GAP / 2 + Math.random() * Math.max(0, range)
      this.pipes.push({ x: W, gapY, passed: false })
    }

    for (const p of this.pipes) {
      p.x -= PIPE_SPEED * dt
      if (!p.passed && p.x + PIPE_W < BIRD_X) {
        p.passed = true
        this.score += 1
        audio.play('eat')
        this.emit({ type: 'score', value: this.score })
      }
    }
    this.pipes = this.pipes.filter((p) => p.x + PIPE_W > -10)

    if (this.birdY - BIRD_R < 0) {
      this.birdY = BIRD_R
      this.vy = 0
    }
    if (this.birdY + BIRD_R >= H - GROUND_H) {
      this.die()
      return
    }
    for (const p of this.pipes) {
      if (BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W) {
        if (this.birdY - BIRD_R < p.gapY - GAP / 2 || this.birdY + BIRD_R > p.gapY + GAP / 2) {
          this.die()
          return
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#172554')
    sky.addColorStop(1, PALETTE.bg)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)

    this.shake.begin(ctx)

    for (const p of this.pipes) {
      this.drawPipe(ctx, p)
    }

    // Suelo.
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, H - GROUND_H, W, GROUND_H)
    ctx.fillStyle = PALETTE.accent
    ctx.fillRect(0, H - GROUND_H, W, 3)

    // Pájaro.
    const angle = Math.max(-0.4, Math.min(1.3, this.vy / 700))
    ctx.save()
    ctx.translate(BIRD_X, this.birdY)
    ctx.rotate(this.started ? angle : Math.sin(this.time * 3) * 0.15)
    ctx.fillStyle = PALETTE.warning
    ctx.beginPath()
    ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fb923c'
    ctx.beginPath()
    ctx.moveTo(BIRD_R - 2, -2)
    ctx.lineTo(BIRD_R + 8, 1)
    ctx.lineTo(BIRD_R - 2, 4)
    ctx.fill()
    ctx.fillStyle = '#0f0f1a'
    ctx.beginPath()
    ctx.arc(4, -4, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    this.particles.render(ctx)
    this.shake.end(ctx)
  }

  private flap() {
    this.vy = FLAP
    this.particles.burst(BIRD_X - 8, this.birdY + 6, {
      count: 5,
      color: ['#fbbf24', '#ffffff'],
      speed: 90,
      life: 0.3,
      angle: Math.PI / 2,
      spread: 0.3,
    })
    audio.play('bounce')
  }

  private die() {
    this.alive = false
    this.shake.add(0.8)
    this.particles.burst(BIRD_X, this.birdY, {
      count: 22,
      color: ['#fbbf24', '#ef4444', '#ffffff'],
      speed: 200,
      life: 0.7,
      gravity: 200,
    })
    audio.play('die')
    this.emit({ type: 'gameover', score: this.score })
    this.emit({ type: 'state', state: 'over' })
  }

  private drawPipe(ctx: CanvasRenderingContext2D, p: Pipe) {
    const topH = p.gapY - GAP / 2
    const botY = p.gapY + GAP / 2
    ctx.fillStyle = PALETTE.success
    ctx.fillRect(p.x, 0, PIPE_W, topH)
    ctx.fillRect(p.x, botY, PIPE_W, H - GROUND_H - botY)
    ctx.fillStyle = '#16a34a'
    ctx.fillRect(p.x - 4, topH - 18, PIPE_W + 8, 18)
    ctx.fillRect(p.x - 4, botY, PIPE_W + 8, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(p.x + 6, 0, 5, topH)
    ctx.fillRect(p.x + 6, botY, 5, H - GROUND_H - botY)
  }
}
