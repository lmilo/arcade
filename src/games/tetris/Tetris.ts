import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'

const COLS = 10
const ROWS = 20
const CELL = 24
const PANEL_COLS = 5
const CLEAR_DUR = 0.26
const LINE_SCORES = [0, 100, 300, 500, 800]

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

const BOX: Record<PieceType, number> = { I: 4, O: 2, T: 3, S: 3, Z: 3, J: 3, L: 3 }
const BASE: Record<PieceType, [number, number][]> = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]],
}
const COLORS: Record<PieceType, string> = {
  I: '#22d3ee',
  O: '#fbbf24',
  T: '#a855f7',
  S: '#22c55e',
  Z: '#ef4444',
  J: '#3b82f6',
  L: '#fb923c',
}
const TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
const KICKS = [-1, 1, -2, 2]
const HOLD_KEYS = ['KeyC', 'ShiftLeft', 'ShiftRight']

interface Piece {
  type: PieceType
  rot: number
  x: number
  y: number
}

export class Tetris extends Game {
  readonly width: number
  readonly height: number
  private readonly boardW: number

  private board: (PieceType | null)[][] = []
  private piece: Piece = { type: 'T', rot: 0, x: 3, y: 0 }
  private nextType: PieceType = 'T'
  private held: PieceType | null = null
  private holdUsed = false
  private holdDown = false
  private bag: PieceType[] = []
  private gravTimer = 0
  private gravityInterval = 0.8
  private score = 0
  private lines = 0
  private level = 1
  private alive = true
  private started = false
  private clearRows: number[] = []
  private clearTimer = 0

  private readonly particles = new Particles()
  private readonly shake = new Shake(12)

  constructor(emit: Emit, _size: BoardSize) {
    super(emit)
    void _size
    this.boardW = COLS * CELL
    this.width = (COLS + PANEL_COLS) * CELL
    this.height = ROWS * CELL
    this.reset()
  }

  reset() {
    this.board = Array.from({ length: ROWS }, () => Array<PieceType | null>(COLS).fill(null))
    this.bag = []
    this.held = null
    this.holdUsed = false
    this.gravTimer = 0
    this.gravityInterval = 0.8
    this.score = 0
    this.lines = 0
    this.level = 1
    this.alive = true
    this.started = false
    this.clearRows = []
    this.clearTimer = 0
    this.particles.clear()
    this.nextType = this.drawFromBag()
    this.spawn()
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
      return
    }
    if (!this.started) {
      if (input.consumeAction()) this.start()
      return
    }

    if (this.clearRows.length > 0) {
      this.clearTimer -= dt
      if (this.clearTimer <= 0) this.finishClear()
      return
    }

    let d: ReturnType<Input['nextDir']>
    while ((d = input.nextDir()) !== null) {
      if (d === 'left') this.tryMove(-1, 0)
      else if (d === 'right') this.tryMove(1, 0)
      else if (d === 'up') this.tryRotate()
    }
    if (input.consumeAction()) this.hardDrop()

    const holdDown = HOLD_KEYS.some((k) => input.isDown(k))
    if (holdDown && !this.holdDown) this.doHold()
    this.holdDown = holdDown

    const soft = input.isDown('ArrowDown') || input.isDown('KeyS')
    const interval = soft ? Math.min(0.05, this.gravityInterval) : this.gravityInterval
    this.gravTimer += dt
    if (this.gravTimer >= interval) {
      this.gravTimer = 0
      if (soft) audio.play('move')
      if (!this.tryMove(0, 1)) this.lock()
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, this.width, this.height)

    this.shake.begin(ctx)

