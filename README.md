# 🕹️ Arcade

Un arcade web de **20 juegos clásicos** que se siente vivo: motor propio en Canvas
con audio, partículas y screen-shake, perfil con progresión local y leaderboards
online con retos por link.

> Reescritura completa del proyecto original en Python/tkinter (archivado en la rama
> `legacy-python` y el tag `python-v1`).

---

## 🚀 Cómo correr

Requisitos: **Node 20+** y, para los leaderboards, **Python 3.12+**.

```bash
# Frontend
npm install
npm run dev            # http://localhost:5173

# Backend de leaderboards (opcional — el juego funciona sin él)
python -m venv server/.venv
server/.venv/bin/pip install -r server/requirements.txt
server/.venv/bin/uvicorn server.main:app --port 8000
```

En desarrollo, Vite hace proxy de `/api` al backend, así que no hay que tocar CORS ni
URLs. Si el backend está apagado, los rankings se desactivan solos y todo lo demás
(juego, récords locales, logros) sigue funcionando.

```bash
npm run build         # build de producción
npm run preview       # sirve el build
```

---

## 🎮 Catálogo

| | Juego | Mecánica |
|---|---|---|
| 🐍 | **Snake** | Crece sin morderte; tablero pequeño/normal/grande. |
| 🧱 | **Tetris** | Piezas, rotación, hold (C) y pieza siguiente. |
| 🔢 | **2048** | Combina fichas; cuadrícula 4×4 / 5×5 / 6×6. |
| 🧱 | **Breakout** | Ladrillos, power-ups, debuffs y bloques duros. |
| 🐤 | **Flappy** | Un botón: aletea y esquiva tuberías. |
| 👾 | **Space Invaders** | Defiende la galaxia por oleadas. |
| 🏓 | **Pong** | Duelo de paletas contra la IA. |
| 🧠 | **Memory** | Parejas por niveles: el tablero crece. |
| 🚩 | **Buscaminas** | Clic izq destapa / der marca; 3 dificultades. |
| ❌ | **Tic-Tac-Toe** | Tres en raya vs IA; racha de victorias. |
| 🔵 | **Conecta 4** | Cuatro en línea vs IA; racha de victorias. |
| 🔴 | **Simon** | Repite secuencias de color cada vez más largas. |
| 🔨 | **Topos** | Aporrea topos contrarreloj (30 s). |
| 🚀 | **Asteroids** | Inercia, disparo y pantalla envolvente. |
| 🌠 | **Esquiva** | Esquiva la lluvia que cae y acelera. |
| 🟦 | **Tron** | Duelo de estelas en rejilla vs IA. |
| 🦘 | **Saltarín** | Sube saltando; bloques resorte y desvanecentes. |
| 🐸 | **Cruce** | Cruza los carriles esquivando el tráfico. |
| 🛡️ | **Defensa** | Intercepta misiles con explosiones. |
| 💡 | **Apaga Luces** | Apaga el tablero a tiempo; 3 dificultades. |

Cada juego trae su tutorial (botón **ℹ️ Cómo jugar**), récord local, logros y ranking.

---

## 🧱 Arquitectura

Separación dura entre el **motor** (TypeScript puro, agnóstico de React y de cada juego)
y el **shell** (React, todo lo que rodea al canvas).

```
src/
├─ engine/        # GameLoop (paso fijo), Game (clase base + bus de eventos),
│                 # Input (teclado/táctil/puntero), Renderer (DPR),
│                 # Audio (sfx por Web Audio), Particles, Camera (shake), Tween
├─ games/         # un directorio por juego + registry.ts (catálogo)
├─ app/           # shell React: menú, juego (GameHost), perfil, ranking, modal de ayuda
├─ data/          # store local (perfil/récords/logros), cliente de leaderboard
└─ shared/        # tema/paleta
server/           # backend de leaderboards: FastAPI + SQLModel + SQLite
```

**Añadir un juego** = una clase que extiende `Game` (`update`, `render`, `reset`,
emite `score`/`gameover`) + una entrada en `src/games/registry.ts`. Hereda gratis el
game loop, el input, el juice, la pantalla de inicio, el récord, los logros, el ranking
y el botón de compartir.

---

## ✨ Qué lo hace "vivo"

- **Juice:** audio sintetizado (sin assets), partículas, screen-shake, tweens y
  transiciones; pantalla de inicio con botón Iniciar.
- **Progresión local:** perfil con avatar y nombre, récord por juego, logros y monedas,
  todo en `localStorage`.
- **Social:** leaderboards globales por juego e identidad anónima por dispositivo, y
  **retos por link** (`/play/:id?reto=N&por=nombre`) para desafiar a un amigo.

---

## 🛠️ Stack

- **Frontend:** Vite + TypeScript + React (shell) + Canvas2D (juegos).
- **Backend:** FastAPI + SQLModel + SQLite (cambiar a Postgres es solo `DATABASE_URL`).
- Sin dependencias de motores de juego: el engine es propio.
