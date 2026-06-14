import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const PAD = 10
const HUD_TOP = 46
const NUM_COLORS = ['', '#60a5fa', '#22c55e', '#ef4444', '#a855f7', '#fb923c', '#22d3ee', '#e2e8f0', '#94a3b8']
const REVEAL_STEP = 0.1

const DIFF: Record<BoardSize, { grid: number; mines: number; cell: number }> = {
  small: { grid: 9, mines: 10, cell: 38 },
  normal: { grid: 13, mines: 28, cell: 30 },
  large: { grid: 16, mines: 45, cell: 26 },
}

interface Cell {
  mine: boolean
  revealed: boolean
  flagged: boolean
  adj: number
}

export class Minesweeper extends Game {
  readonly width: number
  readonly height: number
  private readonly n: number
  private readonly mines: number
  private readonly cell: number

  private cells: Cell[] = []
  private placed = false
  private flagMode = false
  private revealedCount = 0
  private score = 0
  private dying = false
  private revealQueue: number[] = []
  private revealTimer = 0
  private alive = true
  private started = false

  private readonly particles = new Particles()
  private readonly shake = new Shake(10)

  constructor(emit: Emit, size: BoardSize) {
    super(emit)
    const d = DIFF[size]
    this.n = d.grid
    this.mines = d.mines
    this.cell = d.cell
    this.width = this.n * this.cell + PAD * 2
    this.height = HUD_TOP + this.n * this.cell + PAD
    this.reset()
  }

