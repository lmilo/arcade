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
import { Minesweeper } from './minesweeper/Minesweeper'
import { TicTacToe } from './tictactoe/TicTacToe'
import { ConnectFour } from './connect4/ConnectFour'
import { Simon } from './simon/Simon'
import { WhackAMole } from './whack/WhackAMole'
import { Asteroids } from './asteroids/Asteroids'
import { Dodge } from './dodge/Dodge'
import { Tron } from './tron/Tron'
import { Jumper } from './jumper/Jumper'
import { Frogger } from './frogger/Frogger'
import { Defense } from './defense/Defense'
import { LightsOut } from './lightsout/LightsOut'

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
  {
    meta: {
      id: 'mines',
      name: 'Buscaminas',
      emoji: '🚩',
      tagline: 'Destapa sin pisar una mina',
      controls: 'Clic para destapar · botón 🚩 para marcar',
      help: {
        rules: 'El tablero esconde 10 minas. Cada casilla destapada muestra cuántas minas la rodean; con esas pistas deduces dónde NO hay minas.',
        howTo: 'Toca una casilla para destaparla (la primera siempre es segura). Activa el modo 🚩 arriba para marcar las que crees que son minas.',
        win: 'Ganas al destapar todas las casillas sin mina. Cuantas más destapas, más puntos.',
        lose: 'Si destapas una mina, pierdes al instante.',
      },
    },
    create: (emit, size) => new Minesweeper(emit, size),
  },
  {
    meta: {
      id: 'tictactoe',
      name: 'Tic-Tac-Toe',
      emoji: '❌',
      tagline: 'Tres en raya contra la IA',
      controls: 'Clic / toque para poner tu X',
      help: {
        rules: 'Tú eres X, la IA es O. Gana quien alinee tres en fila, columna o diagonal.',
        howTo: 'Toca una casilla libre para poner tu X; la IA responde. Cada victoria suma a tu racha; un empate reinicia la ronda.',
        win: 'No tiene final: encadena el máximo de victorias seguidas contra la IA.',
        lose: 'Si la IA te gana una ronda, se acaba la racha.',
      },
    },
    create: (emit, size) => new TicTacToe(emit, size),
  },
  {
    meta: {
      id: 'connect4',
      name: 'Conecta 4',
      emoji: '🔵',
      tagline: 'Cuatro en línea contra la IA',
      controls: 'Clic en una columna para soltar ficha',
      help: {
        rules: 'Tú juegas rojo, la IA amarillo. Suelta fichas en las columnas; gana quien conecte 4 en línea (horizontal, vertical o diagonal).',
        howTo: 'Toca una columna para soltar tu ficha, que cae hasta el fondo. La IA responde. Cada victoria suma a tu racha.',
        win: 'No tiene final: encadena el máximo de victorias seguidas.',
        lose: 'Si la IA conecta 4 antes que tú, se acaba la racha.',
      },
    },
    create: (emit, size) => new ConnectFour(emit, size),
  },
  {
    meta: {
      id: 'simon',
      name: 'Simon',
      emoji: '🔴',
      tagline: 'Repite la secuencia de colores',
      controls: 'Clic / toque en los cuadrantes',
      help: {
        rules: 'El tablero muestra una secuencia de colores que crece de a uno cada ronda. Debes repetirla completa y en orden.',
        howTo: 'Observa la secuencia que se ilumina y luego tócala en el mismo orden. Si aciertas, se añade un color y la secuencia se hace más larga.',
        win: 'No tiene final: cada ronda completada suma un punto. El reto es memorizar secuencias cada vez más largas.',
        lose: 'Pierdes en cuanto tocas un color fuera de orden.',
      },
    },
    create: (emit, size) => new Simon(emit, size),
  },
  {
    meta: {
      id: 'whack',
      name: 'Topos',
      emoji: '🔨',
      tagline: 'Aporrea topos contrarreloj',
      controls: 'Clic / toque sobre el topo',
      help: {
        rules: 'Los topos asoman por sus agujeros durante poco tiempo. Golpéalos antes de que se escondan.',
        howTo: 'Toca o haz clic sobre un topo cuando esté fuera. Conforme pasa el tiempo asoman más rápido y duran menos.',
        win: 'Tienes 30 segundos: el reto es golpear la mayor cantidad posible.',
        lose: 'No se puede perder; cuando se acaba el tiempo, se cuenta tu marca.',
      },
    },
    create: (emit, size) => new WhackAMole(emit, size),
  },
  {
    meta: {
      id: 'asteroids',
      name: 'Asteroids',
      emoji: '🚀',
      tagline: 'Destruye la lluvia de rocas',
      controls: '← → girar · ↑ impulso · Espacio disparar',
      help: {
        rules: 'Pilotas una nave en gravedad cero. Dispara a los asteroides: los grandes se parten en otros más pequeños.',
        howTo: 'Gira con ← →, impúlsate con ↑ (la inercia te arrastra) y dispara con Espacio. La pantalla envuelve: si sales por un lado, apareces por el otro.',
        win: 'Limpia todas las rocas para pasar a una oleada mayor. Las rocas pequeñas valen más puntos.',
        lose: 'Tienes 3 vidas: pierdes una si una roca golpea tu nave.',
      },
    },
    create: (emit, size) => new Asteroids(emit, size),
  },
  {
    meta: {
      id: 'dodge',
      name: 'Esquiva',
      emoji: '🌠',
      tagline: 'Esquiva la lluvia que cae',
      controls: 'Mouse / ← → mover',
      help: {
        rules: 'Caen bloques desde arriba cada vez más rápido. Muévete para que no te toquen.',
        howTo: 'Mueve tu nave con el mouse, el dedo o ← →. Sumas puntos por sobrevivir y por cada bloque esquivado.',
        win: 'No tiene final: el reto es aguantar el máximo de tiempo y puntuación.',
        lose: 'Tienes 3 vidas: pierdes una con cada golpe.',
      },
    },
    create: (emit, size) => new Dodge(emit, size),
  },
  {
    meta: {
      id: 'tron',
      name: 'Tron',
      emoji: '🟦',
      tagline: 'Duelo de estelas contra la IA',
      controls: 'Flechas / WASD / swipe para girar',
      help: {
        rules: 'Tu moto deja una estela sólida y nunca se detiene. La IA también. Choca contra una estela o el muro y pierdes.',
        howTo: 'Gira con las flechas, WASD o swipe para encerrar a la IA y obligarla a chocar, sin chocar tú primero.',
        win: 'Cada ronda que ganas suma un punto y la siguiente va más rápido.',
        lose: 'Pierdes en cuanto chocas contra un muro o una estela.',
      },
    },
    create: (emit, size) => new Tron(emit, size),
  },
  {
    meta: {
      id: 'jumper',
      name: 'Saltarín',
      emoji: '🦘',
      tagline: 'Salta lo más alto que puedas',
      controls: 'Mouse / ← → mover',
      help: {
        rules: 'Tu personaje rebota solo al caer sobre las plataformas. El objetivo es subir lo más alto posible.',
        howTo: 'Muévete con el mouse, el dedo o ← → para caer sobre las plataformas (los lados se conectan: sales por uno y entras por el otro).',
        win: 'No tiene final: la puntuación es la altura que alcanzas.',
        lose: 'Pierdes si fallas las plataformas y caes fuera de la pantalla.',
      },
    },
    create: (emit, size) => new Jumper(emit, size),
  },
  {
    meta: {
      id: 'frogger',
      name: 'Cruce',
      emoji: '🐸',
      tagline: 'Cruza esquivando el tráfico',
      controls: 'Flechas / WASD / swipe',
      help: {
        rules: 'Lleva a la rana de abajo hasta arriba cruzando los carriles llenos de autos.',
        howTo: 'Muévete casilla por casilla con las flechas, WASD o swipe. Cada vez que llegas arriba, sumas y vuelves a empezar más rápido.',
        win: 'No tiene final: suma un cruce cada vez que llegas arriba.',
        lose: 'Tienes 3 vidas: pierdes una si te atropella un auto.',
      },
    },
    create: (emit, size) => new Frogger(emit, size),
  },
  {
    meta: {
      id: 'defense',
      name: 'Defensa',
      emoji: '🛡️',
      tagline: 'Intercepta los misiles',
      controls: 'Clic / toque para explotar ahí',
      help: {
        rules: 'Llueven misiles hacia tu base. Cada toque crea una explosión que destruye los misiles que atrapa en su radio.',
        howTo: 'Toca o haz clic donde quieres que estalle la explosión, anticipándote a la trayectoria de los misiles.',
        win: 'No tiene final: suma puntos por cada misil interceptado mientras el ritmo sube.',
        lose: 'Tienes 3 vidas: pierdes una cada vez que un misil llega a la base.',
      },
    },
    create: (emit, size) => new Defense(emit, size),
  },
  {
    meta: {
      id: 'lightsout',
      name: 'Apaga Luces',
      emoji: '💡',
      tagline: 'Apaga todas las luces a tiempo',
      controls: 'Clic / toque para alternar',
      help: {
        rules: 'Tocar una casilla alterna esa luz y sus vecinas (arriba, abajo, izquierda, derecha). El objetivo es dejar todo el tablero apagado.',
        howTo: 'Deduce el orden de toques para apagar todas las luces antes de que se acabe el tiempo. Resolver un tablero da más tiempo y sube de nivel.',
        win: 'No tiene final: cada tablero resuelto suma un punto y el siguiente está más enredado.',
        lose: 'Pierdes cuando se agota el tiempo.',
      },
    },
    create: (emit, size) => new LightsOut(emit, size),
  },
]

export function getGame(id: string): GameEntry | undefined {
  return GAMES.find((g) => g.meta.id === id)
}
