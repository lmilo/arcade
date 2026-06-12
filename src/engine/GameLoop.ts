export type UpdateFn = (dt: number) => void
export type RenderFn = () => void

/**
 * Bucle con paso fijo (acumulador): la lógica avanza en pasos deterministas
 * y el render se dispara una vez por frame. Desacopla la simulación del refresco.
 */
export class GameLoop {
  private readonly onUpdate: UpdateFn
  private readonly onRender: RenderFn
  private readonly step: number
  private rafId = 0
  private last = 0
  private acc = 0
  private running = false

  constructor(onUpdate: UpdateFn, onRender: RenderFn, fps = 60) {
    this.onUpdate = onUpdate
    this.onRender = onRender
    this.step = 1 / fps
  }

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.acc = 0
    this.rafId = requestAnimationFrame(this.frame)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.rafId)
  }

  private frame = (now: number) => {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.frame)

    let delta = (now - this.last) / 1000
    this.last = now
    // Evita el "spiral of death" al volver de una pestaña inactiva.
    if (delta > 0.25) delta = 0.25

    this.acc += delta
    while (this.acc >= this.step) {
      this.onUpdate(this.step)
      this.acc -= this.step
    }
    this.onRender()
  }
}
