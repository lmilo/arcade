import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'

const W = 380
const H = 560
const GRAVITY = 1500
const JUMP = -760
const PLAT_W = 62
const R = 16
const SPRING_JUMP = JUMP * 1.55

type PType = 'normal' | 'spring' | 'crumble'

interface Platform {
  x: number
  y: number
  type: PType
  crumbling: boolean
  fade: number
}

export class Jumper extends Game {
  readonly width = W
  readonly height = H

  private x = W / 2
  private y = 0
  private vy = 0
  private cameraY = 0
  private startY = 0
  private highest = 0
  private platforms: Platform[] = []
  private dirFace = 1
  private score = 0
  private alive = true
  private started = false

  private readonly particles = new Particles()

  constructor(emit: Emit, _size: BoardSize) {
    super(emit)
    void _size
    this.reset()
  }

  reset() {
    this.x = W / 2
    this.y = H - 100
    this.startY = this.y
    this.highest = this.y
    this.vy = JUMP
    this.cameraY = 0
    this.score = 0
    this.alive = true
    this.started = false
    this.particles.clear()
    this.platforms = [{ x: W / 2, y: H - 60, type: 'normal', crumbling: false, fade: 1 }]
    this.fill()
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

    const pointer = input.pointerX()
    if (pointer !== null) this.x = pointer * W
    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
      this.x -= 360 * dt
      this.dirFace = -1
    }
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
      this.x += 360 * dt
      this.dirFace = 1
    }
    if (this.x < 0) this.x += W
    if (this.x > W) this.x -= W

    const prevY = this.y
    this.vy += GRAVITY * dt
    this.y += this.vy * dt

    if (this.vy > 0) {
      for (const p of this.platforms) {
        if (p.crumbling) continue
        if (
          prevY + R <= p.y &&
          this.y + R >= p.y &&
          this.y + R <= p.y + 18 &&
          Math.abs(this.x - p.x) < PLAT_W / 2 + R * 0.4
        ) {
          if (p.type === 'spring') {
            this.vy = SPRING_JUMP
            this.particles.burst(this.x, p.y, { count: 12, color: [PALETTE.accent2, '#fff'], speed: 150, life: 0.4, angle: Math.PI / 2, spread: 0.5 })
            audio.play('powerup')
          } else {
            this.vy = JUMP
            this.particles.burst(this.x, p.y, { count: 6, color: [PALETTE.success, '#fff'], speed: 90, life: 0.3, angle: Math.PI / 2, spread: 0.4 })
            audio.play('bounce')
          }
          if (p.type === 'crumble') p.crumbling = true
          break
        }
      }
    }

    for (const p of this.platforms) if (p.crumbling) p.fade -= dt * 2.2

    if (this.y < this.highest) {
      this.highest = this.y
      const s = Math.floor((this.startY - this.highest) / 10)
      if (s > this.score) {
        this.score = s
        this.emit({ type: 'score', value: this.score })
      }
    }

    if (this.y - this.cameraY < H * 0.42) this.cameraY = this.y - H * 0.42
    this.platforms = this.platforms.filter((p) => p.y < this.cameraY + H + 40 && (!p.crumbling || p.fade > 0))
    this.fill()

    if (this.y - this.cameraY > H + 30) {
      this.alive = false
      audio.play('die')
      this.emit({ type: 'gameover', score: this.score })
      this.emit({ type: 'state', state: 'over' })
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#1e1b4b')
    sky.addColorStop(1, PALETTE.bg)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)

    for (const p of this.platforms) {
      const sy = p.y - this.cameraY
      ctx.globalAlpha = p.crumbling ? Math.max(0, p.fade) : 1
      ctx.fillStyle = p.type === 'spring' ? PALETTE.accent2 : p.type === 'crumble' ? '#b45309' : PALETTE.success
      ctx.beginPath()
      ctx.roundRect(p.x - PLAT_W / 2, sy, PLAT_W, 12, 6)
      ctx.fill()
      if (p.type === 'spring') {
        // Resorte: flecha hacia arriba.
        ctx.fillStyle = '#0f0f1a'
        ctx.beginPath()
        ctx.moveTo(p.x, sy - 7)
        ctx.lineTo(p.x + 7, sy + 1)
        ctx.lineTo(p.x - 7, sy + 1)
        ctx.fill()
      } else if (p.type === 'crumble') {
        // Desvanecente: grietas.
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(p.x - 14, sy + 2)
        ctx.lineTo(p.x - 6, sy + 10)
        ctx.moveTo(p.x + 4, sy + 1)
        ctx.lineTo(p.x + 12, sy + 11)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1

    const sy = this.y - this.cameraY
    ctx.fillStyle = PALETTE.accent
    ctx.beginPath()
    ctx.arc(this.x, sy, R, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(this.x + this.dirFace * 5, sy - 4, 3, 0, Math.PI * 2)
    ctx.fill()

    this.particles.render(ctx)
  }

  private fill() {
    let topY = this.platforms.reduce((m, p) => Math.min(m, p.y), H)
    let guard = 0
    while (topY > this.cameraY - 120 && guard < 200) {
      topY -= 52 + Math.random() * 46
      const r = Math.random()
      const type: PType = r < 0.12 ? 'spring' : r < 0.32 ? 'crumble' : 'normal'
      this.platforms.push({ x: PLAT_W / 2 + Math.random() * (W - PLAT_W), y: topY, type, crumbling: false, fade: 1 })
      guard++
    }
  }
}
