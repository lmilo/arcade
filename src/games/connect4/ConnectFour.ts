import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'

const COLS = 7
const ROWS = 6
const CELL = 54
const PAD = 12
const HUD_TOP = 50

type Mark = 'R' | 'Y' | null
type Result = 'win' | 'lose' | 'draw' | null

export class ConnectFour extends Game {
  readonly width = PAD * 2 + COLS * CELL
  readonly height = HUD_TOP + PAD + ROWS * CELL

  private board: Mark[] = Array(COLS * ROWS).fill(null)
  private playerTurn = true
  private result: Result = null
  private aiTimer = 0
  private resetTimer = 0
  private score = 0
  private alive = true
  private started = false

  constructor(emit: Emit, _size: BoardSize) {
    super(emit)
    void _size
    this.reset()
  }

  reset() {
    this.board = Array(COLS * ROWS).fill(null)
    this.playerTurn = true
    this.result = null
    this.aiTimer = 0
    this.resetTimer = 0
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
    if (this.resetTimer > 0) {
      this.resetTimer -= dt
      if (this.resetTimer <= 0) this.afterRound()
      input.consumeTap()
      return
    }
    if (this.aiTimer > 0) {
      this.aiTimer -= dt
      if (this.aiTimer <= 0) this.aiMove()
      input.consumeTap()
      return
    }
    if (this.playerTurn) {
      const tap = input.consumeTap()
      if (tap) {
        const col = Math.floor((tap.x * this.width - PAD) / CELL)
        if (col >= 0 && col < COLS) this.play(col, 'R')
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '700 15px system-ui, sans-serif'
    ctx.fillStyle =
      this.result === 'win' ? PALETTE.success : this.result === 'lose' ? PALETTE.danger : PALETTE.text
    const msg =
      this.result === 'win'
        ? '¡Ganaste! +1'
        : this.result === 'lose'
          ? 'Perdiste'
          : this.result === 'draw'
            ? 'Empate'
            : this.playerTurn
              ? 'Tu turno (rojo) — toca una columna'
              : 'Pensando…'
    ctx.fillText(msg, this.width / 2, 18)
    ctx.fillStyle = PALETTE.accent2
    ctx.font = '700 13px system-ui, sans-serif'
    ctx.fillText(`Racha: ${this.score}`, this.width / 2, 38)

    ctx.fillStyle = '#1e3a8a'
    ctx.beginPath()
    ctx.roundRect(PAD - 4, HUD_TOP - 4, COLS * CELL + 8, ROWS * CELL + 8, 12)
    ctx.fill()

    for (let i = 0; i < this.board.length; i++) {
      const cx = PAD + (i % COLS) * CELL + CELL / 2
      const cy = HUD_TOP + Math.floor(i / COLS) * CELL + CELL / 2
      const m = this.board[i]
      ctx.fillStyle = m === 'R' ? PALETTE.danger : m === 'Y' ? PALETTE.warning : '#0f1d4a'
      ctx.beginPath()
      ctx.arc(cx, cy, CELL / 2 - 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // --- mecánica ---

  private drop(col: number, mark: Mark): number {
    for (let row = ROWS - 1; row >= 0; row--) {
      const idx = row * COLS + col
      if (!this.board[idx]) {
        this.board[idx] = mark
        return idx
      }
    }
    return -1
  }

  private play(col: number, mark: Mark) {
    const idx = this.drop(col, mark)
    if (idx < 0) return
    audio.play(mark === 'R' ? 'move' : 'rotate')
    if (this.endIfDone()) return
    if (mark === 'R') {
      this.playerTurn = false
      this.aiTimer = 0.4
    } else {
      this.playerTurn = true
    }
  }

  private aiMove() {
    const col = this.chooseAi()
    if (col >= 0) this.play(col, 'Y')
    else if (this.endIfDone()) return
  }

  private chooseAi(): number {
    const valid = this.validCols()
    if (valid.length === 0) return -1
    const winCol = this.findThreatFor('Y')
    if (winCol >= 0) return winCol
    const blockCol = this.findThreatFor('R')
    if (blockCol >= 0) return blockCol
    // preferencia por el centro
    const ordered = [3, 2, 4, 1, 5, 0, 6].filter((c) => valid.includes(c))
    return ordered[Math.floor(Math.random() * Math.min(2, ordered.length))]
  }

  private validCols(): number[] {
    const cols: number[] = []
    for (let c = 0; c < COLS; c++) if (!this.board[c]) cols.push(c)
    return cols
  }

  private findThreatFor(mark: Mark): number {
    for (const c of this.validCols()) {
      const idx = this.lowestRow(c) * COLS + c
      this.board[idx] = mark
      const win = this.wins(mark)
      this.board[idx] = null
      if (win) return c
    }
    return -1
  }

  private lowestRow(col: number): number {
    for (let row = ROWS - 1; row >= 0; row--) if (!this.board[row * COLS + col]) return row
    return -1
  }

  private wins(mark: Mark): boolean {
    const at = (r: number, c: number) => (r >= 0 && r < ROWS && c >= 0 && c < COLS ? this.board[r * COLS + c] : null)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (at(r, c) !== mark) continue
        for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
          let n = 1
          while (n < 4 && at(r + dr * n, c + dc * n) === mark) n++
          if (n >= 4) return true
        }
      }
    }
    return false
  }

  private endIfDone(): boolean {
    if (this.wins('R')) {
      this.result = 'win'
      this.score += 1
      audio.play('win')
      this.emit({ type: 'score', value: this.score })
      this.resetTimer = 1.4
      return true
    }
    if (this.wins('Y')) {
      this.result = 'lose'
      audio.play('die')
      this.resetTimer = 1.6
      return true
    }
    if (this.board.every((m) => m !== null)) {
      this.result = 'draw'
      this.resetTimer = 1.2
      return true
    }
    return false
  }

  private afterRound() {
    if (this.result === 'lose') {
      this.alive = false
      this.emit({ type: 'gameover', score: this.score })
      this.emit({ type: 'state', state: 'over' })
      return
    }
    this.board = Array(COLS * ROWS).fill(null)
    this.result = null
    this.playerTurn = true
  }
}
