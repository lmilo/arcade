/**
 * Screen shake basado en "trauma": los eventos suman trauma (0..1) y se decae con el
 * tiempo. El desplazamiento crece con el cuadrado del trauma para un golpe seco que
 * se calma rápido. Uso: shake.update(dt) en el tick, y envolver el render con begin/end.
 */
export class Shake {
  private trauma = 0
  private readonly maxOffset: number
  private readonly decay: number
  private offsetX = 0
  private offsetY = 0

  constructor(maxOffset = 14, decay = 1.8) {
    this.maxOffset = maxOffset
    this.decay = decay
  }

  add(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount)
  }

  update(dt: number) {
    this.trauma = Math.max(0, this.trauma - this.decay * dt)
  }

  begin(ctx: CanvasRenderingContext2D) {
    const shake = this.trauma * this.trauma
    this.offsetX = (Math.random() * 2 - 1) * this.maxOffset * shake
    this.offsetY = (Math.random() * 2 - 1) * this.maxOffset * shake
    ctx.save()
    ctx.translate(this.offsetX, this.offsetY)
  }

  end(ctx: CanvasRenderingContext2D) {
    ctx.restore()
  }
}
