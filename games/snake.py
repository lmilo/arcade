import tkinter as tk
from games.base_game import BaseGame
from utils.theme import THEME, ICONS
import random


class Snake(BaseGame):

    CELL  = 24
    ROWS  = 20
    COLS  = 20
    SPEED = 120

    def __init__(self, parent):
        self.snake     = []
        self.direction = (0, 1)
        self.next_dir  = (0, 1)
        self.food      = None
        self.score     = 0
        self.running   = False
        self.dead      = False
        self.after_id  = None
        super().__init__(parent, title="Snake", width=self.COLS * self.CELL, height=self.ROWS * self.CELL + 100)

    def get_tutorial_text(self):
        return (
            "OBJETIVO:\n"
            "Comer tantas manzanas 🍎 como puedas para crecer y sumar puntos.\n\n"
            "CONTROLES:\n"
            "- Usa las FLECHAS del teclado o las teclas WASD para moverte.\n\n"
            "REGLAS:\n"
            "- El juego termina si chocas contra las paredes o contra tu propio cuerpo.\n"
            "- Cada manzana te hace más largo y aumenta tu puntuación."
        )

    # ------------------------------------------------------------------ UI ---

    def _build_ui(self):
        self.configure(bg=THEME["bg"])

        header = tk.Frame(self, bg=THEME["bg"])
        header.pack(pady=(10, 4))

        self.score_label = tk.Label(
            header, text="Score: 0",
            font=(THEME["font_mono"], 13, "bold"),
            bg=THEME["bg"], fg=THEME["accent"]
        )
        self.score_label.pack(side="left", padx=16)

        tk.Button(
            header, text=ICONS["reset"],
            font=(THEME["font_mono"], 10),
            bg=THEME["card"], fg=THEME["text"],
            relief="flat", padx=8, pady=4,
            activebackground=THEME["accent"],
            command=self.reset
        ).pack(side="left", padx=16)

        canvas_w = self.COLS * self.CELL
        canvas_h = self.ROWS * self.CELL

        self.canvas = tk.Canvas(
            self,
            width=canvas_w, height=canvas_h,
            bg="#1a1a2e", highlightthickness=1,
            highlightbackground=THEME["accent"]
        )
        self.canvas.pack(padx=10, pady=(0, 10))

        self.info_label = tk.Label(
            self, text="Presiona WASD o flechas para iniciar",
            font=(THEME["font_mono"], 9),
            bg=THEME["bg"], fg=THEME["text"]
        )
        self.info_label.pack()

        self.bind("<KeyPress>", self._on_key)
        self.after(100, lambda: self.focus_force())

        self._init_state()
        self._draw()

    # ------------------------------------------------------- Game state ---

    def _init_state(self):
        mid_r = self.ROWS // 2
        mid_c = self.COLS // 2
        self.snake     = [(mid_r, mid_c), (mid_r, mid_c - 1), (mid_r, mid_c - 2)]
        self.direction = (0, 1)
        self.next_dir  = (0, 1)
        self.score     = 0
        self.running   = False
        self.dead      = False
        self._spawn_food()

    def _spawn_food(self):
        empty = [
            (r, c)
            for r in range(self.ROWS)
            for c in range(self.COLS)
            if (r, c) not in self.snake
        ]
        self.food = random.choice(empty)

    # --------------------------------------------------------- Game loop ---

    def _loop(self):
        if not self.running:
            return

        self.direction = self.next_dir
        head_r, head_c = self.snake[0]
        dr, dc = self.direction
        new_head = (head_r + dr, head_c + dc)

        if not (0 <= new_head[0] < self.ROWS and 0 <= new_head[1] < self.COLS):
            self._game_over()
            return

        if new_head in self.snake:
            self._game_over()
            return

        self.snake.insert(0, new_head)

        if new_head == self.food:
            self.score += 10
            self.score_label.config(text=f"Score: {self.score}")
            self._spawn_food()
        else:
            self.snake.pop()

        self._draw()
        self.after_id = self.after(self.SPEED, self._loop)

    # ---------------------------------------------------------- Rendering ---

    def _draw(self):
        self.canvas.delete("all")

        for r in range(self.ROWS):
            for c in range(self.COLS):
                x1 = c * self.CELL
                y1 = r * self.CELL
                x2 = x1 + self.CELL
                y2 = y1 + self.CELL
                self.canvas.create_rectangle(
                    x1, y1, x2, y2,
                    outline="#1e1e2e", fill="#1a1a2e"
                )

        fr, fc = self.food
        fx1 = fc * self.CELL + 3
        fy1 = fr * self.CELL + 3
        fx2 = fx1 + self.CELL - 6
        fy2 = fy1 + self.CELL - 6
        self.canvas.create_oval(fx1, fy1, fx2, fy2, fill=THEME["danger"], outline="")

        for i, (r, c) in enumerate(self.snake):
            x1 = c * self.CELL + 1
            y1 = r * self.CELL + 1
            x2 = x1 + self.CELL - 2
            y2 = y1 + self.CELL - 2
            color = THEME["accent"] if i == 0 else THEME["success"]
            self._draw_rounded_rect(x1, y1, x2, y2, 4, color)

    def _draw_rounded_rect(self, x1, y1, x2, y2, r, color):
        self.canvas.create_arc(x1,     y1,     x1+2*r, y1+2*r, start=90,  extent=90, fill=color, outline="")
        self.canvas.create_arc(x2-2*r, y1,     x2,     y1+2*r, start=0,   extent=90, fill=color, outline="")
        self.canvas.create_arc(x1,     y2-2*r, x1+2*r, y2,     start=180, extent=90, fill=color, outline="")
        self.canvas.create_arc(x2-2*r, y2-2*r, x2,     y2,     start=270, extent=90, fill=color, outline="")
        self.canvas.create_rectangle(x1+r, y1,   x2-r, y2,   fill=color, outline="")
        self.canvas.create_rectangle(x1,   y1+r, x2,   y2-r, fill=color, outline="")

    # ------------------------------------------------------------ Input ---

    DIRECTION_MAP = {
        "w": (-1, 0), "Up":    (-1, 0),
        "s": ( 1, 0), "Down":  ( 1, 0),
        "a": ( 0,-1), "Left":  ( 0,-1),
        "d": ( 0, 1), "Right": ( 0, 1),
    }

    def _on_key(self, event):
        key = event.keysym
        if key not in self.DIRECTION_MAP:
            return

        # Si está muerto, bloquear todo movimiento
        if self.dead:
            return

        new_dir = self.DIRECTION_MAP[key]

        # Evitar reversión 180°
        if (new_dir[0] * -1, new_dir[1] * -1) == self.direction:
            return

        self.next_dir = new_dir

        # Primera tecla arranca el juego
        if not self.running:
            self.running = True
            self.info_label.config(text="")
            self._loop()

    # ------------------------------------------------------- Game states ---

    def _game_over(self):
        self.running = False
        self.dead    = True
        if self.after_id:
            self.after_cancel(self.after_id)

        cx = (self.COLS * self.CELL) // 2
        cy = (self.ROWS * self.CELL) // 2
        self.canvas.create_rectangle(
            cx-110, cy-40, cx+110, cy+40,
            fill="#0f0f1a", outline=THEME["danger"], width=2
        )
        self.canvas.create_text(
            cx, cy - 12, text="GAME OVER",
            font=(THEME["font_mono"], 16, "bold"), fill=THEME["danger"]
        )
        self.canvas.create_text(
            cx, cy + 14, text=f"Score: {self.score}",
            font=(THEME["font_mono"], 11), fill=THEME["text"]
        )
        self.info_label.config(text=f"Presiona '{ICONS['reset']}' para reiniciar")

    # ------------------------------------------------------------ Reset ---

    def reset(self):
        if self.after_id:
            self.after_cancel(self.after_id)
            self.after_id = None
        self._init_state()
        self.score_label.config(text="Score: 0")
        self.info_label.config(text="Presiona WASD o flechas para iniciar")
        self._draw()
        self.focus_force()

    def on_close(self):
        if self.after_id:
            self.after_cancel(self.after_id)
        self.destroy()
