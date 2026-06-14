import type { Input } from './Input'

export type GameState = 'ready' | 'playing' | 'paused' | 'over'

export type GameEvent =
  | { type: 'score'; value: number }
  | { type: 'state'; state: GameState }
  | { type: 'gameover'; score: number; won?: boolean }

export type Emit = (e: GameEvent) => void

/**
 * Contrato común de todos los juegos. El shell instancia el juego, le inyecta un
 * `emit` para reportar score/estado/gameover, y conduce su ciclo de vida vía el GameLoop.
 * Reemplaza al BaseGame de tkinter: misma idea (clase base + launcher) con loop real.
 */
export abstract class Game {
  protected readonly emit: Emit

  abstract readonly width: number
  abstract readonly height: number

  constructor(emit: Emit) {
    this.emit = emit
  }

  init(): void {}
  /** Arranca la partida desde el estado 'ready'. El shell la invoca con el botón Iniciar. */
  start(): void {}
  abstract update(dt: number, input: Input): void
  abstract render(ctx: CanvasRenderingContext2D): void
  abstract reset(): void
  destroy(): void {}
}
