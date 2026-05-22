import tkinter as tk
from games.base_game import BaseGame
from utils.theme import THEME

class TacticalRPG(BaseGame):
    def __init__(self, parent):
        self.units = [{"x":2, "y":2, "hp":20, "range":2, "name":"Héroe"}, 
                      {"x":7, "y":7, "hp":20, "range":2, "name":"Villano"}]
        self.turn = 0
        self.selected = None
        super().__init__(parent, title="⚔️ RPG Táctico", width=500, height=550)

    def get_tutorial_text(self):
        return "Mueve unidades en la cuadrícula. Tienes rango de ataque limitado."

    def _build_ui(self):
        self.canvas = tk.Canvas(self, width=400, height=400, bg="#2d2d2d")
        self.canvas.pack(pady=20)
        self.canvas.bind("<Button-1>", self._on_click)
        self.info = tk.Label(self, text="Turno: Héroe", bg=THEME["bg"], fg=THEME["text"])
        self.info.pack()
        self._draw()

    def _draw(self):
        self.canvas.delete("all")
        s = 50
        for r in range(8):
            for c in range(8):
                self.canvas.create_rectangle(c*s, r*s, c*s+s, r*s+s, outline="#444")
        
        for i, u in enumerate(self.units):
            color = "blue" if i == 0 else "red"
            if self.selected == i: color = "yellow"
            self.canvas.create_oval(u["x"]*s+5, u["y"]*s+5, u["x"]*s+45, u["y"]*s+45, fill=color)
            self.canvas.create_text(u["x"]*s+25, u["y"]*s+25, text=f"{u['hp']}", fill="white")

    def _on_click(self, event):
        x, y = event.x//50, event.y//50
        if not (0<=x<8 and 0<=y<8): return
        
        if self.selected is not None:
            u = self.units[self.selected]
            if abs(u["x"]-x) + abs(u["y"]-y) <= 3:
                u["x"], u["y"] = x, y
                self.selected = None
                self.turn = 1 - self.turn
                name = self.units[self.turn]["name"]
                self.info.config(text=f"Turno: {name}")
            else: self.selected = None
        else:
            if x == self.units[self.turn]["x"] and y == self.units[self.turn]["y"]:
                self.selected = self.turn
        self._draw()

    def reset(self):
        self.__init__(self.master)
        self._draw()
