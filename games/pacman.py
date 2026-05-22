import tkinter as tk
from games.base_game import BaseGame
from utils.theme import THEME

class PacMan(BaseGame):
    def __init__(self, parent):
        self.grid = [
            [1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,1,0,0,0,0,1],
            [1,0,1,0,1,0,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,1,1,0,1,1,1,0,0,1],
            [1,0,0,0,0,0,1,0,0,1],
            [1,0,1,1,1,0,1,0,0,1],
            [1,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1]
        ]
        self.px, self.py = 1, 1
        self.score = 0
        super().__init__(parent, title="🟡 Pac-Man", width=420, height=500)

    def get_tutorial_text(self):
        return (
            "OBJETIVO:\n"
            "Recolectar todos los puntos sin ser atrapado.\n\n"
            "REGLAS:\n"
            "- Usa las flechas para moverte.\n"
            "- No puedes atravesar paredes (celdas oscuras)."
        )

    def _build_ui(self):
        self.canvas = tk.Canvas(self, width=400, height=360, bg="black")
        self.canvas.pack(pady=20)
        self.bind("<Key>", self._on_key)
        self.focus_set()
        self._draw()

    def _draw(self):
        self.canvas.delete("all")
        s = 40
        for r, row in enumerate(self.grid):
            for c, val in enumerate(row):
                x, y = c*s, r*s
                if val == 1: self.canvas.create_rectangle(x, y, x+s, y+s, fill="#191970")
                elif val == 0: self.canvas.create_oval(x+18, y+18, x+22, y+22, fill="white")
        
        self.canvas.create_oval(self.px*s+5, self.py*s+5, self.px*s+35, self.py*s+35, fill="yellow")

    def _on_key(self, event):
        dx, dy = 0, 0
        if event.keysym == "Up": dy = -1
        elif event.keysym == "Down": dy = 1
        elif event.keysym == "Left": dx = -1
        elif event.keysym == "Right": dx = 1
        
        nx, ny = self.px + dx, self.py + dy
        if self.grid[ny][nx] != 1:
            self.px, self.py = nx, ny
            if self.grid[ny][nx] == 0:
                self.grid[ny][nx] = 2 # Collected
                self.score += 1
            self._draw()

    def reset(self):
        self.__init__(self.master)
        self._draw()
