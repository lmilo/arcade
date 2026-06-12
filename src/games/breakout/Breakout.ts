import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const W = 440
const H = 520
const COLS = 8
const ROWS = 6
const PADDLE_H = 12
const PADDLE_Y = H - 34
const PADDLE_BASE = 84
const PADDLE_SPEED = 460
const BALL_R = 7
const TRAIL_LEN = 12
const BASE_SPEED = 270
const MAX_SPEED = 540
const RALLY_RAMP = 10 // px/s de velocidad por segundo de bola viva
const WIDE_DUR = 9
const SHRINK_DUR = 8
const SLOW_DUR = 7

const ROW_COLORS = ['#ef4444', '#fb923c', '#fbbf24', '#22c55e', '#22d3ee', '#3b82f6']

type BrickKind = 'normal' | 'tough' | 'power' | 'debuff'
type Capsule = { x: number; y: number; kind: BuffKind | 'shrink' }
type BuffKind = 'wide' | 'multi' | 'slow' | 'life'
const BUFFS: BuffKind[] = ['wide', 'multi', 'slow', 'life']

const CAPSULE_STYLE: Record<Capsule['kind'], { color: string; label: string }> = {
  wide: { color: '#22d3ee', label: 'W' },
  multi: { color: '#a855f7', label: 'M' },
  slow: { color: '#3b82f6', label: 'S' },
  life: { color: '#22c55e', label: '♥' },
  shrink: { color: '#ef4444', label: '▼' },
}

interface Brick {
  x: number
  y: number
  w: number
  h: number
  kind: BrickKind
  hp: number
}

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  trail: [number, number][]
}

export class Breakout extends Game {
  readonly width = W
  readonly height = H

  private paddleX = W / 2
  private wideTimer = 0
  private shrinkTimer = 0
  private slowTimer = 0
  private balls: Ball[] = []
  private awaitingLaunch = true
  private rallyTime = 0
  private bricks: Brick[] = []
  private capsules: Capsule[] = []
  private lives = 3
  private level = 1
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
    this.wideTimer = 0
    this.shrinkTimer = 0
    this.slowTimer = 0
    this.paddleX = W / 2
    this.level = 1
    this.score = 0
    this.lives = 3
    this.alive = true
    this.started = false
    this.capsules = []
    this.particles.clear()
    this.buildBricks()
    this.resetBallToPaddle()
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
    this.wideTimer = Math.max(0, this.wideTimer - dt)
    this.shrinkTimer = Math.max(0, this.shrinkTimer - dt)
    this.slowTimer = Math.max(0, this.slowTimer - dt)

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

    this.movePaddle(dt, input)

    if (this.awaitingLaunch) {
      const b = this.balls[0]
      b.x = this.paddleX
      b.y = PADDLE_Y - PADDLE_H / 2 - BALL_R - 1
      if (input.consumeAction()) this.launch()
      this.stepCapsules(dt)
      return
    }

    this.rallyTime += dt
    const speed = this.currentSpeed()
    for (const b of this.balls) this.stepBall(b, dt, speed)
    this.balls = this.balls.filter((b) => b.y - BALL_R <= H)
    if (this.balls.length === 0) this.loseLife()

