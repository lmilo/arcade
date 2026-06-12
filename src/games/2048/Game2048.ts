import { Game } from '../../engine/Game'
import type { Emit } from '../../engine/Game'
import type { Input } from '../../engine/Input'
import type { BoardSize, Dir } from '../../engine/types'
import { PALETTE } from '../../shared/theme'
import { audio } from '../../engine/Audio'
import { Particles } from '../../engine/Particles'
import { Shake } from '../../engine/Camera'
import { Ease, lerp } from '../../engine/Tween'

const GAP = 12
const PAD = 12
const TARGET = 420 // lado objetivo del tablero, constante entre tamaños
const N_BY_SIZE: Record<BoardSize, number> = { small: 4, normal: 5, large: 6 }
const MOVE_DUR = 0.11
const POP_DUR = 0.16

const TILE_COLORS: Record<number, string> = {
  2: '#3b3b52',
  4: '#454569',
  8: '#7c3aed',
  16: '#8b46e0',
  32: '#a855f7',
  64: '#c026d3',
  128: '#0ea5e9',
  256: '#06b6d4',
  512: '#22d3ee',
  1024: '#f59e0b',
  2048: '#22c55e',
}

interface Move {
  value: number
  fx: number
  fy: number
  tx: number
  ty: number
}

interface Pop {
  t: number
  kind: 'spawn' | 'merge'
}

export class Game2048 extends Game {
  readonly width: number
  readonly height: number
  private readonly n: number
  private readonly cell: number

  private grid: number[][] = []
  private moving = false
  private moveProgress = 0
  private movements: Move[] = []
  private pending: number[][] | null = null
  private mergedCells: [number, number][] = []
  private gained = 0
  private pops = new Map<string, Pop>()
  private score = 0
  private alive = true
  private started = false
  private wonAnnounced = false

  private readonly particles = new Particles()
  private readonly shake = new Shake(8)

  constructor(emit: Emit, size: BoardSize) {
    super(emit)
    this.n = N_BY_SIZE[size]
    this.cell = (TARGET - PAD * 2 - GAP * (this.n - 1)) / this.n
    const span = PAD * 2 + this.n * this.cell + (this.n - 1) * GAP
    this.width = span
    this.height = span
    this.reset()
  }

  reset() {
    this.grid = Array.from({ length: this.n }, () => Array<number>(this.n).fill(0))
    this.moving = false
    this.moveProgress = 0
    this.movements = []
    this.pending = null
    this.mergedCells = []
    this.pops.clear()
    this.particles.clear()
    this.score = 0
    this.alive = true
    this.started = false
    this.wonAnnounced = false
    this.addRandomTile()
    this.addRandomTile()
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
    for (const [, p] of this.pops) p.t += dt
    for (const [key, p] of this.pops) if (p.t >= POP_DUR) this.pops.delete(key)

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

    if (this.moving) {
      this.moveProgress += dt / MOVE_DUR
      if (this.moveProgress >= 1) this.commit()
      return
    }

    const dir = input.nextDir()
    if (dir) this.doMove(dir)
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, this.width, this.height)

    this.shake.begin(ctx)

    ctx.fillStyle = '#191926'
    this.roundRect(ctx, 0, 0, this.width, this.height, 14)
    ctx.fill()
    for (let y = 0; y < this.n; y++) {
      for (let x = 0; x < this.n; x++) {
        const [px, py] = this.cellPos(x, y)
        ctx.fillStyle = 'rgba(255,255,255,0.04)'
        this.roundRect(ctx, px, py, this.cell, this.cell, 8)
        ctx.fill()
      }
    }

    if (this.moving) {
      const t = Ease.outQuad(Math.min(1, this.moveProgress))
      for (const m of this.movements) {
        const [fpx, fpy] = this.cellPos(m.fx, m.fy)
        const [tpx, tpy] = this.cellPos(m.tx, m.ty)
        this.drawTile(ctx, lerp(fpx, tpx, t), lerp(fpy, tpy, t), m.value, 1)
      }
    } else {
      for (let y = 0; y < this.n; y++) {
        for (let x = 0; x < this.n; x++) {
          const v = this.grid[y][x]
          if (v === 0) continue
          const [px, py] = this.cellPos(x, y)
          this.drawTile(ctx, px, py, v, this.popScale(x, y))
        }
      }
    }

