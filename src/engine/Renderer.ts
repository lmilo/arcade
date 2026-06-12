/**
 * Adapta un canvas a su contenedor manteniendo la proporción lógica del juego,
 * con soporte de devicePixelRatio para que se vea nítido en pantallas HiDPI.
 * El juego siempre dibuja en coordenadas lógicas (width/height), el resto es escala.
 */
export class Renderer {
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  private readonly logicalW: number
  private readonly logicalH: number

  constructor(canvas: HTMLCanvasElement, logicalW: number, logicalH: number) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D no disponible en este navegador')
    this.canvas = canvas
    this.ctx = ctx
    this.logicalW = logicalW
    this.logicalH = logicalH
  }

  fit(maxW: number, maxH: number) {
    const dpr = window.devicePixelRatio || 1
    const scale = Math.max(0.1, Math.min(maxW / this.logicalW, maxH / this.logicalH))
    const cssW = Math.floor(this.logicalW * scale)
    const cssH = Math.floor(this.logicalH * scale)

    this.canvas.style.width = `${cssW}px`
    this.canvas.style.height = `${cssH}px`
    this.canvas.width = Math.floor(cssW * dpr)
    this.canvas.height = Math.floor(cssH * dpr)
    this.ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0)
  }
}
