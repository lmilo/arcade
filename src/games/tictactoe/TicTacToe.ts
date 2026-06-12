import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'

const PAD = 16
const HUD_TOP = 56
const CELL = 110
const W = PAD * 2 + CELL * 3
const H = HUD_TOP + PAD + CELL * 3
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

type Mark = 'X' | 'O' | null
type Result = 'win' | 'lose' | 'draw' | null

export class TicTacToe extends Game {
  readonly width = W
  readonly height = H

  private board: Mark[] = Array(9).fill(null)
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
    this.board = Array(9).fill(null)
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
      if (tap) this.handleTap(tap.x, tap.y)
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, W, H)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '700 16px system-ui, sans-serif'
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
              ? 'Tu turno (X)'
              : 'Pensando…'
    ctx.fillText(msg, W / 2, 24)
    ctx.fillStyle = PALETTE.accent2
    ctx.font = '700 14px system-ui, sans-serif'
    ctx.fillText(`Racha: ${this.score}`, W / 2, 44)

    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 3
    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(PAD + i * CELL, HUD_TOP)
      ctx.lineTo(PAD + i * CELL, HUD_TOP + CELL * 3)
      ctx.moveTo(PAD, HUD_TOP + i * CELL)
      ctx.lineTo(PAD + CELL * 3, HUD_TOP + i * CELL)
      ctx.stroke()
    }

    this.board.forEach((m, i) => {
      if (!m) return
      const cx = PAD + (i % 3) * CELL + CELL / 2
      const cy = HUD_TOP + Math.floor(i / 3) * CELL + CELL / 2
      ctx.fillStyle = m === 'X' ? PALETTE.accent2 : PALETTE.danger
      ctx.font = '700 64px system-ui, sans-serif'
      ctx.fillText(m, cx, cy + 4)
    })
  }

  // --- mecánica ---

  private handleTap(nx: number, ny: number) {
    const col = Math.floor((nx * W - PAD) / CELL)
    const row = Math.floor((ny * H - HUD_TOP) / CELL)
    if (col < 0 || col >= 3 || row < 0 || row >= 3) return
    const idx = row * 3 + col
    if (this.board[idx]) return

    this.board[idx] = 'X'
    audio.play('move')
    if (this.endIfDone()) return
    this.playerTurn = false
    this.aiTimer = 0.35
  }

  private aiMove() {
    const idx = this.chooseAi()
    if (idx >= 0) {
      this.board[idx] = 'O'
      audio.play('rotate')
    }
    if (this.endIfDone()) return
    this.playerTurn = true
  }

  private chooseAi(): number {
    const empty = this.board.map((m, i) => (m ? -1 : i)).filter((i) => i >= 0)
    if (empty.length === 0) return -1
    // 75% juega bien (gana o bloquea), si no, aleatorio: deja margen para rachas.
    if (Math.random() < 0.75) {
      const winI = this.findLine('O')
      if (winI >= 0) return winI
      const blockI = this.findLine('X')
      if (blockI >= 0) return blockI
      if (this.board[4] === null) return 4
    }
    return empty[Math.floor(Math.random() * empty.length)]
  }

  private findLine(mark: Mark): number {
    for (const [a, b, c] of LINES) {
      const line = [this.board[a], this.board[b], this.board[c]]
      const marks = line.filter((m) => m === mark).length
      const empties = line.filter((m) => m === null).length
      if (marks === 2 && empties === 1) {
        return [a, b, c][line.indexOf(null)]
      }
    }
    return -1
  }

  private winner(): Mark {
    for (const [a, b, c] of LINES) {
      if (this.board[a] && this.board[a] === this.board[b] && this.board[b] === this.board[c]) return this.board[a]
    }
    return null
  }

  private endIfDone(): boolean {
    const w = this.winner()
    if (w === 'X') {
      this.result = 'win'
      this.score += 1
      audio.play('win')
      this.emit({ type: 'score', value: this.score })
      this.resetTimer = 1.2
      return true
    }
    if (w === 'O') {
      this.result = 'lose'
      audio.play('die')
      this.resetTimer = 1.4
      return true
    }
    if (this.board.every((m) => m !== null)) {
      this.result = 'draw'
      this.resetTimer = 1.0
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
    this.board = Array(9).fill(null)
    this.result = null
    this.playerTurn = true
  }
}
