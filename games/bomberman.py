import tkinter as tk
from games.base_game import BaseGame
from utils.theme import THEME

class Bomberman(BaseGame):
    def __init__(self, parent):
        self.grid = [[0]*11 for _ in range(9)]
        # Borders and blocks
        for r in range(9):
            for c in range(11):
                if r==0 or r==8 or c==0 or c==10 or (r%2==0 and c%2==0):
                    self.grid[r][c] = 1 # Wall
        self.px, self.py = 1, 1
        self.bombs = []
        super().__init__(parent, title="💣 Bomberman", width=500, height=500)

    def get_tutorial_text(self):
        return "Mueve con flechas, SPACE para bomba. Las bombas explotan en cruz tras 2s."

    def _build_ui(self):
        self.canvas = tk.Canvas(self, width=440, height=360, bg="#2d5e2d")
        self.canvas.pack(pady=30)
        self.bind("<Key>", self._on_key)
        self.focus_set()
        self._draw()

    def _draw(self):
        self.canvas.delete("all")
        s = 40
        for r, row in enumerate(self.grid):
            for c, v in enumerate(row):
                x, y = c*s, r*s
                if v == 1: self.canvas.create_rectangle(x, y, x+s, y+s, fill="gray")
                elif v == 2: self.canvas.create_oval(x+5, y+5, x+s-5, y+s-5, fill="black")
                elif v == 3: self.canvas.create_rectangle(x, y, x+s, y+s, fill="orange")
        self.canvas.create_oval(self.px*s+5, self.py*s+5, self.px*s+s-5, self.py*s+s-5, fill="white")

    def _on_key(self, event):
        if event.keysym == "space":
            self.grid[self.py][self.px] = 2
            self.after(2000, lambda r=self.py, c=self.px: self._explode(r, c))
        else:
            dx, dy = 0, 0
            if event.keysym == "Up": dy = -1
            elif event.keysym == "Down": dy = 1
            elif event.keysym == "Left": dx = -1
            elif event.keysym == "Right": dx = 1
            if self.grid[self.py+dy][self.px+dx] == 0:
                self.px += dx; self.py += dy
        self._draw()

    def _explode(self, r, c):
        self.grid[r][c] = 3
        for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
            if self.grid[r+dr][c+dc] != 1: self.grid[r+dr][c+dc] = 3
        self._draw()
        self.after(500, self._clear_fire)

    def _clear_fire(self):
        for r in range(9):
            for c in range(11):
                if self.grid[r][c] == 3: self.grid[r][c] = 0
        self._draw()

    def reset(self):
        self.__init__(self.master)
        self._draw()