    this.stepCapsules(dt)
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, W, H)

    this.shake.begin(ctx)

    for (const b of this.bricks) this.drawBrick(ctx, b)

    // Balls + trails.
    for (const b of this.balls) {
      b.trail.forEach(([tx, ty], i) => {
        ctx.globalAlpha = (i / b.trail.length) * 0.4
        ctx.fillStyle = PALETTE.accent2
        ctx.beginPath()
        ctx.arc(tx, ty, BALL_R * (i / b.trail.length), 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2)
      ctx.fill()
    }

    // Paddle (parpadea si un efecto temporal va a expirar).
    const pw = this.paddleWidth()
    ctx.globalAlpha = this.blinkEnding() ? 0.3 + 0.7 * ((Math.sin(this.time * 24) + 1) / 2) : 1
    ctx.fillStyle = this.shrinkTimer > 0 ? PALETTE.danger : PALETTE.accent
    ctx.beginPath()
    ctx.roundRect(this.paddleX - pw / 2, PADDLE_Y - PADDLE_H / 2, pw, PADDLE_H, 6)
    ctx.fill()
    ctx.globalAlpha = 1

    for (const c of this.capsules) this.drawCapsule(ctx, c)

    // HUD: vidas + nivel.
    for (let i = 0; i < this.lives; i++) {
      ctx.fillStyle = PALETTE.danger
      ctx.beginPath()
      ctx.arc(14 + i * 16, 18, 5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = PALETTE.muted
    ctx.font = '700 14px system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(`NIVEL ${this.level}`, W - 14, 18)

    this.particles.render(ctx)
    this.shake.end(ctx)
  }

  // --- mecánica ---

  private currentSpeed(): number {
    const ramp = Math.min(MAX_SPEED - BASE_SPEED, this.rallyTime * RALLY_RAMP)
    const base = Math.min(MAX_SPEED, BASE_SPEED + ramp)
    return this.slowTimer > 0 ? base * 0.55 : base
  }

  private paddleWidth(): number {
    let w = PADDLE_BASE
    if (this.wideTimer > 0) w *= 1.6
    if (this.shrinkTimer > 0) w *= 0.62
    return w
  }

  private blinkEnding(): boolean {
    return (this.wideTimer > 0 && this.wideTimer < 1.5) || (this.shrinkTimer > 0 && this.shrinkTimer < 1.5)
  }

  private movePaddle(dt: number, input: Input) {
    const pointer = input.pointerX()
    if (pointer !== null) {
      this.paddleX = pointer * W
    } else {
      if (input.isDown('ArrowLeft') || input.isDown('KeyA')) this.paddleX -= PADDLE_SPEED * dt
      if (input.isDown('ArrowRight') || input.isDown('KeyD')) this.paddleX += PADDLE_SPEED * dt
    }
    const half = this.paddleWidth() / 2
    this.paddleX = Math.max(half, Math.min(W - half, this.paddleX))
  }

  private launch() {
    this.awaitingLaunch = false
    const angle = (Math.random() - 0.5) * 0.6
    const speed = this.currentSpeed()
    this.balls[0].vx = speed * Math.sin(angle)
    this.balls[0].vy = -speed * Math.cos(angle)
    audio.play('launch')
  }

  private stepBall(b: Ball, dt: number, speed: number) {
    // Renormaliza a la velocidad actual conservando dirección.
    const mag = Math.hypot(b.vx, b.vy)
    if (mag > 0) {
      b.vx = (b.vx / mag) * speed
      b.vy = (b.vy / mag) * speed
    }
    b.x += b.vx * dt
    b.y += b.vy * dt

    b.trail.push([b.x, b.y])
    if (b.trail.length > TRAIL_LEN) b.trail.shift()

    if (b.x < BALL_R) {
      b.x = BALL_R
      b.vx = Math.abs(b.vx)
      audio.play('bounce')
    } else if (b.x > W - BALL_R) {
      b.x = W - BALL_R
      b.vx = -Math.abs(b.vx)
      audio.play('bounce')
    }
    if (b.y < BALL_R) {
      b.y = BALL_R
      b.vy = Math.abs(b.vy)
      audio.play('bounce')
    }

    const pw = this.paddleWidth()
    if (
      b.vy > 0 &&
      b.y + BALL_R >= PADDLE_Y - PADDLE_H / 2 &&
      b.y < PADDLE_Y &&
      b.x >= this.paddleX - pw / 2 &&
      b.x <= this.paddleX + pw / 2
    ) {
      const offset = Math.max(-1, Math.min(1, (b.x - this.paddleX) / (pw / 2)))
      const angle = offset * 1.05
      b.vx = speed * Math.sin(angle)
      b.vy = -speed * Math.cos(angle)
      b.y = PADDLE_Y - PADDLE_H / 2 - BALL_R
      audio.play('bounce')
    }

    this.hitBricks(b)
  }

  private hitBricks(b: Ball) {
    for (const brick of this.bricks) {
      if (
        b.x + BALL_R < brick.x ||
        b.x - BALL_R > brick.x + brick.w ||
        b.y + BALL_R < brick.y ||
        b.y - BALL_R > brick.y + brick.h
      ) {
        continue
      }
      const overlapX = Math.min(b.x + BALL_R, brick.x + brick.w) - Math.max(b.x - BALL_R, brick.x)
      const overlapY = Math.min(b.y + BALL_R, brick.y + brick.h) - Math.max(b.y - BALL_R, brick.y)
      if (overlapX < overlapY) b.vx = -b.vx
      else b.vy = -b.vy

      brick.hp -= 1
      if (brick.hp > 0) {
        // Bloque duro que aguanta: solo se agrieta.
        this.shake.add(0.06)
        audio.play('bounce')
        this.particles.burst(b.x, b.y, { count: 4, color: ['#e2e8f0'], speed: 90, life: 0.3 })
        break
      }

      this.destroyBrick(brick)
      break
    }
  }

  private destroyBrick(brick: Brick) {
    brick.hp = 0
    this.bricks = this.bricks.filter((x) => x !== brick)
    this.score += brick.kind === 'tough' ? 25 : 10
    this.shake.add(0.12)
    this.particles.burst(brick.x + brick.w / 2, brick.y + brick.h / 2, {
      count: 10,
      color: [brickColor(brick), '#ffffff'],
      speed: 150,
      life: 0.5,
      gravity: 220,
    })
    audio.play('brick')
    this.emit({ type: 'score', value: this.score })

    if (brick.kind === 'power') {
      this.capsules.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, kind: pick(BUFFS) })
    } else if (brick.kind === 'debuff') {
      this.capsules.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, kind: 'shrink' })
    }

    if (this.bricks.length === 0) this.nextLevel()
  }

  private stepCapsules(dt: number) {
    const pw = this.paddleWidth()
    const next: Capsule[] = []
    for (const c of this.capsules) {
      c.y += 150 * dt
      const caught =
        c.y >= PADDLE_Y - PADDLE_H && c.x >= this.paddleX - pw / 2 && c.x <= this.paddleX + pw / 2
      if (caught) {
        this.applyCapsule(c.kind)
        continue
      }
      if (c.y < H + 20) next.push(c)
    }
    this.capsules = next
  }

  private applyCapsule(kind: Capsule['kind']) {
    switch (kind) {
      case 'wide':
        this.wideTimer = WIDE_DUR
        this.shrinkTimer = 0
        audio.play('powerup')
        break
      case 'shrink':
        this.shrinkTimer = SHRINK_DUR
        this.wideTimer = 0
        this.shake.add(0.3)
        audio.play('lock')
        break
      case 'slow':
        this.slowTimer = SLOW_DUR
        audio.play('powerup')
        break
      case 'life':
        this.lives = Math.min(5, this.lives + 1)
        audio.play('powerup')
        break
      case 'multi':
        this.spawnMulti()
        audio.play('powerup')
        break
    }
  }

  private spawnMulti() {
    const src = this.balls[0]
    if (!src) return
    const speed = this.currentSpeed()
    const baseAngle = Math.atan2(src.vy, src.vx)
    for (const off of [-0.4, 0.4]) {
      const a = baseAngle + off
      this.balls.push({ x: src.x, y: src.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, trail: [] })
    }
  }

  private nextLevel() {
    this.level += 1
    audio.play('win')
    this.shake.add(0.3)
    this.capsules = []
    this.wideTimer = 0
    this.shrinkTimer = 0
    this.slowTimer = 0
    this.buildBricks()
    this.resetBallToPaddle()
  }

  private loseLife() {
    this.lives -= 1
    this.shake.add(0.7)
    audio.play('die')
    this.capsules = []
    this.wideTimer = 0
    this.shrinkTimer = 0
    this.slowTimer = 0
    if (this.lives <= 0) {
      this.alive = false
      this.emit({ type: 'gameover', score: this.score })
      this.emit({ type: 'state', state: 'over' })
      return
    }
    this.resetBallToPaddle()
  }

  private resetBallToPaddle() {
    this.awaitingLaunch = true
    this.rallyTime = 0
    this.balls = [
      { x: this.paddleX, y: PADDLE_Y - PADDLE_H / 2 - BALL_R - 1, vx: 0, vy: 0, trail: [] },
    ]
  }

  private buildBricks() {
    const margin = 16
    const gap = 6
    const top = 44
    const brickW = (W - margin * 2 - gap * (COLS - 1)) / COLS
    const brickH = 20
    const mid = Math.floor(COLS / 2)
    const toughRows = Math.min(3, Math.max(0, this.level - 1))
    const bricks: Brick[] = []

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const kind = classify(r, c, this.level, mid, toughRows)
        bricks.push({
          x: margin + c * (brickW + gap),
          y: top + r * (brickH + gap),
          w: brickW,
          h: brickH,
          kind,
          hp: kind === 'tough' ? 2 : 1,
        })
      }
    }
    this.bricks = bricks
  }

  // --- dibujo ---

  private drawBrick(ctx: CanvasRenderingContext2D, b: Brick) {
    ctx.fillStyle = brickColor(b)
    ctx.beginPath()
    ctx.roundRect(b.x, b.y, b.w, b.h, 4)
    ctx.fill()

    if (b.kind === 'tough') {
      ctx.strokeStyle = b.hp === 2 ? '#334155' : '#1e293b'
      ctx.lineWidth = 3
      ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3)
      if (b.hp === 1) {
        ctx.strokeStyle = 'rgba(15,23,42,0.7)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(b.x + b.w * 0.3, b.y + 2)
        ctx.lineTo(b.x + b.w * 0.5, b.y + b.h - 2)
        ctx.moveTo(b.x + b.w * 0.6, b.y + 2)
        ctx.lineTo(b.x + b.w * 0.75, b.y + b.h - 2)
        ctx.stroke()
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, 3)
    }

    if (b.kind === 'power' || b.kind === 'debuff') {
      ctx.strokeStyle = b.kind === 'power' ? '#bbf7d0' : '#fecaca'
      ctx.lineWidth = 2
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2)
      ctx.fillStyle = '#ffffff'
      ctx.font = '800 13px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(b.kind === 'power' ? '+' : '–', b.x + b.w / 2, b.y + b.h / 2 + 1)
    }
  }

  private drawCapsule(ctx: CanvasRenderingContext2D, c: Capsule) {
    const style = CAPSULE_STYLE[c.kind]
    ctx.fillStyle = style.color
    ctx.beginPath()
    ctx.roundRect(c.x - 11, c.y - 8, 22, 16, 5)
    ctx.fill()
    ctx.fillStyle = c.kind === 'shrink' ? '#ffffff' : '#0f0f1a'
    ctx.font = '800 12px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(style.label, c.x, c.y + 1)
  }
}

function classify(r: number, c: number, level: number, mid: number, toughRows: number): BrickKind {
  // Posiciones fijas: layout legible y reproducible, no aleatorio.
  if (r === 2 && (c === 1 || c === COLS - 2)) return 'power'
  if (level >= 2 && r === 3 && (c === mid - 1 || c === mid)) return 'debuff'
  if (r < toughRows) return 'tough'
  return 'normal'
}

function brickColor(b: Brick): string {
  switch (b.kind) {
    case 'tough':
      return b.hp === 2 ? '#64748b' : '#cbd5e1'
    case 'power':
      return '#22c55e'
    case 'debuff':
      return '#a21caf'
    default: {
      const r = Math.round((b.y - 44) / 26)
      return ROW_COLORS[Math.max(0, Math.min(ROW_COLORS.length - 1, r))]
    }
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