    // Playfield.
    ctx.fillStyle = 'rgba(255,255,255,0.02)'
    ctx.fillRect(0, 0, this.boardW, this.height)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.moveTo(this.boardW, 0)
    ctx.lineTo(this.boardW, this.height)
    ctx.stroke()

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = this.board[y][x]
        if (c) this.drawBlock(ctx, x * CELL, y * CELL, CELL, COLORS[c], 1)
      }
    }

    if (this.clearRows.length > 0) {
      const a = 0.4 + 0.6 * Math.abs(Math.sin((this.clearTimer / CLEAR_DUR) * Math.PI * 3))
      ctx.fillStyle = `rgba(255,255,255,${a})`
      for (const row of this.clearRows) ctx.fillRect(0, row * CELL, this.boardW, CELL)
    } else if (this.alive) {
      const ghostY = this.ghostY()
      for (const [cx, cy] of this.cells(this.piece)) {
        const gy = cy - this.piece.y + ghostY
        if (gy >= 0) this.drawBlock(ctx, cx * CELL, gy * CELL, CELL, COLORS[this.piece.type], 0.15)
      }
      for (const [cx, cy] of this.cells(this.piece)) {
        if (cy >= 0) this.drawBlock(ctx, cx * CELL, cy * CELL, CELL, COLORS[this.piece.type], 1)
      }
    }

    this.drawPanel(ctx)

    this.particles.render(ctx)
    this.shake.end(ctx)
  }

  // --- mecánica ---

  private cells(p: Piece): [number, number][] {
    const n = BOX[p.type]
    let cs = BASE[p.type].map(([x, y]) => [x, y] as [number, number])
    for (let r = 0; r < p.rot; r++) cs = cs.map(([x, y]) => [n - 1 - y, x] as [number, number])
    return cs.map(([x, y]) => [p.x + x, p.y + y] as [number, number])
  }

  private collides(cells: [number, number][]): boolean {
    return cells.some(([x, y]) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && this.board[y][x] !== null))
  }

  private tryMove(dx: number, dy: number): boolean {
    const moved: Piece = { ...this.piece, x: this.piece.x + dx, y: this.piece.y + dy }
    if (this.collides(this.cells(moved))) return false
    this.piece = moved
    if (dx !== 0) audio.play('move')
    return true
  }

  private tryRotate() {
    const rotated: Piece = { ...this.piece, rot: (this.piece.rot + 1) % 4 }
    if (!this.collides(this.cells(rotated))) {
      this.piece = rotated
      audio.play('rotate')
      return
    }
    for (const k of KICKS) {
      const kicked: Piece = { ...rotated, x: rotated.x + k }
      if (!this.collides(this.cells(kicked))) {
        this.piece = kicked
        audio.play('rotate')
        return
      }
    }
  }

  private ghostY(): number {
    let y = this.piece.y
    while (!this.collides(this.cells({ ...this.piece, y: y + 1 }))) y++
    return y
  }

  private hardDrop() {
    while (this.tryMove(0, 1)) {
      /* cae hasta tocar */
    }
    this.shake.add(0.22)
    this.lock()
  }

  private doHold() {
    if (this.holdUsed) return
    audio.play('rotate')
    if (this.held === null) {
      this.held = this.piece.type
      this.spawn()
    } else {
      const swap = this.held
      this.held = this.piece.type
      this.spawnPiece(swap)
    }
    this.holdUsed = true
  }

  private lock() {
    const cells = this.cells(this.piece)
    if (cells.some(([, y]) => y < 0)) {
      this.gameOver()
      return
    }
    for (const [x, y] of cells) this.board[y][x] = this.piece.type
    audio.play('lock')

    const full: number[] = []
    for (let y = 0; y < ROWS; y++) {
      if (this.board[y].every((c) => c !== null)) full.push(y)
    }
    if (full.length > 0) {
      this.clearRows = full
      this.clearTimer = CLEAR_DUR
    } else {
      this.spawn()
    }
  }

  private finishClear() {
    const n = this.clearRows.length
    const removed = new Set(this.clearRows)

    for (const row of this.clearRows) {
      for (let i = 0; i < 4; i++) {
        this.particles.burst(Math.random() * this.boardW, (row + 0.5) * CELL, {
          count: 6,
          color: ['#ffffff', PALETTE.accent2, PALETTE.accent],
          speed: 160,
          life: 0.6,
          gravity: 300,
        })
      }
    }

    const kept = this.board.filter((_, y) => !removed.has(y))
    while (kept.length < ROWS) kept.unshift(Array<PieceType | null>(COLS).fill(null))
    this.board = kept

    this.lines += n
    this.score += LINE_SCORES[n] * this.level
    this.level = 1 + Math.floor(this.lines / 10)
    this.gravityInterval = Math.max(0.07, 0.8 - (this.level - 1) * 0.07)
    this.shake.add(Math.min(0.85, 0.25 * n))
    audio.play('clear')
    this.emit({ type: 'score', value: this.score })

    this.clearRows = []
    this.spawn()
  }

  private drawFromBag(): PieceType {
    if (this.bag.length === 0) {
      this.bag = [...TYPES]
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
      }
    }
    return this.bag.pop() as PieceType
  }

  private spawn() {
    this.spawnPiece(this.nextType)
    this.nextType = this.drawFromBag()
    this.holdUsed = false
  }

  private spawnPiece(type: PieceType) {
    const x = type === 'I' ? 3 : type === 'O' ? 4 : 3
    this.piece = { type, rot: 0, x, y: 0 }
    this.gravTimer = 0
    if (this.collides(this.cells(this.piece))) this.gameOver()
  }

  private gameOver() {
    this.alive = false
    this.shake.add(0.6)
    audio.play('die')
    this.emit({ type: 'gameover', score: this.score })
    this.emit({ type: 'state', state: 'over' })
  }

  // --- dibujo ---

  private drawPanel(ctx: CanvasRenderingContext2D) {
    const px = this.boardW + 14
    const boxSize = (PANEL_COLS - 1) * CELL
    ctx.fillStyle = PALETTE.muted
    ctx.font = '600 11px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'

    ctx.fillText('SIGUIENTE', px, 22)
    this.drawMiniBox(ctx, px, 30, boxSize)
    this.drawMini(ctx, this.nextType, px, 30, boxSize, 1)

    const holdY = 30 + boxSize + 34
    ctx.fillStyle = PALETTE.muted
    ctx.fillText('GUARDAR (C)', px, holdY - 8)
    this.drawMiniBox(ctx, px, holdY, boxSize)
    if (this.held) this.drawMini(ctx, this.held, px, holdY, boxSize, this.holdUsed ? 0.35 : 1)

    const lvlY = holdY + boxSize + 40
    ctx.fillStyle = PALETTE.muted
    ctx.fillText('NIVEL', px, lvlY)
    ctx.fillStyle = PALETTE.text
    ctx.font = '800 24px system-ui, sans-serif'
    ctx.fillText(String(this.level), px, lvlY + 26)
  }

  private drawMiniBox(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.beginPath()
    ctx.roundRect(x, y, size, size, 8)
    ctx.fill()
  }

  private drawMini(ctx: CanvasRenderingContext2D, type: PieceType, boxX: number, boxY: number, boxSize: number, alpha: number) {
    const cells = BASE[type]
    const xs = cells.map((c) => c[0])
    const ys = cells.map((c) => c[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const w = maxX - minX + 1
    const h = maxY - minY + 1
    const mc = boxSize / 4.5
    const offX = boxX + (boxSize - w * mc) / 2
    const offY = boxY + (boxSize - h * mc) / 2
    for (const [cx, cy] of cells) {
      this.drawBlock(ctx, offX + (cx - minX) * mc, offY + (cy - minY) * mc, mc, COLORS[type], alpha)
    }
  }

  private drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha: number) {
    const pad = 1
    const s = size - pad * 2
    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x + pad, y + pad, s, s, 4)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(x + pad + 3, y + pad + 3, s - 6, Math.max(2, s * 0.18))
    ctx.globalAlpha = 1
  }
}
