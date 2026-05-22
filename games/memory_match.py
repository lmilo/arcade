import tkinter as tk
import random
import time
from games.base_game import BaseGame
from utils.theme import THEME, ICONS

class MemoryMatch(BaseGame):
    def __init__(self, parent):
        self.grid_size = 4
        self.symbols = ICONS["mem_syms"] * 2
        random.shuffle(self.symbols)
        
        self.buttons = []
        self.flipped_indices = []
        self.matched_count = 0
        self.is_busy = False
        
        super().__init__(parent, title="🃏 Memoria", width=400, height=520)

    def get_tutorial_text(self):
        return (
            "OBJETIVO:\n"
            "Encontrar todas las parejas de símbolos idénticos.\n\n"
            "CONTROLES:\n"
            "- Haz clic en una casilla para revelar su símbolo.\n\n"
            "REGLAS:\n"
            "- Revela dos casillas por turno.\n"
            "- Si coinciden, se quedan abiertas.\n"
            "- Si no coinciden, se volverán a ocultar tras un breve momento.\n"
            "- Ganas cuando todas las parejas han sido encontradas."
        )

    def _build_ui(self):
        self.configure(bg=THEME["bg"])

        self.status_label = tk.Label(
            self, text="Encuentra las parejas",
            font=(THEME["font_mono"], 14, "bold"),
            bg=THEME["bg"], fg=THEME["accent"]
        )
        self.status_label.pack(pady=20)

        board_frame = tk.Frame(self, bg=THEME["bg"])
        board_frame.pack()

        for i in range(16):
            btn = tk.Button(
                board_frame, text="?", width=4, height=2,
                font=(THEME["font_mono"], 18, "bold"),
                bg=THEME["card"], fg=THEME["text"],
                relief="flat", activebackground=THEME["accent"],
                command=lambda idx=i: self._on_card_click(idx)
            )
            btn.grid(row=i // 4, column=i % 4, padx=5, pady=5)
            self.buttons.append(btn)

        tk.Button(
            self, text="🔄 Reiniciar",
            font=(THEME["font_mono"], 11),
            bg=THEME["card"], fg=THEME["text"],
            relief="flat", padx=10, pady=6,
            command=self.reset
        ).pack(pady=20)

    def _on_card_click(self, idx):
        if self.is_busy or idx in self.flipped_indices or self.buttons[idx].cget("state") == "disabled":
            return

        self.buttons[idx].config(text=self.symbols[idx], bg="#2d2d4d")
        self.flipped_indices.append(idx)

        if len(self.flipped_indices) == 2:
            self.is_busy = True
            self.after(600, self._check_match)

    def _check_match(self):
        i1, i2 = self.flipped_indices
        if self.symbols[i1] == self.symbols[i2]:
            self.buttons[i1].config(state="disabled", bg=THEME["success"])
            self.buttons[i2].config(state="disabled", bg=THEME["success"])
            self.matched_count += 2
            if self.matched_count == 16:
                self.status_label.config(text="🏆 ¡Lo lograste!", fg=THEME["warning"])
        else:
            self.buttons[i1].config(text="?", bg=THEME["card"])
            self.buttons[i2].config(text="?", bg=THEME["card"])

        self.flipped_indices = []
        self.is_busy = False

    def reset(self):
        random.shuffle(self.symbols)
        self.flipped_indices = []
        self.matched_count = 0
        self.is_busy = False
        self.status_label.config(text="Encuentra las parejas", fg=THEME["accent"])
        for btn in self.buttons:
            btn.config(text="?", state="normal", bg=THEME["card"])
