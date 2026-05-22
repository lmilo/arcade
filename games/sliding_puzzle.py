import tkinter as tk
import random
from games.base_game import BaseGame
from utils.theme import THEME

class SlidingPuzzle(BaseGame):
    SIZE = 4

    def __init__(self, parent):
        self.tiles = list(range(1, self.SIZE**2)) + [None]
        self._shuffle_valid()
        self.buttons = []
        super().__init__(parent, title="🧩 Rompecabezas 15", width=400, height=560)

    def get_tutorial_text(self):
        return (
            "OBJETIVO:\n"
            "Ordenar los números del 1 al 15 en la cuadrícula, dejando el espacio vacío al final.\n\n"
            "CONTROLES:\n"
            "- Haz clic en una ficha adyacente al espacio vacío para deslizarla.\n\n"
            "REGLAS:\n"
            "- Solo puedes mover fichas que estén al lado (arriba, abajo, izquierda, derecha) del hueco."
        )

    def _shuffle_valid(self):
        # Hacer movimientos aleatorios desde el estado resuelto para asegurar que sea soluble
        for _ in range(200):
            idx = self.tiles.index(None)
            r, c = divmod(idx, self.SIZE)
            neighbors = []
            if r > 0: neighbors.append(idx - self.SIZE)
            if r < self.SIZE - 1: neighbors.append(idx + self.SIZE)
            if c > 0: neighbors.append(idx - 1)
            if c < self.SIZE - 1: neighbors.append(idx + 1)
            swap_idx = random.choice(neighbors)
            self.tiles[idx], self.tiles[swap_idx] = self.tiles[swap_idx], self.tiles[idx]

    def _build_ui(self):
        self.configure(bg=THEME["bg"])

        self.status_label = tk.Label(
            self, text="Ordena los números", font=(THEME["font_mono"], 14, "bold"),
            bg=THEME["bg"], fg=THEME["accent"]
        )
        self.status_label.pack(pady=20)

        grid_frame = tk.Frame(self, bg="#2a2a3e", padx=10, pady=10)
        grid_frame.pack()

        for i in range(self.SIZE**2):
            btn = tk.Button(
                grid_frame, text="", width=4, height=2,
                font=(THEME["font_mono"], 16, "bold"),
                relief="flat", bg=THEME["card"], fg=THEME["text"],
                command=lambda idx=i: self._on_click(idx)
            )
            btn.grid(row=i // self.SIZE, column=i % self.SIZE, padx=4, pady=4)
            self.buttons.append(btn)
        
        self._update_board()

        tk.Button(
            self, text="🔄 Reiniciar", bg=THEME["card"], fg=THEME["text"],
            command=self.reset
        ).pack(pady=20)

    def _update_board(self):
        for i, val in enumerate(self.tiles):
            if val is None:
                self.buttons[i].config(text="", bg="#0f0f1a", state="disabled")
            else:
                self.buttons[i].config(text=str(val), bg=THEME["card"], state="normal")

    def _on_click(self, idx):
        empty_idx = self.tiles.index(None)
        r1, c1 = divmod(idx, self.SIZE)
        r2, c2 = divmod(empty_idx, self.SIZE)

        if abs(r1 - r2) + abs(c1 - c2) == 1:
            self.tiles[idx], self.tiles[empty_idx] = self.tiles[empty_idx], self.tiles[idx]
            self._update_board()
            if self._check_win():
                self.status_label.config(text="🏆 ¡COMPLETADO!", fg=THEME["success"])

    def _check_win(self):
        return self.tiles == list(range(1, self.SIZE**2)) + [None]

    def reset(self):
        self.tiles = list(range(1, self.SIZE**2)) + [None]
        self._shuffle_valid()
        self.status_label.config(text="Ordena los números", fg=THEME["accent"])
        self._update_board()
