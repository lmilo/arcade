# 🕹️ Arcade

Colección de **24 juegos clásicos** implementados en Python con `tkinter` y agrupados en un único launcher. Pensado como portafolio de lógica algorítmica: manejo de matrices, IA básica, pathfinding, máquinas de estado y mecánicas de juego clásicas.

---

## 📋 Catálogo de juegos

### Nivel básico / intermedio
| | Juego | Descripción |
|---|---|---|
| 🧱 | **Tetris** | Tetrominos cayendo en matriz 10×20, líneas completas desaparecen. |
| 🐍 | **Snake** | Culebrita clásica con crecimiento al comer. |
| 🚩 | **Buscaminas** | Destapar casillas evitando las minas, con números de pistas. |
| ❌ | **Tic-Tac-Toe** | Triqui 3×3 con detección de línea ganadora. |
| 🔴 | **Simon Says** | Memoria de secuencias de colores. |
| 🧠 | **Memory Match** | Pares de cartas boca abajo. |
| 🔢 | **2048** | Combina números potencia de 2 deslizando. |
| 🖼️ | **Sliding Puzzle** | 15-puzzle clásico. |
| 🧩 | **Sudoku** | Mini sudoku con validación de filas/columnas/cajas. |
| 🌀 | **Maze** | Laberinto aleatorio. |
| 💰 | **Treasure Hunt** | Encuentra el tesoro evitando obstáculos. |
| 🔵 | **Connect Four** | Cuatro en raya. |
| 🦠 | **Game of Life** | Autómata celular de Conway. |

### Nivel avanzado
| | Juego | Reglas críticas |
|---|---|---|
| ♟️ | **Ajedrez** | Movimientos por pieza, no se puede dejar el rey en jaque. |
| 🏁 | **Damas** | Diagonales, captura obligatoria, coronación. |
| 🟡 | **Pac-Man** | Recolección por pasillos, fantasmas en modo persecución. |
| 📦 | **Sokoban** | Empujar cajas hacia objetivos sin tirar de ellas. |
| ⚪ | **Othello / Reversi** | Captura por flanqueo en 8×8, movimientos válidos obligatorios. |
| 💣 | **Bomberman** | Bombas con explosión en cruz, paredes indestructibles. |
| 💎 | **Treasure Hunt (Adv)** | Obstáculos dinámicos garantizando ruta válida. |
| 🛡️ | **Tower Defense** | Torres en celdas laterales, enemigos siguen ruta fija. |
| 🃏 | **Solitario** | Reglas de color alternado y orden descendente. |
| ⚔️ | **Tactical RPG** | Combate por turnos con puntos de movimiento y rango. |
| 🛰️ | **Pathfinding Visualizer** | A* / BFS visualizando exploración hasta la meta. |

---

## 📂 Estructura

```
arcade/
├── main.py              # Launcher con grid de botones para los 24 juegos
├── games/               # Una clase por juego (hereda de base_game.py)
│   ├── base_game.py
│   ├── chess.py
│   ├── tetris.py
│   └── ...
├── utils/
│   └── theme.py         # Paleta de colores compartida
└── assets/
    ├── fonts/           # Tipografías arcade
    ├── icons/
    └── sounds/
```

Cada juego es una clase independiente que se instancia desde el launcher pasándole la ventana padre.

---

## 🚀 Cómo correr

Requisitos: **Python 3.10+** (tkinter viene incluido en la mayoría de instalaciones).

```bash
python main.py
```

Aparece el menú principal con los 24 botones. Click en cualquiera para lanzar ese juego en una ventana nueva.

---

## 🛠️ Stack

- **Python 3** — lógica de juego y UI
- **tkinter** — interfaz gráfica nativa, sin dependencias externas
- Patrón **launcher + base class** para que cada juego sea independiente y reusable

---

## 🎯 Objetivo del proyecto

Practicar y mostrar:
- Manejo de **matrices** (tableros, grids, mazes).
- **Máquinas de estado** (turnos, modos de juego, ciclos de vida).
- **Pathfinding** (A*, BFS, DFS).
- **IA básica** (movimientos válidos, persecución, decisiones por turno).
- **Validación de reglas** (movimientos legales, capturas, condiciones de victoria).
