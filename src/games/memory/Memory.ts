import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'

const W = 460
const H = 520
const HUD_TOP = 40
const GAP = 8
const PAD = 12
const MISMATCH_DELAY = 0.7
const START_ERRORS = 5
const MAX_ERRORS = 8

// Suficientes símbolos para el tablero más grande (24 parejas).
const SYMBOLS = [
  '🍎', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑', '🍍', '🍉', '🍊', '🫐', '🥥',
  '🍅', '🥕', '🌽', '🍄', '⭐', '🌙', '⚡', '🔥', '💎', '🎈', '🎲', '🚀',
]

// Distribución del tablero por nivel (columnas × filas). Se estanca en el último.
const LAYOUTS: { c: number; r: number }[] = [
  { c: 4, r: 4 },
  { c: 4, r: 6 },
  { c: 6, r: 6 },
  { c: 6, r: 8 },
]

interface Card {
  symbol: string
  matched: boolean
  faceUp: boolean
  flip: number
}

export class Memory extends Game {
  readonly width = W
  readonly height = H

  private cols = 4
  private rows = 4
  private cell = 80
  private originX = 0
  private originY = 0

  private cards: Card[] = []
  private first: number | null = null
  private lockTimer = 0
  private level = 1
  private errors = START_ERRORS
  private matched = 0
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
    this.level = 1
    this.errors = START_ERRORS
    this.score = 0
    this.alive = true
    this.started = false
    this.particles.clear()
    this.buildBoard()
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
    for (const c of this.cards) {
      const target = c.faceUp || c.matched ? 1 : 0
      c.flip += Math.sign(target - c.flip) * Math.min(Math.abs(target - c.flip), dt * 8)
    }

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

    if (this.lockTimer > 0) {
      this.lockTimer -= dt
      if (this.lockTimer <= 0) this.hideUnmatched()
      input.consumeTap()
      return
    }

    const tap = input.consumeTap()
    if (tap) this.handleTap(tap.x, tap.y)
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, W, H)

    // HUD: nivel + errores restantes (corazones).
    ctx.fillStyle = PALETTE.muted
    ctx.font = '700 14px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`NIVEL ${this.level}`, 14, HUD_TOP / 2)
    ctx.textAlign = 'right'
    ctx.fillText('❤'.repeat(this.errors) || '—', W - 14, HUD_TOP / 2)

    this.cards.forEach((c, i) => {
      const px = this.cardX(i)
      const py = this.cardY(i)
      const cx = px + this.cell / 2
      const scaleX = Math.abs(c.flip - 0.5) * 2
      const w = this.cell * scaleX
      const showFace = c.flip >= 0.5

      ctx.fillStyle = showFace ? (c.matched ? 'rgba(34,197,94,0.18)' : '#1e1e2e') : PALETTE.accent
      ctx.beginPath()
      ctx.roundRect(cx - w / 2, py, w, this.cell, 10)
      ctx.fill()
      if (c.matched) {
        ctx.strokeStyle = PALETTE.success
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(cx - w / 2, py, w, this.cell, 10)
        ctx.stroke()
      }

      if (scaleX > 0.3) {
        ctx.save()
        ctx.translate(cx, py + this.cell / 2)
        ctx.scale(scaleX, 1)
        if (showFace) {
          ctx.font = `${this.cell * 0.5}px system-ui, sans-serif`
          ctx.fillStyle = '#fff'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(c.symbol, 0, 2)
        } else {
          ctx.font = `700 ${this.cell * 0.4}px system-ui, sans-serif`
          ctx.fillStyle = 'rgba(255,255,255,0.5)'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('?', 0, 2)
        }
        ctx.restore()
      }
    })

    this.particles.render(ctx)
  }

  // --- mecánica ---

  private buildBoard() {
    const layout = LAYOUTS[Math.min(this.level - 1, LAYOUTS.length - 1)]
    this.cols = layout.c
    this.rows = layout.r

    const availW = W - PAD * 2
    const availH = H - HUD_TOP - PAD
    this.cell = Math.min(
      (availW - (this.cols - 1) * GAP) / this.cols,
      (availH - (this.rows - 1) * GAP) / this.rows,
    )
    const gridW = this.cols * this.cell + (this.cols - 1) * GAP
    const gridH = this.rows * this.cell + (this.rows - 1) * GAP
    this.originX = (W - gridW) / 2
    this.originY = HUD_TOP + (availH - gridH) / 2

    const pairs = (this.cols * this.rows) / 2
    const chosen = SYMBOLS.slice(0, pairs)
    const deck = [...chosen, ...chosen]
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }
    this.cards = deck.map((symbol) => ({ symbol, matched: false, faceUp: false, flip: 0 }))
    this.first = null
    this.lockTimer = 0
    this.matched = 0
  }

  private handleTap(nx: number, ny: number) {
    const x = nx * W
    const y = ny * H
    const col = Math.floor((x - this.originX) / (this.cell + GAP))
    const row = Math.floor((y - this.originY) / (this.cell + GAP))
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return
    const idx = row * this.cols + col
    const card = this.cards[idx]
    if (!card || card.matched || card.faceUp) return

    card.faceUp = true
    audio.play('move')

    if (this.first === null) {
      this.first = idx
      return
    }

    const a = this.cards[this.first]
    if (a.symbol === card.symbol) {
      a.matched = true
      card.matched = true
      this.matched += 1
      this.score += 50 * this.level
      this.particles.burst(this.cardX(idx) + this.cell / 2, this.cardY(idx) + this.cell / 2, {
        count: 10,
        color: [PALETTE.success, '#ffffff'],
        speed: 130,
        life: 0.5,
      })
      audio.play('merge')
      this.emit({ type: 'score', value: this.score })
      this.first = null
      if (this.matched === (this.cols * this.rows) / 2) this.levelUp()
    } else {
      this.errors -= 1
      audio.play('lock')
      if (this.errors <= 0) {
        this.gameOver()
        return
      }
      this.lockTimer = MISMATCH_DELAY
    }
  }

  private levelUp() {
    this.score += 200 * this.level
    this.level += 1
    this.errors = Math.min(MAX_ERRORS, this.errors + 1)
    audio.play('win')
    this.emit({ type: 'score', value: this.score })
    this.buildBoard()
  }

  private hideUnmatched() {
    for (const c of this.cards) if (!c.matched) c.faceUp = false
    this.first = null
  }

  private gameOver() {
    this.alive = false
    audio.play('die')
    this.emit({ type: 'gameover', score: this.score })
    this.emit({ type: 'state', state: 'over' })
  }

  private cardX(i: number) {
    return this.originX + (i % this.cols) * (this.cell + GAP)
  }

  private cardY(i: number) {
    return this.originY + Math.floor(i / this.cols) * (this.cell + GAP)
  }
}
