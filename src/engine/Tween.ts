export type EaseFn = (t: number) => number

/** Funciones de easing normalizadas (entrada y salida en 0..1). */
export const Ease = {
  linear: (t: number) => t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outBack: (t: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  outElastic: (t: number) => {
    if (t === 0 || t === 1) return t
    const c4 = (2 * Math.PI) / 3
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Animación escalar simple. `value` aplica el easing al progreso. */
export class Tween {
  private readonly dur: number
  private readonly ease: EaseFn
  elapsed = 0
  done = false

  constructor(dur: number, ease: EaseFn = Ease.linear) {
    this.dur = dur
    this.ease = ease
  }

  update(dt: number) {
    if (this.done) return
    this.elapsed += dt
    if (this.elapsed >= this.dur) {
      this.elapsed = this.dur
      this.done = true
    }
  }

  get value() {
    return this.ease(this.dur === 0 ? 1 : this.elapsed / this.dur)
  }

  reset() {
    this.elapsed = 0
    this.done = false
  }
}