    this.particles.render(ctx)
    this.shake.end(ctx)
  }

  // --- mecánica ---

  private doMove(dir: Dir) {
    const lines = this.linesFor(dir)
    const pending = Array.from({ length: this.n }, () => Array<number>(this.n).fill(0))
    const movements: Move[] = []
    const merged: [number, number][] = []
    let gained = 0

    for (const line of lines) {
      const vals = line.map((p) => this.grid[p.y][p.x])
      const { result, moves } = lineMove(vals)
      for (const mv of moves) {
        const from = line[mv.fromIndex]
        const to = line[mv.toIndex]
        movements.push({ value: vals[mv.fromIndex], fx: from.x, fy: from.y, tx: to.x, ty: to.y })
        if (mv.merge) {
          merged.push([to.x, to.y])
          gained += result[mv.toIndex]
        }
      }
      for (let i = 0; i < this.n; i++) pending[line[i].y][line[i].x] = result[i]
    }

    if (!gridsEqual(pending, this.grid)) {
      this.moving = true
      this.moveProgress = 0
      this.movements = movements
      this.pending = pending
      this.mergedCells = merged
      this.gained = gained
      audio.play('slide')
    }
  }

  private commit() {
    if (this.pending) this.grid = this.pending
    this.moving = false
    this.movements = []
    this.pending = null

    for (const [x, y] of this.mergedCells) {
      this.pops.set(`${x},${y}`, { t: 0, kind: 'merge' })
      const [px, py] = this.cellPos(x, y)
      this.particles.burst(px + this.cell / 2, py + this.cell / 2, {
        count: 8,
        color: ['#ffffff', PALETTE.accent2, PALETTE.warning],
        speed: 120,
        life: 0.45,
      })
    }
    if (this.mergedCells.length > 0) {
      audio.play('merge')
      this.shake.add(Math.min(0.4, 0.12 * this.mergedCells.length))
      this.score += this.gained
      this.emit({ type: 'score', value: this.score })
    }
    this.mergedCells = []

    this.addRandomTile()

    if (!this.wonAnnounced && this.grid.some((row) => row.some((v) => v >= 2048))) {
      this.wonAnnounced = true
      audio.play('win')
    }
    if (!this.canMove()) this.gameOver()
  }

  private addRandomTile() {
    const empty: [number, number][] = []
    for (let y = 0; y < this.n; y++) {
      for (let x = 0; x < this.n; x++) if (this.grid[y][x] === 0) empty.push([x, y])
    }
    if (empty.length === 0) return
    const [x, y] = empty[Math.floor(Math.random() * empty.length)]
    this.grid[y][x] = Math.random() < 0.9 ? 2 : 4
    this.pops.set(`${x},${y}`, { t: 0, kind: 'spawn' })
  }

  private canMove(): boolean {
    for (let y = 0; y < this.n; y++) {
      for (let x = 0; x < this.n; x++) {
        const v = this.grid[y][x]
        if (v === 0) return true
        if (x < this.n - 1 && this.grid[y][x + 1] === v) return true
        if (y < this.n - 1 && this.grid[y + 1][x] === v) return true
      }
    }
    return false
  }

  private gameOver() {
    this.alive = false
    this.shake.add(0.5)
    audio.play('die')
    this.emit({ type: 'gameover', score: this.score })
    this.emit({ type: 'state', state: 'over' })
  }

  private linesFor(dir: Dir): { x: number; y: number }[][] {
    const lines: { x: number; y: number }[][] = []
    for (let i = 0; i < this.n; i++) {
      const line: { x: number; y: number }[] = []
      for (let j = 0; j < this.n; j++) {
        if (dir === 'left') line.push({ x: j, y: i })
        else if (dir === 'right') line.push({ x: this.n - 1 - j, y: i })
        else if (dir === 'up') line.push({ x: i, y: j })
        else line.push({ x: i, y: this.n - 1 - j })
      }
      lines.push(line)
    }
    return lines
  }

  // --- dibujo ---

  private cellPos(x: number, y: number): [number, number] {
    return [PAD + x * (this.cell + GAP), PAD + y * (this.cell + GAP)]
  }

  private popScale(x: number, y: number): number {
    const pop = this.pops.get(`${x},${y}`)
    if (!pop) return 1
    const p = Math.min(1, pop.t / POP_DUR)
    if (pop.kind === 'spawn') return Ease.outBack(p)
    return 1 + 0.2 * Math.sin(p * Math.PI)
  }

  private drawTile(ctx: CanvasRenderingContext2D, px: number, py: number, value: number, scale: number) {
    const cx = px + this.cell / 2
    const cy = py + this.cell / 2
    const s = this.cell * scale
    ctx.fillStyle = TILE_COLORS[value] ?? '#16a34a'
    this.roundRect(ctx, cx - s / 2, cy - s / 2, s, s, 8)
    ctx.fill()

    ctx.fillStyle = value <= 4 ? '#cbd5e1' : '#ffffff'
    const digits = String(value).length
    const fontSize = this.cell * (digits >= 4 ? 0.3 : digits === 3 ? 0.38 : 0.46) * scale
    ctx.font = `800 ${fontSize}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(value), cx, cy + 1)
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
  }
}

interface LineMoveResult {
  result: number[]
  moves: { fromIndex: number; toIndex: number; merge: boolean }[]
}

/** Compacta y fusiona una línea hacia el índice 0, devolviendo el resultado y los movimientos. */
function lineMove(vals: number[]): LineMoveResult {
  const nonzero = vals.map((v, i) => ({ v, i })).filter((o) => o.v !== 0)
  const result = Array<number>(vals.length).fill(0)
  const moves: { fromIndex: number; toIndex: number; merge: boolean }[] = []
  let target = 0
  let k = 0
  while (k < nonzero.length) {
    if (k + 1 < nonzero.length && nonzero[k].v === nonzero[k + 1].v) {
      result[target] = nonzero[k].v * 2
      moves.push({ fromIndex: nonzero[k].i, toIndex: target, merge: false })
      moves.push({ fromIndex: nonzero[k + 1].i, toIndex: target, merge: true })
      k += 2
    } else {
      result[target] = nonzero[k].v
      moves.push({ fromIndex: nonzero[k].i, toIndex: target, merge: false })
      k += 1
    }
    target++
  }
  return { result, moves }
}

function gridsEqual(a: number[][], b: number[][]): boolean {
  for (let y = 0; y < a.length; y++) {
    for (let x = 0; x < a[y].length; x++) if (a[y][x] !== b[y][x]) return false
  }
  return true
}
