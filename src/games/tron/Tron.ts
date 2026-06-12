import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize, Dir } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Shake } from '../../engine/Camera'

const GRID = 30
const CELL = 14
const SIZE = GRID * CELL

const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
const PERP: Record<Dir, Dir[]> = {
  up: ['left', 'right'],
  down: ['left', 'right'],
  left: ['up', 'down'],
  right: ['up', 'down'],
}

interface Cycle {
  x: number
  y: number
  dir: Dir
}

export class Tron extends Game {
  readonly width = SIZE
  readonly height = SIZE

  private occupied: Uint8Array = new Uint8Array(GRID * GRID)
  private player: Cycle = { x: 0, y: 0, dir: 'up' }
  private ai: Cycle = { x: 0, y: 0, dir: 'down' }
  private moveTimer = 0
  private stepInterval = 0.09
  private round = 1
  private score = 0
  private alive = true
  private started = false

  private readonly shake = new Shake(10)

  constructor(emit: Emit, _size: BoardSize) {
    super(emit)
    void _size
    this.reset()
  }

  reset() {
    this.round = 1
    this.score = 0
    this.alive = true
    this.started = false
    this.newRound()
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

    let d: Dir | null
    while ((d = input.nextDir()) !== null) {
      if (d !== OPP[this.player.dir] && d !== this.player.dir) {
        this.player.dir = d
        break
      }
    }

    this.moveTimer += dt
    if (this.moveTimer >= this.stepInterval) {
      this.moveTimer -= this.stepInterval
      this.step()
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, SIZE, SIZE)

    this.shake.begin(ctx)

    for (let i = 0; i < this.occupied.length; i++) {
      const v = this.occupied[i]
      if (v === 0) continue
      ctx.fillStyle = v === 1 ? PALETTE.accent2 : PALETTE.danger
      ctx.fillRect((i % GRID) * CELL + 1, Math.floor(i / GRID) * CELL + 1, CELL - 2, CELL - 2)
    }
    // Cabezas más brillantes.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(this.player.x * CELL + 2, this.player.y * CELL + 2, CELL - 4, CELL - 4)
    ctx.fillStyle = '#fecaca'
    ctx.fillRect(this.ai.x * CELL + 2, this.ai.y * CELL + 2, CELL - 4, CELL - 4)

    ctx.fillStyle = PALETTE.muted
    ctx.font = '700 13px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`Rondas ganadas: ${this.score}`, 8, 8)

    this.shake.end(ctx)
  }

  // --- mecánica ---

  private step() {
    const [pdx, pdy] = DELTA[this.player.dir]
    const pnx = this.player.x + pdx
    const pny = this.player.y + pdy

    this.ai.dir = this.chooseAiDir()
    const [adx, ady] = DELTA[this.ai.dir]
    const anx = this.ai.x + adx
    const any = this.ai.y + ady

    const headon = pnx === anx && pny === any
    const pCrash = !this.free(pnx, pny) || headon
    const aCrash = !this.free(anx, any) || headon

    if (pCrash) {
      this.gameOver()
      return
    }
    if (aCrash) {
      this.winRound()
      return
    }

    this.occupied[pny * GRID + pnx] = 1
    this.occupied[any * GRID + anx] = 2
    this.player.x = pnx
    this.player.y = pny
    this.ai.x = anx
    this.ai.y = any
  }

  private chooseAiDir(): Dir {
    const options = [this.ai.dir, ...shuffle(PERP[this.ai.dir])]
    for (const dir of options) {
      const [dx, dy] = DELTA[dir]
      if (this.free(this.ai.x + dx, this.ai.y + dy)) return dir
    }
    return this.ai.dir
  }

  private free(x: number, y: number): boolean {
    return x >= 0 && x < GRID && y >= 0 && y < GRID && this.occupied[y * GRID + x] === 0
  }

  private winRound() {
    this.score += 1
    this.round += 1
    audio.play('win')
    this.shake.add(0.3)
    this.emit({ type: 'score', value: this.score })
    this.stepInterval = Math.max(0.05, 0.09 - this.round * 0.004)
    this.newRound()
  }

  private newRound() {
    this.occupied = new Uint8Array(GRID * GRID)
    const cx = Math.floor(GRID / 2)
    this.player = { x: cx, y: GRID - 4, dir: 'up' }
    this.ai = { x: cx, y: 3, dir: 'down' }
    this.occupied[this.player.y * GRID + this.player.x] = 1
    this.occupied[this.ai.y * GRID + this.ai.x] = 2
    this.moveTimer = 0
  }

  private gameOver() {
    this.alive = false
    this.shake.add(0.7)
    audio.play('die')
    this.emit({ type: 'gameover', score: this.score })
    this.emit({ type: 'state', state: 'over' })
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
