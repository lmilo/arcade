export interface BurstOpts {
  count?: number
  color?: string | string[]
  speed?: number
  /** Fracción del círculo completo en que se dispersan (1 = 360°). */
  spread?: number
  /** Dirección base en radianes (0 = derecha). */
  angle?: number
  size?: number
  life?: number
  gravity?: number
  drag?: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  gravity: number
  drag: number
}

/**
 * Sistema de partículas ligero en coordenadas lógicas del juego. El juego llama
 * `burst()` en los eventos, `update(dt)` cada tick y `render(ctx)` al dibujar.
 */
export class Particles {
  private items: Particle[] = []

  get count() {
    return this.items.length
  }

  burst(x: number, y: number, opts: BurstOpts = {}) {
    const n = opts.count ?? 12
    const baseAngle = opts.angle ?? 0
    const spread = opts.spread ?? 1
    const baseSpeed = opts.speed ?? 130
    const baseLife = opts.life ?? 0.6
    const baseSize = opts.size ?? 3
    const gravity = opts.gravity ?? 0
    const drag = opts.drag ?? 1.5

    for (let i = 0; i < n; i++) {
      const ang = baseAngle + (Math.random() - 0.5) * Math.PI * 2 * spread
      const spd = baseSpeed * (0.4 + Math.random() * 0.7)
      const life = baseLife * (0.7 + Math.random() * 0.6)
      this.items.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life,
        maxLife: life,
        size: baseSize * (0.6 + Math.random() * 0.8),
        color: pickColor(opts.color),
        gravity,
        drag,
      })
    }
  }

  update(dt: number) {
    const next: Particle[] = []
    for (const p of this.items) {
      p.life -= dt
      if (p.life <= 0) continue
      const damp = Math.max(0, 1 - p.drag * dt)
      p.vx *= damp
      p.vy = p.vy * damp + p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      next.push(p)
    }
    this.items = next
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.items) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    }
    ctx.globalAlpha = 1
  }

  clear() {
    this.items = []
  }
}

function pickColor(color: string | string[] | undefined): string {
  if (Array.isArray(color)) return color[Math.floor(Math.random() * color.length)]
  return color ?? '#ffffff'
}
