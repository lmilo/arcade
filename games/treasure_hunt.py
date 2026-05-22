import tkinter as tk
import random
import math
from games.base_game import BaseGame
from utils.theme import THEME

class TreasureHunt(BaseGame):
    SIZE = 8

    def __init__(self, parent):
        self.treasure_pos = (random.randint(0, self.SIZE-1), random.randint(0, self.SIZE-1))
        self.attempts = 0
        self.buttons = []
        self.game_over = False
        super().__init__(parent, title="🗺️ Busca el Tesoro", width=420, height=560)

    def get_tutorial_text(self):
        return (
            "OBJETIVO:\n"
            "Encontrar el diamante 💎 escondido en la cuadrícula en el menor número de intentos.\n\n"
            "CONTROLES:\n"
            "- Haz clic en cualquier casilla '?' para buscar.\n\n"
            "PISTAS:\n"
            "- 🔥 ¡Hirviendo!: El tesoro está muy cerca.\n"
            "- ☀️ Caliente: Estás cerca.\n"
            "- ❄️ Frío: El tesoro está lejos."
        )

    def _build_ui(self):
        self.configure(bg=THEME["bg"])

        self.status_label = tk.Label(
            self, text="¡Busca el tesoro escondido!",
            font=(THEME["font_mono"], 12, "bold"),
            bg=THEME["bg"], fg=THEME["text"]
        )
        self.status_label.pack(pady=10)

        self.dist_label = tk.Label(
            self, text="Pista: ???",
            font=(THEME["font_mono"], 11),
            bg=THEME["bg"], fg=THEME["accent"]
        )
        self.dist_label.pack(pady=5)

        board_frame = tk.Frame(self, bg=THEME["bg"])
        board_frame.pack(padx=10)

        for r in range(self.SIZE):
            row_btns = []
            for c in range(self.SIZE):
                btn = tk.Button(
                    board_frame, text="?", width=3, height=1,
                    bg=THEME["card"], fg=THEME["text"], relief="flat",
                    command=lambda row=r, col=c: self._on_click(row, col)
                )
                btn.grid(row=r, column=c, padx=2, pady=2)
                row_btns.append(btn)
            self.buttons.append(row_btns)

        self.attempts_label = tk.Label(
            self, text="Intentos: 0",
            font=(THEME["font_mono"], 10),
            bg=THEME["bg"], fg=THEME["text"]
        )
        self.attempts_label.pack(pady=10)

        tk.Button(
            self, text="🔄 Reiniciar",
            bg=THEME["card"], fg=THEME["text"], relief="flat",
            command=self.reset
        ).pack(pady=5)

    def _on_click(self, r, c):
        if self.game_over:
            return

        self.attempts += 1
        self.attempts_label.config(text=f"Intentos: {self.attempts}")

        if (r, c) == self.treasure_pos:
            self.buttons[r][c].config(text="💎", bg=THEME["success"], state="disabled")
            self.status_label.config(text="🏆 ¡TESORO ENCONTRADO!", fg=THEME["success"])
            self.dist_label.config(text="¡Felicidades!", fg=THEME["success"])
            self.game_over = True
        else:
            dist = math.sqrt((r - self.treasure_pos[0])**2 + (c - self.treasure_pos[1])**2)
            if dist < 2:
                hint, color = "🔥 ¡Hirviendo!", THEME["danger"]
            elif dist < 4:
                hint, color = "☀️ Caliente", THEME["warning"]
            else:
                hint, color = "❄️ Frío", "#3b82f6"
            
            self.buttons[r][c].config(text="X", bg="#2a2a3e", state="disabled")
            self.dist_label.config(text=f"Pista: {hint}", fg=color)

    def reset(self):
        self.treasure_pos = (random.randint(0, self.SIZE-1), random.randint(0, self.SIZE-1))
        self.attempts = 0
        self.game_over = False
        self.status_label.config(text="¡Busca el tesoro escondido!", fg=THEME["text"])
        self.dist_label.config(text="Pista: ???", fg=THEME["accent"])
        self.attempts_label.config(text="Intentos: 0")
        for row in self.buttons:
            for btn in row:
                btn.config(text="?", bg=THEME["card"], state="normal")
