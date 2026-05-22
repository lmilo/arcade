import tkinter as tk
import random
from games.base_game import BaseGame
from utils.theme import THEME

class TreasureHuntAdv(BaseGame):
    def __init__(self, parent):
        self.grid = [[0]*10 for _ in range(10)]
        self.tx, self.ty = random.randint(0,9), random.randint(0,9)
        self.px, self.py = 0, 0
        self.obstacles = [(random.randint(1,9), random.randint(1,9)) for _ in range(5)]
        super().__init__(parent, title="💎 Tesoro Avanzado", width=450, height=500)
        self._move_obstacles()

    def get_tutorial_text(self):
        return "Llega al tesoro. ¡Cuidado! Los obstáculos se mueven cada 2 segundos."

    def _build_ui(self):
        self.canvas = tk.Canvas(self, width=400, height=400, bg="#2a2a3e")
        self.canvas.pack(pady=20)
        self.bind("<Key>", self._on_key)
        self.focus_set()
        self._draw()

    def _move_obstacles(self):
        if not self.winfo_exists(): return
        new_obs = []
        for ox, oy in self.obstacles:
            dx, dy = random.choice([(0,1),(0,-1),(1,0),(-1,0)])
            nx, ny = (ox+dx)%10, (oy+dy)%10
            if (nx, ny) != (self.px, self.py) and (nx, ny) != (self.tx, self.ty):
                new_obs.append((nx, ny))
            else: new_obs.append((ox, oy))
        self.obstacles = new_obs
        self._draw()
        if self.winfo_exists():
            self.after(2000, self._move_obstacles)

    def _draw(self):
        self.canvas.delete("all")
        s = 40
        self.canvas.create_text(self.tx*s+20, self.ty*s+20, text="T", font=("Arial", 20), fill="gold")
        for ox, oy in self.obstacles:
            self.canvas.create_rectangle(ox*s+5, oy*s+5, ox*s+35, oy*s+35, fill="red")
        self.canvas.create_oval(self.px*s+10, self.py*s+10, self.px*s+30, self.py*s+30, fill="yellow")

    def _on_key(self, event):
        dx, dy = 0, 0
        if event.keysym == "Up": dy = -1
        elif event.keysym == "Down": dy = 1
        elif event.keysym == "Left": dx = -1
        elif event.keysym == "Right": dx = 1
        nx, ny = (self.px+dx)%10, (self.py+dy)%10
        if (nx, ny) not in self.obstacles:
            self.px, self.py = nx, ny
            if (self.px, self.py) == (self.tx, self.ty): self.reset()
        self._draw()

    def reset(self):
        self.__init__(self.master)
