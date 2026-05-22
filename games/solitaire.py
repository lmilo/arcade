import tkinter as tk
import random
from games.base_game import BaseGame
from utils.theme import THEME

class Solitaire(BaseGame):
    def __init__(self, parent):
        self.piles = [[] for _ in range(7)]
        self._deal()
        super().__init__(parent, title="🃏 Solitario", width=700, height=600)

    def get_tutorial_text(self):
        return "Organiza las cartas en columnas. Solo puedes colocar una carta sobre otra de color opuesto y número inferior."

    def _deal(self):
        deck = [(v, s) for v in range(1, 14) for s in ['H','D','C','S']]
        random.shuffle(deck)
        for i in range(7):
            for j in range(i + 1):
                self.piles[i].append(deck.pop())

    def _build_ui(self):
        self.canvas = tk.Canvas(self, width=650, height=500, bg="#076324")
        self.canvas.pack(pady=20)
        self._draw()

    def _draw(self):
        self.canvas.delete("all")
        cw, ch = 80, 110
        for i, pile in enumerate(self.piles):
            x = 20 + i * 90
            for j, (val, suit) in enumerate(pile):
                y = 20 + j * 25
                color = "red" if suit in ['H', 'D'] else "black"
                # Card background
                self.canvas.create_rectangle(x, y, x+cw, y+ch, fill="white", outline="gray", width=2)
                # Text
                txt = f"{val}{suit}"
                self.canvas.create_text(x+10, y+15, text=txt, fill=color, anchor="nw", font=("Arial", 12, "bold"))

    def reset(self):
        self.piles = [[] for _ in range(7)]
        self._deal()
        self._draw()
