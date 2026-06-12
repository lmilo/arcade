import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const GRID = 9
const MINES = 10
const CELL = 40
const PAD = 10
const HUD_TOP = 46
const NUM_COLORS = ['', '#60a5fa', '#22c55e', '#ef4444', '#a855f7', '#fb923c', '#22d3ee', '#e2e8f0', '#94a3b8']

interface Cell {
  mine: boolean
  revealed: boolean
  flagged: boolean
  adj: number
}

export class Minesweeper extends Game {
  readonly width = GRID * CELL + PAD * 2
  readonly height = HUD_TOP + GRID * CELL + PAD

  private cells: Cell[] = []
  private placed = false
  private flagMode = false
  private revealedCount = 0
  private score = 0
  private alive = true
  private started = false

  private readonly particles = new Particles()
  private readonly shake = new Shake(10)

  constructor(emit: Emit, _size: BoardSize) {
    super(emit)
    void _size
    this.reset()
  }

  reset() {
    this.cells = Array.from({ length: GRID * GRID }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 }))
    this.placed = false
    this.flagMode = false
    this.revealedCount = 0
    this.score = 0
    this.alive = true
    this.started = false
    this.particles.clear()
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

    const tap = input.consumeTap()
    if (tap) this.handleTap(tap.x, tap.y)
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, this.width, this.height)

    // HUD: toggle de bandera + minas restantes.
    ctx.fillStyle = this.flagMode ? PALETTE.warning : PALETTE.card
    ctx.beginPath()
    ctx.roundRect(PAD, 8, 132, 30, 8)
    ctx.fill()
    ctx.fillStyle = this.flagMode ? '#0f0f1a' : PALETTE.text
    ctx.font = '700 13px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`🚩 Bandera: ${this.flagMode ? 'ON' : 'OFF'}`, PAD + 10, 23)

    const flags = this.cells.filter((c) => c.flagged).length
    ctx.fillStyle = PALETTE.muted
    ctx.textAlign = 'right'
    ctx.fillText(`💣 ${MINES - flags}`, this.width - PAD, 23)

    this.shake.begin(ctx)
    this.cells.forEach((c, i) => {
      const x = PAD + (i % GRID) * CELL
      const y = HUD_TOP + Math.floor(i / GRID) * CELL
      ctx.fillStyle = c.revealed ? '#15151f' : '#2a2a3d'
      ctx.beginPath()
      ctx.roundRect(x + 1, y + 1, CELL - 2, CELL - 2, 5)
      ctx.fill()

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (c.revealed) {
        if (c.mine) {
          ctx.font = '20px system-ui'
          ctx.fillText('💣', x + CELL / 2, y + CELL / 2 + 1)
        } else if (c.adj > 0) {
          ctx.fillStyle = NUM_COLORS[c.adj]
          ctx.font = '700 18px system-ui, sans-serif'
          ctx.fillText(String(c.adj), x + CELL / 2, y + CELL / 2 + 1)
        }
      } else if (c.flagged) {
        ctx.font = '18px system-ui'
        ctx.fillText('🚩', x + CELL / 2, y + CELL / 2 + 1)
      }
    })
    this.particles.render(ctx)
    this.shake.end(ctx)
  }

  // --- mecánica ---

  private handleTap(nx: number, ny: number) {
    const px = nx * this.width
    const py = ny * this.height
    if (py < HUD_TOP) {
      if (px >= PAD && px <= PAD + 132 && py >= 8 && py <= 38) this.flagMode = !this.flagMode
      return
    }
    const col = Math.floor((px - PAD) / CELL)
    const row = Math.floor((py - HUD_TOP) / CELL)
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return
    const idx = row * GRID + col
    const cell = this.cells[idx]

    if (this.flagMode) {
      if (!cell.revealed) {
        cell.flagged = !cell.flagged
        audio.play('move')
      }
      return
    }
    if (cell.flagged || cell.revealed) return

    if (!this.placed) this.placeMines(idx)

    if (cell.mine) {
      this.loseAt(idx)
      return
    }
    this.flood(idx)
    audio.play('move')
    this.score = this.revealedCount
    this.emit({ type: 'score', value: this.score })
    if (this.revealedCount === GRID * GRID - MINES) this.win()
  }

  private placeMines(safe: number) {
    const forbidden = new Set([safe, ...this.neighbors(safe)])
    let placed = 0
    while (placed < MINES) {
      const i = Math.floor(Math.random() * GRID * GRID)
      if (forbidden.has(i) || this.cells[i].mine) continue
      this.cells[i].mine = true
      placed++
    }
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].adj = this.neighbors(i).filter((n) => this.cells[n].mine).length
    }
    this.placed = true
  }

  private flood(start: number) {
    const stack = [start]
    while (stack.length) {
      const i = stack.pop() as number
      const c = this.cells[i]
      if (c.revealed || c.flagged || c.mine) continue
      c.revealed = true
      this.revealedCount++
      if (c.adj === 0) stack.push(...this.neighbors(i))
    }
  }

  private neighbors(i: number): number[] {
    const r = Math.floor(i / GRID)
    const c = i % GRID
    const out: number[] = []
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = r + dr
        const nc = c + dc
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) out.push(nr * GRID + nc)
      }
    }
    return out
  }

  private loseAt(idx: number) {
    for (const c of this.cells) if (c.mine) c.revealed = true
    this.alive = false
    this.shake.add(0.8)
    const x = PAD + (idx % GRID) * CELL + CELL / 2
    const y = HUD_TOP + Math.floor(idx / GRID) * CELL + CELL / 2
    this.particles.burst(x, y, { count: 24, color: ['#ef4444', '#fb923c', '#ffffff'], speed: 200, life: 0.7 })
    audio.play('die')
    this.emit({ type: 'gameover', score: this.score })
    this.emit({ type: 'state', state: 'over' })
  }

  private win() {
    this.score = (GRID * GRID - MINES) + 100
    this.alive = false
    audio.play('win')
    this.emit({ type: 'score', value: this.score })
    this.emit({ type: 'gameover', score: this.score })
    this.emit({ type: 'state', state: 'over' })
  }
}
