import tkinter as tk
import time
from games.base_game import BaseGame
from utils.theme import THEME

class TowerDefense(BaseGame):
    def __init__(self, parent):
        self.path = [(0,2),(1,2),(2,2),(2,3),(2,4),(3,4),(4,4),(5,4),(5,3),(5,2),(6,2),(7,2)]
        self.enemies = []
        self.towers = []
        self.money = 100
        super().__init__(parent, title="🛡️ Tower Defense", width=500, height=500)
        self._spawn_enemy()
        self._tick()

    def get_tutorial_text(self):
        return "Haz clic para colocar torres (50$). No puedes colocarlas sobre el camino de los enemigos."

    def _build_ui(self):
        self.canvas = tk.Canvas(self, width=400, height=400, bg="#1a1a1a")
        self.canvas.pack(pady=20)
        self.canvas.bind("<Button-1>", self._place_tower)
        self.info = tk.Label(self, text=f"Dinero: {self.money}$", bg=THEME["bg"], fg=THEME["text"])
        self.info.pack()

    def _place_tower(self, event):
        x, y = event.x//40, event.y//40
        if self.money >= 50 and (x, y) not in self.path and (x, y) not in self.towers:
            self.towers.append((x, y))
            self.money -= 50
            self.info.config(text=f"Dinero: {self.money}$")
            self._draw()

    def _spawn_enemy(self):
        if not self.winfo_exists(): return
        self.enemies.append(0) # Index in path
        self.after(3000, self._spawn_enemy)

    def _tick(self):
        if not self.winfo_exists(): return
        self.enemies = [e+1 for e in self.enemies if e+1 < len(self.path)]
        self._draw()
        self.after(500, self._tick)

    def _draw(self):
        self.canvas.delete("all")
        s = 40
        for px, py in self.path: self.canvas.create_rectangle(px*s, py*s, px*s+s, py*s+s, fill="#444")
        for tx, ty in self.towers: self.canvas.create_rectangle(tx*s+5, ty*s+5, tx*s+35, ty*s+35, fill="blue")
        for e in self.enemies:
            ex, ey = self.path[e]
            self.canvas.create_oval(ex*s+10, ey*s+10, ex*s+30, ey*s+30, fill="red")

    def reset(self):
        self.enemies = []
        self.towers = []
        self.money = 100
        self._draw()
