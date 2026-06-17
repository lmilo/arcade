import type { Dir } from './types'

const KEY_TO_DIR: Record<string, Dir> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
}

const ACTION_KEYS = new Set(['Space', 'Enter', 'KeyR'])
const SWIPE_THRESHOLD = 24

/**
 * Entrada unificada teclado + táctil. Las direcciones se encolan (input buffering)
 * para que un giro rápido no se pierda entre ticks; las acciones (espacio/toque corto)
 * se consumen de a una.
 */
export class Input {
  private down = new Set<string>()
  private dirQueue: Dir[] = []
  private actionQueued = false
  private tapQueue: { x: number; y: number }[] = []
  private secondaryTapQueue: { x: number; y: number }[] = []
  private locked = false
  private touchStart: { x: number; y: number } | null = null
  private target: HTMLElement | null = null
  private surface: HTMLElement | null = null
  private pointer: number | null = null

  /**
   * @param target  elemento que recibe eventos táctiles/puntero (normalmente el wrap).
   * @param surface elemento contra el que se normaliza la X del puntero (el canvas).
   */
  attach(target: HTMLElement, surface?: HTMLElement) {
    this.target = target
    this.surface = surface ?? target
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    target.addEventListener('touchstart', this.onTouchStart, { passive: false })
    target.addEventListener('touchend', this.onTouchEnd, { passive: false })
    target.addEventListener('touchmove', this.onTouchMove, { passive: false })
    target.addEventListener('mousemove', this.onMouseMove)
    target.addEventListener('mousedown', this.onMouseDown)
    target.addEventListener('contextmenu', this.onContextMenu)
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    if (this.target) {
      this.target.removeEventListener('touchstart', this.onTouchStart)
      this.target.removeEventListener('touchend', this.onTouchEnd)
      this.target.removeEventListener('touchmove', this.onTouchMove)
      this.target.removeEventListener('mousemove', this.onMouseMove)
      this.target.removeEventListener('mousedown', this.onMouseDown)
      this.target.removeEventListener('contextmenu', this.onContextMenu)
    }
    this.target = null
    this.surface = null
  }

  isDown(code: string) {
    return this.locked ? false : this.down.has(code)
  }

  /** Bloquea la entrada (p. ej. en game-over) para evitar reinicios por un clic colado. */
  setLocked(v: boolean) {
    this.locked = v
    this.clearPending()
  }

  clearPending() {
    this.dirQueue.length = 0
    this.tapQueue.length = 0
    this.secondaryTapQueue.length = 0
    this.actionQueued = false
  }

  /** X del puntero normalizada al ancho del canvas (0..1), o null si no hay puntero. */
  pointerX(): number | null {
    return this.pointer
  }

  nextDir(): Dir | null {
    if (this.locked) return null
    return this.dirQueue.shift() ?? null
  }

  consumeAction(): boolean {
    if (this.locked) return false
    if (this.actionQueued) {
      this.actionQueued = false
      return true
    }
    return false
  }

  /** Próximo toque/clic como coordenadas normalizadas (0..1) sobre el canvas, o null. */
  consumeTap(): { x: number; y: number } | null {
    if (this.locked) return null
    return this.tapQueue.shift() ?? null
  }

  /** Próximo clic derecho (o equivalente) como coordenadas normalizadas, o null. */
  consumeSecondaryTap(): { x: number; y: number } | null {
    if (this.locked) return null
    return this.secondaryTapQueue.shift() ?? null
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const dir = KEY_TO_DIR[e.code]
    if (dir) {
      this.dirQueue.push(dir)
      // El teclado toma el control del movimiento: el puntero deja de mandar
      // hasta que se vuelva a mover el mouse/dedo (evita que el mouse lo "pise").
      this.pointer = null
      e.preventDefault()
    } else if (ACTION_KEYS.has(e.code)) {
      this.actionQueued = true
      e.preventDefault()
    }
    this.down.add(e.code)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code)
  }

  private onTouchStart = (e: TouchEvent) => {
    const t = e.changedTouches[0]
    this.touchStart = { x: t.clientX, y: t.clientY }
  }

  private onTouchEnd = (e: TouchEvent) => {
    if (!this.touchStart) return
    const t = e.changedTouches[0]
    const dx = t.clientX - this.touchStart.x
    const dy = t.clientY - this.touchStart.y
    this.touchStart = null

    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
      this.actionQueued = true
      const pos = this.normPos(t.clientX, t.clientY)
      if (pos) this.tapQueue.push(pos)
      return
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      this.dirQueue.push(dx > 0 ? 'right' : 'left')
    } else {
      this.dirQueue.push(dy > 0 ? 'down' : 'up')
    }
  }

  private onTouchMove = (e: TouchEvent) => {
    this.updatePointer(e.touches[0].clientX)
    e.preventDefault()
  }

  private onMouseMove = (e: MouseEvent) => {
    this.updatePointer(e.clientX)
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    this.actionQueued = true
    const pos = this.normPos(e.clientX, e.clientY)
    if (pos) this.tapQueue.push(pos)
  }

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    const pos = this.normPos(e.clientX, e.clientY)
    if (pos) this.secondaryTapQueue.push(pos)
  }

  private updatePointer(clientX: number) {
    if (!this.surface) return
    const r = this.surface.getBoundingClientRect()
    if (r.width === 0) return
    this.pointer = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
  }

  private normPos(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.surface) return null
    const r = this.surface.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return null
    return {
      x: Math.max(0, Math.min(1, (clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (clientY - r.top) / r.height)),
    }
  }
}
