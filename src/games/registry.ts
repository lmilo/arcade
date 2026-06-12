import type { Game, Emit } from '../engine/Game'
import type { BoardSize, GameMeta } from '../engine/types'
import { Snake } from './snake/Snake'
import { Tetris } from './tetris/Tetris'
import { Game2048 } from './2048/Game2048'
import { Breakout } from './breakout/Breakout'
import { Flappy } from './flappy/Flappy'
import { Invaders } from './invaders/Invaders'
import { Pong } from './pong/Pong'
import { Memory } from './memory/Memory'

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
  {
    meta: {
      id: 'flappy',
      name: 'Flappy',
      emoji: '🐤',
      tagline: 'Un toque, no toques nada',
      controls: 'Espacio / clic / toque para aletear',
      help: {
        rules: 'Un pájaro cae sin parar. Cada toque le da un impulso hacia arriba para esquivar las tuberías.',
        howTo: 'Pulsa Espacio, haz clic o toca la pantalla para aletear. Pasa entre los huecos de las tuberías.',
        win: 'No tiene final: suma un punto por cada tubería que cruzas. El reto es aguantar lo máximo posible.',
        lose: 'Pierdes si chocas con una tubería o caes al suelo.',
      },
    },
    create: (emit, size) => new Flappy(emit, size),
  },
  {
    meta: {
      id: 'invaders',
      name: 'Space Invaders',
      emoji: '👾',
      tagline: 'Defiende la galaxia',
      controls: '← → mover · Espacio disparar',
      help: {
        rules: 'Una flota de invasores baja en bloque hacia ti. Dispárales antes de que lleguen abajo.',
        howTo: 'Muévete con ← → (o el mouse) y dispara con Espacio. Cuanto menos invasores quedan, más rápido se mueven.',
        win: 'Al limpiar una oleada llega otra más rápida. Suma puntos por cada invasor; las filas de arriba valen más.',
        lose: 'Tienes 3 vidas: pierdes una si te alcanza un disparo. Pierdes también si los invasores llegan a tu altura.',
      },
    },
    create: (emit, size) => new Invaders(emit, size),
  },
  {
    meta: {
      id: 'pong',
      name: 'Pong',
      emoji: '🏓',
      tagline: 'Duelo de paletas contra la IA',
      controls: 'Mouse / ← → mover la paleta',
      help: {
        rules: 'Devuelves la bola con tu paleta (abajo). La IA defiende arriba. La bola acelera con cada punto.',
        howTo: 'Mueve la paleta con el mouse, el dedo o ← →. El punto de la paleta donde golpeas cambia el ángulo.',
        win: 'Sumas un punto cada vez que la bola pasa a la IA. El reto es marcar el máximo antes de quedarte sin vidas.',
        lose: 'Tienes 3 vidas: pierdes una cada vez que la bola pasa tu paleta.',
      },
    },
    create: (emit, size) => new Pong(emit, size),
  },
  {
    meta: {
      id: 'memory',
      name: 'Memory',
      emoji: '🧠',
      tagline: 'Encuentra las parejas, sube de nivel',
      controls: 'Clic / toque para voltear',
      help: {
        rules: 'Voltea dos cartas por turno: si coinciden, se quedan descubiertas. Al limpiar el tablero subes de nivel y el siguiente es más grande (más parejas que recordar).',
        howTo: 'Toca o haz clic en una carta para voltearla. Si las dos no coinciden, vuelven a taparse y gastas un error. Completar un tablero te da puntos extra y recupera un corazón.',
        win: 'No hay final: cada nivel agranda el tablero (4×4 → 4×6 → 6×6 → 6×8). El reto es llegar lo más lejos y con más puntos posible.',
        lose: 'Empiezas con 5 corazones (❤): pierdes uno por cada pareja fallada. Sin corazones, fin del juego.',
      },
    },
    create: (emit, size) => new Memory(emit, size),
  },
]

export function getGame(id: string): GameEntry | undefined {
  return GAMES.find((g) => g.meta.id === id)
}