  reset() {
    this.cells = Array.from({ length: this.n * this.n }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 }))
    this.placed = false
    this.flagMode = false
    this.revealedCount = 0
    this.score = 0
    this.dying = false
    this.revealQueue = []
    this.revealTimer = 0
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

    if (!this.alive) return
    if (!this.started) {
      if (input.consumeAction()) this.start()
      input.consumeTap()
      return
    }

    if (this.dying) {
      input.consumeTap()
      input.consumeSecondaryTap()
      this.revealTimer -= dt
      if (this.revealTimer <= 0) this.revealNextMine()
      return
    }

    const tap = input.consumeTap()
    if (tap) this.handleReveal(tap.x, tap.y)
    const sec = input.consumeSecondaryTap()
    if (sec) this.toggleFlagAt(sec.x, sec.y)
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.fillStyle = this.flagMode ? PALETTE.warning : PALETTE.card
    ctx.beginPath()
    ctx.roundRect(PAD, 8, 150, 30, 8)
    ctx.fill()
    ctx.fillStyle = this.flagMode ? '#0f0f1a' : PALETTE.text
    ctx.font = '700 13px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`🚩 Modo bandera: ${this.flagMode ? 'ON' : 'OFF'}`, PAD + 10, 23)

    const flags = this.cells.filter((c) => c.flagged).length
    ctx.fillStyle = PALETTE.muted
    ctx.textAlign = 'right'
    ctx.fillText(`💣 ${this.mines - flags}`, this.width - PAD, 23)

    this.shake.begin(ctx)
    this.cells.forEach((c, i) => {
      const x = PAD + (i % this.n) * this.cell
      const y = HUD_TOP + Math.floor(i / this.n) * this.cell
      ctx.fillStyle = c.revealed ? '#15151f' : '#2a2a3d'
      ctx.beginPath()
      ctx.roundRect(x + 1, y + 1, this.cell - 2, this.cell - 2, 5)
      ctx.fill()

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const fs = this.cell * 0.45
      if (c.revealed) {
        if (c.mine) {
          ctx.font = `${this.cell * 0.5}px system-ui`
          ctx.fillText('💣', x + this.cell / 2, y + this.cell / 2 + 1)
        } else if (c.adj > 0) {
          ctx.fillStyle = NUM_COLORS[c.adj]
          ctx.font = `700 ${fs}px system-ui, sans-serif`
          ctx.fillText(String(c.adj), x + this.cell / 2, y + this.cell / 2 + 1)
        }
      } else if (c.flagged) {
        ctx.font = `${this.cell * 0.45}px system-ui`
        ctx.fillText('🚩', x + this.cell / 2, y + this.cell / 2 + 1)
      }
    })
    this.particles.render(ctx)
    this.shake.end(ctx)
  }

  // --- mecánica ---

  private cellAt(nx: number, ny: number): number {
    const px = nx * this.width
    const py = ny * this.height
    if (py < HUD_TOP) return -2 // zona HUD
    const col = Math.floor((px - PAD) / this.cell)
    const row = Math.floor((py - HUD_TOP) / this.cell)
    if (col < 0 || col >= this.n || row < 0 || row >= this.n) return -1
    return row * this.n + col
  }

  private handleReveal(nx: number, ny: number) {
    const idx = this.cellAt(nx, ny)
    if (idx === -2) {
      const px = nx * this.width
      if (px >= PAD && px <= PAD + 150) this.flagMode = !this.flagMode
      return
    }
    if (idx < 0) return
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
      this.beginDying(idx)
      return
    }
    this.flood(idx)
    audio.play('move')
    this.score = this.revealedCount
    this.emit({ type: 'score', value: this.score })
    if (this.revealedCount === this.n * this.n - this.mines) this.win()
  }

  private toggleFlagAt(nx: number, ny: number) {
    const idx = this.cellAt(nx, ny)
    if (idx < 0) return
    const cell = this.cells[idx]
    if (cell.revealed) return
    cell.flagged = !cell.flagged
    audio.play('move')
  }

  private placeMines(safe: number) {
    const forbidden = new Set([safe, ...this.neighbors(safe)])
    let placed = 0
    while (placed < this.mines) {
      const i = Math.floor(Math.random() * this.n * this.n)
      if (forbidden.has(i) || this.cells[i].mine) continue
      this.cells[i].mine = true
      placed++
    }
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].adj = this.neighbors(i).filter((nn) => this.cells[nn].mine).length
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
    const r = Math.floor(i / this.n)
    const c = i % this.n
    const out: number[] = []
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = r + dr
        const nc = c + dc
        if (nr >= 0 && nr < this.n && nc >= 0 && nc < this.n) out.push(nr * this.n + nc)
      }
    }
    return out
  }

  private beginDying(hit: number) {
    this.dying = true
    this.score = this.revealedCount
    this.cells[hit].revealed = true
    this.shake.add(0.7)
    audio.play('die')
    this.boom(hit)
    // El resto de minas se revelan una a una.
    this.revealQueue = this.cells
      .map((c, i) => (c.mine && !c.revealed ? i : -1))
      .filter((i) => i >= 0)
    for (let i = this.revealQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.revealQueue[i], this.revealQueue[j]] = [this.revealQueue[j], this.revealQueue[i]]
    }
    this.revealTimer = REVEAL_STEP
  }

  private revealNextMine() {
    const idx = this.revealQueue.shift()
    if (idx === undefined) {
      this.alive = false
      this.emit({ type: 'gameover', score: this.score, won: false })
      this.emit({ type: 'state', state: 'over' })
      return
    }
    this.cells[idx].revealed = true
    this.boom(idx)
    audio.play('lock')
    this.revealTimer = REVEAL_STEP
  }

  private boom(idx: number) {
    const x = PAD + (idx % this.n) * this.cell + this.cell / 2
    const y = HUD_TOP + Math.floor(idx / this.n) * this.cell + this.cell / 2
    this.particles.burst(x, y, { count: 10, color: ['#ef4444', '#fb923c', '#ffffff'], speed: 150, life: 0.5 })
  }

  private win() {
    this.score = this.n * this.n - this.mines + 100
    this.alive = false
    audio.play('win')
    this.emit({ type: 'score', value: this.score })
    this.emit({ type: 'gameover', score: this.score, won: true })
    this.emit({ type: 'state', state: 'over' })
  }
}
