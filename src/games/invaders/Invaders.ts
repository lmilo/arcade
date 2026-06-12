import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const W = 440
const H = 560
const PLAYER_W = 44
const PLAYER_H = 14
const PLAYER_Y = H - 36
const PLAYER_SPEED = 330
const BULLET_SPEED = 580
const E_BULLET_SPEED = 240
const ROWS = 4
const COLS = 8
const E_W = 28
const E_H = 18
const E_GAP = 14
const DROP = 20
const SHOOT_CD = 0.35
const ROW_COLORS = ['#ef4444', '#fb923c', '#22d3ee', '#a855f7']

interface Enemy {
  x: number
  y: number
  row: number
  alive: boolean
}

export class Invaders extends Game {
  readonly width = W
  readonly height = H

  private playerX = W / 2
  private enemies: Enemy[] = []
  private dir = 1
  private bullets: { x: number; y: number }[] = []
  private eBullets: { x: number; y: number }[] = []
  private shootTimer = 0
  private eShootTimer = 1
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
    this.playerX = W / 2
    this.dir = 1
    this.bullets = []
    this.eBullets = []
    this.shootTimer = 0
    this.eShootTimer = 1
    this.lives = 3
    this.wave = 1
    this.score = 0
    this.alive = true
    this.started = false
    this.particles.clear()
    this.buildWave()
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

    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) this.playerX -= PLAYER_SPEED * dt
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) this.playerX += PLAYER_SPEED * dt
    const pointer = input.pointerX()
    if (pointer !== null) this.playerX = pointer * W
    this.playerX = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, this.playerX))

    if (input.consumeAction() && this.shootTimer <= 0) {
      this.bullets.push({ x: this.playerX, y: PLAYER_Y - PLAYER_H })
      this.shootTimer = SHOOT_CD
      audio.play('launch')
    }

    this.moveEnemies(dt)
    this.stepBullets(dt)
    this.stepEnemyFire(dt)
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, W, H)

    this.shake.begin(ctx)

    for (const e of this.enemies) {
      if (!e.alive) continue
      ctx.fillStyle = ROW_COLORS[e.row % ROW_COLORS.length]
      ctx.fillRect(e.x - E_W / 2, e.y - E_H / 2, E_W, E_H)
      ctx.fillStyle = '#0f0f1a'
      ctx.fillRect(e.x - E_W / 2 + 5, e.y - 2, 5, 5)
      ctx.fillRect(e.x + E_W / 2 - 10, e.y - 2, 5, 5)
    }

    ctx.fillStyle = '#22d3ee'
    for (const b of this.bullets) ctx.fillRect(b.x - 2, b.y - 8, 4, 10)
    ctx.fillStyle = '#fbbf24'
    for (const b of this.eBullets) ctx.fillRect(b.x - 2, b.y, 4, 10)

    // Nave.
    ctx.fillStyle = PALETTE.accent2
    ctx.beginPath()
    ctx.roundRect(this.playerX - PLAYER_W / 2, PLAYER_Y - PLAYER_H / 2, PLAYER_W, PLAYER_H, 4)
    ctx.fill()
    ctx.fillRect(this.playerX - 3, PLAYER_Y - PLAYER_H, 6, 8)

    for (let i = 0; i < this.lives; i++) {
      ctx.fillStyle = PALETTE.accent2
      ctx.fillRect(12 + i * 18, 14, 12, 6)
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

  private moveEnemies(dt: number) {
    const aliveList = this.enemies.filter((e) => e.alive)
    if (aliveList.length === 0) {
      this.nextWave()
      return
    }
    const total = ROWS * COLS
    const speed = 26 + (1 - aliveList.length / total) * 90 + (this.wave - 1) * 14
    let minX = Infinity
    let maxX = -Infinity
    for (const e of aliveList) {
      e.x += this.dir * speed * dt
      minX = Math.min(minX, e.x - E_W / 2)
      maxX = Math.max(maxX, e.x + E_W / 2)
    }
    if (maxX > W - 12 || minX < 12) {
      this.dir *= -1
      for (const e of aliveList) e.y += DROP
    }
    if (aliveList.some((e) => e.y + E_H / 2 >= PLAYER_Y - PLAYER_H)) this.gameOver()
  }

  private stepBullets(dt: number) {
    for (const b of this.bullets) b.y -= BULLET_SPEED * dt
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (!e.alive) continue
        if (Math.abs(b.x - e.x) < E_W / 2 && Math.abs(b.y - e.y) < E_H / 2) {
          e.alive = false
          b.y = -100
          this.score += 10 * (ROWS - e.row)
          this.shake.add(0.12)
          this.particles.burst(e.x, e.y, {
            count: 10,
            color: [ROW_COLORS[e.row % ROW_COLORS.length], '#ffffff'],
            speed: 150,
            life: 0.5,
          })
          audio.play('brick')
          this.emit({ type: 'score', value: this.score })
          break
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.y > -20)
  }

  private stepEnemyFire(dt: number) {
    for (const b of this.eBullets) b.y += E_BULLET_SPEED * dt
    this.eShootTimer -= dt
    if (this.eShootTimer <= 0) {
      const aliveList = this.enemies.filter((e) => e.alive)
      if (aliveList.length > 0) {
        const shooter = aliveList[Math.floor(Math.random() * aliveList.length)]
        this.eBullets.push({ x: shooter.x, y: shooter.y })
      }
      this.eShootTimer = 0.5 + Math.random() * 1.2
    }
    for (const b of this.eBullets) {
      if (
        b.y > PLAYER_Y - PLAYER_H / 2 &&
        b.y < PLAYER_Y + PLAYER_H / 2 &&
        Math.abs(b.x - this.playerX) < PLAYER_W / 2
      ) {
        b.y = H + 100
        this.hitPlayer()
      }
    }
    this.eBullets = this.eBullets.filter((b) => b.y < H + 20)
  }

  private hitPlayer() {
    this.lives -= 1
    this.shake.add(0.7)
    this.particles.burst(this.playerX, PLAYER_Y, { count: 18, color: [PALETTE.accent2, '#ffffff'], speed: 180, life: 0.6 })
    audio.play('die')
    if (this.lives <= 0) this.gameOver()
  }

  private nextWave() {
    this.wave += 1
    this.bullets = []
    this.eBullets = []
    this.dir = 1
    audio.play('win')
    this.shake.add(0.3)
    this.buildWave()
  }

  private buildWave() {
    const enemies: Enemy[] = []
    const startX = (W - (COLS * (E_W + E_GAP) - E_GAP)) / 2 + E_W / 2
    const startY = 70
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        enemies.push({ x: startX + c * (E_W + E_GAP), y: startY + r * (E_H + E_GAP), row: r, alive: true })
      }
    }
    this.enemies = enemies
  }

  private gameOver() {
    if (!this.alive) return
    this.alive = false
    this.shake.add(0.6)
    audio.play('die')
    this.emit({ type: 'gameover', score: this.score })
    this.emit({ type: 'state', state: 'over' })
  }
}
