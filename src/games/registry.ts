import type { Game, Emit } from '../engine/Game'
import type { BoardSize, GameMeta } from '../engine/types'
import { Snake } from './snake/Snake'
import { Tetris } from './tetris/Tetris'
import { Game2048 } from './2048/Game2048'
import { Breakout } from './breakout/Breakout'

export interface GameEntry {
  meta: GameMeta
  /** Tamaños de tablero disponibles. Si se omite, el shell no muestra selector. */
  sizes?: BoardSize[]
  /** Tamaño inicial (por defecto 'normal'). */
  defaultSize?: BoardSize
  /** Etiquetas a medida para el selector (por defecto Pequeño/Normal/Grande). */
  sizeLabels?: Record<BoardSize, string>
  create: (emit: Emit, size: BoardSize) => Game
}

const ALL_SIZES: BoardSize[] = ['small', 'normal', 'large']

/**
 * Catálogo del arcade. Cada entrada aporta su metadata para el menú y una factory
 * que el GameHost usa para instanciar el juego. Añadir un juego = añadir una entrada.
 */
export const GAMES: GameEntry[] = [
  {
    meta: {
      id: 'snake',
      name: 'Snake',
      emoji: '🐍',
      tagline: 'Crece sin morder tu cola',
      controls: 'Flechas / WASD / swipe',
      help: {
        rules: 'Controlas una serpiente que avanza sin parar por el tablero. Cada fruta que comes te hace crecer una celda.',
        howTo: 'Gira con las flechas, WASD o deslizando el dedo (swipe). No puedes invertir el sentido de golpe. Espacio o un toque corto reinicia.',
        win: 'No hay final: el reto es llegar a la mayor puntuación posible. Cada fruta suma 1 punto.',
        lose: 'Pierdes si chocas contra una pared del borde o contra tu propio cuerpo.',
      },
    },
    sizes: ALL_SIZES,
    create: (emit, size) => new Snake(emit, size),
  },
  {
    meta: {
      id: 'tetris',
      name: 'Tetris',
      emoji: '🧱',
      tagline: 'Encaja las piezas, limpia líneas',
      controls: '← → mover · ↑ rotar · ↓ bajar · Espacio caída · C guardar',
      help: {
        rules: 'Caen piezas de cuatro bloques (tetrominós). Encájalas para formar filas horizontales completas, que desaparecen y suman puntos.',
        howTo: 'Mueve con ← →, rota con ↑ o W, acelera con ↓ y suelta de golpe con Espacio. Guarda una pieza para después con C (o Shift). El panel derecho muestra la pieza siguiente y la guardada; la sombra indica dónde caerá.',
        win: 'Es infinito y acelera por niveles: cada 10 líneas subes de nivel. Limpiar 4 líneas a la vez (Tetris) da el máximo de puntos.',
        lose: 'Pierdes cuando las piezas se apilan hasta arriba y una nueva ya no cabe.',
      },
    },
    create: (emit, size) => new Tetris(emit, size),
  },
  {
    meta: {
      id: '2048',
      name: '2048',
      emoji: '🔢',
      tagline: 'Combina hasta llegar a 2048',
      controls: 'Flechas / WASD / swipe',
      help: {
        rules: 'Cada movimiento desliza todas las fichas hacia un lado. Dos fichas iguales que chocan se fusionan en una con el doble de valor.',
        howTo: 'Desliza con las flechas, WASD o swipe. Tras cada movimiento aparece una ficha nueva (2 o 4) en un hueco al azar. Puedes elegir el tamaño de la cuadrícula: cuanto más grande, más espacio para maniobrar.',
        win: 'Llegas a la meta al crear la ficha 2048, pero puedes seguir para batir tu puntuación.',
        lose: 'Pierdes cuando el tablero se llena y no queda ningún movimiento que fusione fichas.',
      },
    },
    sizes: ALL_SIZES,
    defaultSize: 'small',
    sizeLabels: { small: '4×4', normal: '5×5', large: '6×6' },
    create: (emit, size) => new Game2048(emit, size),
  },
  {
    meta: {
      id: 'breakout',
      name: 'Breakout',
      emoji: '🧱',
      tagline: 'Rompe todos los ladrillos',
      controls: 'Mouse / ← → mover · Espacio lanzar',
      help: {
        rules: 'Una bola rebota por la pantalla. Con la paleta evitas que caiga y la diriges para romper todos los ladrillos. La bola acelera cuanto más tiempo lleve en juego sin caer.',
        howTo: 'Mueve la paleta con el mouse, el dedo o ← →. Lanza con Espacio o un toque; el punto de la paleta donde pega cambia el ángulo. Bloques verdes con + sueltan un poder bueno (ancho, multibola, lento o vida); los morados con − sueltan una debilidad (encoge la paleta). Los bloques grises de acero aguantan dos golpes. Cuando un efecto va a expirar, la paleta parpadea.',
        win: 'Rompe todos los ladrillos para pasar de nivel; cada nivel sube la dificultad y aparecen bloques más duros.',
        lose: 'Tienes 3 vidas: pierdes una cada vez que la bola cae por abajo. Sin vidas, fin del juego.',
      },
    },
    create: (emit, size) => new Breakout(emit, size),
  },
]

export function getGame(id: string): GameEntry | undefined {
  return GAMES.find((g) => g.meta.id === id)
}
