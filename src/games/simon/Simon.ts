import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import type { Sfx } from '../../engine/Audio'

const SIZE = 360
const LIT_DUR = 0.45
const GAP_DUR = 0.22
const PRESS_DUR = 0.18

const QUAD_COLORS = ['#22c55e', '#ef4444', '#fbbf24', '#3b82f6']
const QUAD_DIM = ['#14532d', '#7f1d1d', '#78350f', '#1e3a8a']
const QUAD_SFX: Sfx[] = ['bounce', 'eat', 'rotate', 'move']

type Phase = 'show' | 'input'

export class Simon extends Game {
  readonly width = SIZE
  readonly height = SIZE

  private seq: number[] = []
  private phase: Phase = 'show'
  private showIdx = 0
  private showTimer = 0
  private lit = -1
  private flashTimer = 0
  private inputIdx = 0
  private score = 0
  private alive = true
  private started = false

  constructor(emit: Emit, _size: BoardSize) {
    super(emit)
    void _size
    this.reset()
  }

  reset() {
    this.seq = []
    this.phase = 'show'
    this.showIdx = 0
    this.showTimer = 0
    this.lit = -1
    this.flashTimer = 0
    this.inputIdx = 0
    this.score = 0
    this.alive = true
    this.started = false
    this.emit({ type: 'score', value: 0 })
    this.emit({ type: 'state', state: 'ready' })
  }

  start() {
    if (this.started || !this.alive) return
    this.started = true
    audio.play('start')
    this.emit({ type: 'state', state: 'playing' })
    this.seq = [Math.floor(Math.random() * 4)]
    this.beginShow()
  }

  update(dt: number, input: Input) {
    if (!this.alive) {
      if (input.consumeAction()) {
        this.reset()
        this.start()
      }
      input.consumeTap()
      return
    }
    if (!this.started) {
      if (input.consumeAction()) this.start()
      input.consumeTap()
      return
    }

    if (this.phase === 'show') {
      this.updateShow(dt)
      input.consumeTap()
      return
    }

    // input
    if (this.flashTimer > 0) {
      this.flashTimer -= dt
      if (this.flashTimer <= 0) this.lit = -1
    }
    const tap = input.consumeTap()
    if (tap) this.press(this.quadAt(tap.x, tap.y))
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, SIZE, SIZE)

    const half = SIZE / 2
    const gap = 6
    for (let q = 0; q < 4; q++) {
      const x = (q % 2) * half
      const y = Math.floor(q / 2) * half
      ctx.fillStyle = this.lit === q ? QUAD_COLORS[q] : QUAD_DIM[q]
      ctx.beginPath()
      ctx.roundRect(x + gap, y + gap, half - gap * 2, half - gap * 2, 14)
      ctx.fill()
    }

    ctx.fillStyle = 'rgba(15,15,26,0.85)'
    ctx.beginPath()
    ctx.arc(half, half, 52, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = PALETTE.text
    ctx.font = '800 30px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(this.score), half, half - 6)
    ctx.fillStyle = PALETTE.muted
    ctx.font = '600 11px system-ui, sans-serif'
    ctx.fillText(this.phase === 'show' ? 'observa' : 'repite', half, half + 16)
  }

  // --- mecánica ---

  private beginShow() {
    this.phase = 'show'
    this.showIdx = 0
    this.lit = -1
    this.showTimer = 0.5
  }

  private updateShow(dt: number) {
    this.showTimer -= dt
    if (this.showTimer > 0) return
    if (this.lit >= 0) {
      this.lit = -1
      this.showTimer = GAP_DUR
      return
    }
    if (this.showIdx < this.seq.length) {
      this.lit = this.seq[this.showIdx]
      audio.play(QUAD_SFX[this.lit])
      this.showIdx++
      this.showTimer = LIT_DUR
    } else {
      this.phase = 'input'
      this.inputIdx = 0
      this.lit = -1
    }
  }

  private press(q: number) {
    if (q < 0) return
    this.lit = q
    this.flashTimer = PRESS_DUR
    audio.play(QUAD_SFX[q])

    if (q === this.seq[this.inputIdx]) {
      this.inputIdx++
      if (this.inputIdx === this.seq.length) {
        this.score += 1
        this.emit({ type: 'score', value: this.score })
        this.seq.push(Math.floor(Math.random() * 4))
        this.beginShow()
      }
    } else {
      this.alive = false
      audio.play('die')
      this.emit({ type: 'gameover', score: this.score })
      this.emit({ type: 'state', state: 'over' })
    }
  }

  private quadAt(nx: number, ny: number): number {
    const col = nx < 0.5 ? 0 : 1
    const row = ny < 0.5 ? 0 : 1
    return row * 2 + col
  }
}
