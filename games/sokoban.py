import tkinter as tk
from games.base_game import BaseGame
from utils.theme import THEME

class Sokoban(BaseGame):
    # 0: empty, 1: wall, 2: box, 3: target, 4: box on target, 5: player
    LEVEL = [
        [1,1,1,1,1,1],
        [1,3,0,0,0,1],
        [1,0,2,2,0,1],
        [1,0,5,3,0,1],
        [1,1,1,1,1,1]
    ]

    def __init__(self, parent):
        self.grid = [row[:] for row in self.LEVEL]
        self.px, self.py = 2, 3
        super().__init__(parent, title="📦 Sokoban", width=400, height=400)

    def get_tutorial_text(self):
        return "Empuja las cajas (celestes) hacia los objetivos (puntos). Solo puedes empujar una a la vez."

    def _build_ui(self):
        self.canvas = tk.Canvas(self, width=300, height=250, bg=THEME["bg"])
        self.canvas.pack(pady=40)
        self.bind("<Key>", self._on_key)
        self.focus_set()
        self._draw()

    def _draw(self):
        self.canvas.delete("all")
        s = 50
        colors = {1: "#444", 2: "cyan", 3: "white", 4: "blue", 5: "yellow"}
        for r, row in enumerate(self.grid):
            for c, v in enumerate(row):
                x, y = c*s, r*s
                if v == 1: self.canvas.create_rectangle(x, y, x+s, y+s, fill=colors[1])
                elif v == 2: self.canvas.create_rectangle(x+5, y+5, x+s-5, y+s-5, fill=colors[2])
                elif v == 3: self.canvas.create_oval(x+20, y+20, x+30, y+30, fill=colors[3])
                elif v == 4: self.canvas.create_rectangle(x+5, y+5, x+s-5, y+s-5, fill=colors[4])
                elif v == 5: self.canvas.create_oval(x+10, y+10, x+s-10, y+s-10, fill=colors[5])

    def _on_key(self, event):
        dx, dy = 0, 0
        if event.keysym == "Up": dy = -1
        elif event.keysym == "Down": dy = 1
        elif event.keysym == "Left": dx = -1
        elif event.keysym == "Right": dx = 1
        
        nx, ny = self.px + dx, self.py + dy
        v = self.grid[ny][nx]
        
        if v in [0, 3]: # Empty or Target
            self.grid[self.py][self.px] = 3 if self.LEVEL[self.py][self.px] == 3 else 0
            self.px, self.py = nx, ny
            self.grid[ny][nx] = 5
        elif v in [2, 4]: # Box
            bx, by = nx + dx, ny + dy
            if self.grid[by][bx] in [0, 3]:
                # Push box
                self.grid[by][bx] = 4 if self.LEVEL[by][bx] == 3 else 2
                self.grid[ny][nx] = 5
                self.grid[self.py][self.px] = 3 if self.LEVEL[self.py][self.px] == 3 else 0
                self.px, self.py = nx, ny
        self._draw()

    def reset(self):
        self.grid = [row[:] for row in self.LEVEL]
        self.px, self.py = 2, 3
        self._draw()
