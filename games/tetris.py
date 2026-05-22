import tkinter as tk
import random
from games.base_game import BaseGame
from utils.theme import THEME

class Tetris(BaseGame):
    SHAPES = [
        [[1, 1, 1, 1]], [[1, 1], [1, 1]], [[1, 1, 0], [0, 1, 1]],
        [[0, 1, 1], [1, 1, 0]], [[1, 1, 1], [0, 1, 0]],
        [[1, 1, 1], [1, 0, 0]], [[1, 1, 1], [0, 0, 1]]
    ]

    def __init__(self, parent):
        self.board = [[0]*10 for _ in range(20)]
        self.curr_piece = None
        self.px, self.py = 0, 0
        super().__init__(parent, title="🧱 Tetris", width=350, height=600)
        self._new_piece()
        self._tick()

    def get_tutorial_text(self):
        return "Usa las flechas para mover y rotar piezas. Completa filas para eliminarlas."

    def _build_ui(self):
        self.canvas = tk.Canvas(self, width=250, height=500, bg="#111")
        self.canvas.pack(pady=20)
        self.bind("<Key>", self._on_key)
        self.focus_set()

    def _new_piece(self):
        self.curr_piece = random.choice(self.SHAPES)
        self.px, self.py = 3, 0
        if self._check_collision(self.px, self.py, self.curr_piece):
            self.reset()

    def _check_collision(self, x, y, piece):
        for r, row in enumerate(piece):
            for c, val in enumerate(row):
                if val:
                    if not (0 <= x+c < 10 and 0 <= y+r < 20) or self.board[y+r][x+c]:
                        return True
        return False

    def _tick(self):
        if not self.winfo_exists(): return
        if not self._check_collision(self.px, self.py+1, self.curr_piece):
            self.py += 1
        else:
            self._freeze()
            self._clear_lines()
            self._new_piece()
        self._draw()
        if self.winfo_exists():
            self.after(500, self._tick)

    def _freeze(self):
        for r, row in enumerate(self.curr_piece):
            for c, val in enumerate(row):
                if val: self.board[self.py+r][self.px+c] = 1

    def _clear_lines(self):
        self.board = [row for row in self.board if any(v == 0 for v in row)]
        while len(self.board) < 20: self.board.insert(0, [0]*10)

    def _draw(self):
        self.canvas.delete("all")
        s = 25
        for r, row in enumerate(self.board):
            for c, val in enumerate(row):
                if val: self.canvas.create_rectangle(c*s, r*s, c*s+s, r*s+s, fill=THEME["accent"])
        if self.curr_piece:
            for r, row in enumerate(self.curr_piece):
                for c, val in enumerate(row):
                    if val: self.canvas.create_rectangle((self.px+c)*s, (self.py+r)*s, (self.px+c)*s+s, (self.py+r)*s+s, fill="cyan")

    def _on_key(self, event):
        if event.keysym == "Left" and not self._check_collision(self.px-1, self.py, self.curr_piece): self.px -= 1
        elif event.keysym == "Right" and not self._check_collision(self.px+1, self.py, self.curr_piece): self.px += 1
        elif event.keysym == "Down": self._tick()
        self._draw()

    def reset(self):
        self.board = [[0]*10 for _ in range(20)]
        self._new_piece()
