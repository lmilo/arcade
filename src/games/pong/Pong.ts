import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const W = 480
const H = 360
const PADDLE_W = 80
const PADDLE_H = 12
const MARGIN = 22
const BALL_R = 8
const PLAYER_Y = H - MARGIN - PADDLE_H / 2
const AI_Y = MARGIN + PADDLE_H / 2
const POWER_R = 16
const POWER_SPAWN = 6.5
const POWER_LIFE = 6
const EFFECT_DUR = 6

type PowerKind = 'shrink' | 'fast' | 'blind'
const POWER_STYLE: Record<PowerKind, { color: string; label: string }> = {
  shrink: { color: '#ef4444', label: '⇲' },
  fast: { color: '#fb923c', label: '»' },
  blind: { color: '#a855f7', label: '◐' },
}
const POWER_KINDS: PowerKind[] = ['shrink', 'fast', 'blind']

interface Power {
  x: number
  y: number
  kind: PowerKind
  life: number
}

export class Pong extends Game {
  readonly width = W
  readonly height = H

  private playerX = W / 2
  private aiX = W / 2
  private ballX = W / 2
  private ballY = H / 2
  private ballVX = 0
  private ballVY = 0
  private serveTimer = 0
  private lives = 3
  private score = 0
  private alive = true
  private started = false

  private powers: Power[] = []
  private powerSpawn = POWER_SPAWN
  private shrinkTimer = 0
  private fastTimer = 0
  private blindTimer = 0

  private readonly particles = new Particles()
  private readonly shake = new Shake(10)

  constructor(emit: Emit, _size: BoardSize) {
    super(emit)
    void _size
    this.reset()
  }

