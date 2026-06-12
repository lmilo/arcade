import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const W = 400
const H = 520
const PLAYER_W = 42
const PLAYER_H = 16
const PLAYER_Y = H - 38

interface Obstacle {
  x: number
  y: number
  w: number
}

export class Dodge extends Game {
  readonly width = W
  readonly height = H

  private playerX = W / 2
  private obstacles: Obstacle[] = []
  private spawnTimer = 0
  private elapsed = 0
  private invuln = 0
  private lives = 3
  private scoreF = 0
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
    this.playerX = W / 2
    this.obstacles = []
    this.spawnTimer = 0.6
    this.elapsed = 0
    this.invuln = 0
    this.lives = 3
    this.scoreF = 0
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

    this.elapsed += dt
    const pointer = input.pointerX()
    if (pointer !== null) this.playerX = pointer * W
    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) this.playerX -= 400 * dt
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) this.playerX += 400 * dt
    this.playerX = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, this.playerX))

    this.scoreF += dt * 10
    if (Math.floor(this.scoreF) > this.score) {
      this.score = Math.floor(this.scoreF)
      this.emit({ type: 'score', value: this.score })
    }

    const fallSpeed = Math.min(420, 170 + this.elapsed * 7)
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      const w = 26 + Math.random() * 60
      this.obstacles.push({ x: Math.random() * (W - w) + w / 2, y: -20, w })
      this.spawnTimer = Math.max(0.32, 0.9 - this.elapsed * 0.02)
    }

    const survivors: Obstacle[] = []
    for (const o of this.obstacles) {
      o.y += fallSpeed * dt
      if (
        this.invuln <= 0 &&
        o.y + 12 > PLAYER_Y - PLAYER_H / 2 &&
        o.y - 12 < PLAYER_Y + PLAYER_H / 2 &&
        Math.abs(o.x - this.playerX) < o.w / 2 + PLAYER_W / 2
      ) {
        this.hit()
        continue
      }
      if (o.y - 12 > H) {
        this.score += 10
        this.scoreF += 10
        this.emit({ type: 'score', value: this.score })
        continue
      }
      survivors.push(o)
    }
    this.obstacles = survivors
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, W, H)

    this.shake.begin(ctx)

    ctx.fillStyle = PALETTE.danger
    for (const o of this.obstacles) {
      ctx.beginPath()
      ctx.roundRect(o.x - o.w / 2, o.y - 12, o.w, 24, 5)
      ctx.fill()
    }

    if (!(this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0)) {
      ctx.fillStyle = PALETTE.accent2
      ctx.beginPath()
      ctx.moveTo(this.playerX, PLAYER_Y - PLAYER_H / 2)
      ctx.lineTo(this.playerX + PLAYER_W / 2, PLAYER_Y + PLAYER_H / 2)
      ctx.lineTo(this.playerX - PLAYER_W / 2, PLAYER_Y + PLAYER_H / 2)
      ctx.closePath()
      ctx.fill()
    }

    for (let i = 0; i < this.lives; i++) {
      ctx.fillStyle = PALETTE.accent2
      ctx.beginPath()
      ctx.arc(14 + i * 16, 16, 5, 0, Math.PI * 2)
      ctx.fill()
    }

    this.particles.render(ctx)
    this.shake.end(ctx)
  }

  private hit() {
    this.lives -= 1
    this.invuln = 1.3
    this.shake.add(0.7)
    this.particles.burst(this.playerX, PLAYER_Y, { count: 18, color: [PALETTE.accent2, '#fff', PALETTE.danger], speed: 180, life: 0.6 })
    audio.play('die')
    if (this.lives <= 0) {
      this.alive = false
      this.emit({ type: 'gameover', score: this.score })
      this.emit({ type: 'state', state: 'over' })
    }
  }
}