  reset() {
    this.playerX = W / 2
    this.aiX = W / 2
    this.lives = 3
    this.score = 0
    this.alive = true
    this.started = false
    this.powers = []
    this.powerSpawn = POWER_SPAWN
    this.shrinkTimer = 0
    this.fastTimer = 0
    this.blindTimer = 0
    this.particles.clear()
    this.center(0.4)
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
    this.shrinkTimer = Math.max(0, this.shrinkTimer - dt)
    this.fastTimer = Math.max(0, this.fastTimer - dt)
    this.blindTimer = Math.max(0, this.blindTimer - dt)

    if (!this.alive) return
    if (!this.started) {
      if (input.consumeAction()) this.start()
      return
    }

    const pointer = input.pointerX()
    if (pointer !== null) this.playerX = pointer * W
    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) this.playerX -= 380 * dt
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) this.playerX += 380 * dt
    this.playerX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, this.playerX))

    const aiW = this.aiWidth()
    const aiSpeed = 190 + this.score * 8
    const targetX = this.ballVY < 0 ? this.ballX : W / 2
    const diff = targetX - this.aiX
    this.aiX += Math.sign(diff) * Math.min(Math.abs(diff), Math.min(aiSpeed, 360) * dt)
    this.aiX = Math.max(aiW / 2, Math.min(W - aiW / 2, this.aiX))

    // Power-ups: aparecen cada cierto tiempo y caducan.
    this.powerSpawn -= dt
    if (this.powerSpawn <= 0) {
      this.powers.push({
        x: 60 + Math.random() * (W - 120),
        y: H * 0.32 + Math.random() * H * 0.36,
        kind: POWER_KINDS[Math.floor(Math.random() * POWER_KINDS.length)],
        life: POWER_LIFE,
      })
      this.powerSpawn = POWER_SPAWN + Math.random() * 2
    }
    for (const p of this.powers) p.life -= dt
    this.powers = this.powers.filter((p) => p.life > 0)

    if (this.serveTimer > 0) {
      this.serveTimer -= dt
      this.ballX = W / 2
      this.ballY = H / 2
      if (this.serveTimer <= 0) this.launch()
      return
    }

    const speed = this.speed()
    const mag = Math.hypot(this.ballVX, this.ballVY)
    if (mag > 0) {
      this.ballVX = (this.ballVX / mag) * speed
      this.ballVY = (this.ballVY / mag) * speed
    }
    this.ballX += this.ballVX * dt
    this.ballY += this.ballVY * dt

    if (this.ballX < BALL_R) {
      this.ballX = BALL_R
      this.ballVX = Math.abs(this.ballVX)
      audio.play('bounce')
    } else if (this.ballX > W - BALL_R) {
      this.ballX = W - BALL_R
      this.ballVX = -Math.abs(this.ballVX)
      audio.play('bounce')
    }

    this.paddleBounce(this.playerX, PLAYER_Y, PADDLE_W, true)
    this.paddleBounce(this.aiX, AI_Y, aiW, false)
    this.collectPowers()

    if (this.ballY < -BALL_R) this.point()
    else if (this.ballY > H + BALL_R) this.miss()
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, W, H)

    this.shake.begin(ctx)

    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.setLineDash([8, 10])
    ctx.beginPath()
    ctx.moveTo(0, H / 2)
    ctx.lineTo(W, H / 2)
    ctx.stroke()
    ctx.setLineDash([])

    for (const p of this.powers) {
      const style = POWER_STYLE[p.kind]
      const blink = p.life < 1.5 && Math.floor(p.life * 10) % 2 === 0
      ctx.globalAlpha = blink ? 0.4 : 1
      ctx.fillStyle = style.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, POWER_R, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0f0f1a'
      ctx.font = '800 16px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(style.label, p.x, p.y + 1)
      ctx.globalAlpha = 1
    }

    const aiW = this.aiWidth()
    ctx.fillStyle = PALETTE.accent
    ctx.beginPath()
    ctx.roundRect(this.playerX - PADDLE_W / 2, PLAYER_Y - PADDLE_H / 2, PADDLE_W, PADDLE_H, 6)
    ctx.fill()
    ctx.fillStyle = PALETTE.danger
    ctx.beginPath()
    ctx.roundRect(this.aiX - aiW / 2, AI_Y - PADDLE_H / 2, aiW, PADDLE_H, 6)
    ctx.fill()

    // Bola: se desvanece en la mitad de la IA con el poder 'blind'.
    const faint = this.blindTimer > 0 && this.ballY < H / 2
    ctx.globalAlpha = faint ? 0.12 : 1
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(this.ballX, this.ballY, BALL_R, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    for (let i = 0; i < this.lives; i++) {
      ctx.fillStyle = PALETTE.accent
      ctx.beginPath()
      ctx.arc(14 + i * 16, H / 2 + 18, 5, 0, Math.PI * 2)
      ctx.fill()
    }

    this.particles.render(ctx)
    this.shake.end(ctx)
  }

  // --- mecánica ---

  private speed() {
    const base = Math.min(460, 260 + this.score * 7)
    return this.fastTimer > 0 ? base * 1.35 : base
  }

  private aiWidth() {
    return this.shrinkTimer > 0 ? PADDLE_W * 0.5 : PADDLE_W
  }

  private collectPowers() {
    for (const p of this.powers) {
      if (Math.hypot(p.x - this.ballX, p.y - this.ballY) < POWER_R + BALL_R) {
        this.activate(p.kind)
        p.life = 0
        this.particles.burst(p.x, p.y, { count: 12, color: [POWER_STYLE[p.kind].color, '#fff'], speed: 150, life: 0.5 })
        audio.play('powerup')
      }
    }
    this.powers = this.powers.filter((p) => p.life > 0)
  }

  private activate(kind: PowerKind) {
    if (kind === 'shrink') this.shrinkTimer = EFFECT_DUR
    else if (kind === 'fast') this.fastTimer = EFFECT_DUR
    else this.blindTimer = EFFECT_DUR
  }

  private center(delay: number) {
    this.ballX = W / 2
    this.ballY = H / 2
    this.ballVX = 0
    this.ballVY = 0
    this.serveTimer = delay
  }

  private launch() {
    const angle = (Math.random() - 0.5) * 0.7
    const speed = this.speed()
    this.ballVX = speed * Math.sin(angle)
    this.ballVY = speed * Math.cos(angle)
  }

  private paddleBounce(px: number, py: number, pw: number, isPlayer: boolean) {
    const movingToward = isPlayer ? this.ballVY > 0 : this.ballVY < 0
    if (!movingToward) return
    const near = isPlayer
      ? this.ballY + BALL_R >= py - PADDLE_H / 2 && this.ballY < py
      : this.ballY - BALL_R <= py + PADDLE_H / 2 && this.ballY > py
    if (!near || Math.abs(this.ballX - px) > pw / 2) return
    const offset = Math.max(-1, Math.min(1, (this.ballX - px) / (pw / 2)))
    const speed = this.speed()
    this.ballVX = speed * Math.sin(offset * 1.0)
    this.ballVY = (isPlayer ? -1 : 1) * speed * Math.cos(offset * 1.0)
    this.ballY = isPlayer ? py - PADDLE_H / 2 - BALL_R : py + PADDLE_H / 2 + BALL_R
    audio.play('bounce')
  }

  private point() {
    this.score += 1
    this.shake.add(0.25)
    this.particles.burst(this.ballX, 0, { count: 12, color: [PALETTE.success, '#ffffff'], speed: 160, life: 0.5, angle: Math.PI / 2, spread: 0.4 })
    audio.play('eat')
    this.emit({ type: 'score', value: this.score })
    this.center(0.6)
  }

  private miss() {
    this.lives -= 1
    this.shake.add(0.6)
    audio.play('die')
    if (this.lives <= 0) {
      this.alive = false
      this.emit({ type: 'gameover', score: this.score })
      this.emit({ type: 'state', state: 'over' })
      return
    }
    this.center(0.6)
  }
}
