import tkinter as tk
import random
from games.base_game import BaseGame
from utils.theme import THEME

class Game2048(BaseGame):
    SIZE = 4

    def __init__(self, parent):
        self.grid = [[0] * self.SIZE for _ in range(self.SIZE)]
        self.score = 0
        self.cells = []
        super().__init__(parent, title="🔢 2048", width=400, height=560)
        self.bind("<Key>", self._on_key)
        self.after(100, self.focus_set) # Forzar foco al iniciar

    def get_tutorial_text(self):
        return (
            "El objetivo es deslizar las baldosas para combinarlas y llegar al número 2048.\n\n"
            "CONTROLES:\n"
            "- Usa las FLECHAS del teclado para mover todas las baldosas.\n"
            "- Cuando dos baldosas con el mismo número se tocan, se fusionan en una sola con la suma de ambos.\n\n"
            "CONSEJO:\n"
            "- ¡Si las teclas no funcionan, haz clic dentro del tablero para activar el juego!"
        )

    def _build_ui(self):
        self.configure(bg=THEME["bg"])

        self.score_label = tk.Label(
            self, text="Puntuación: 0", font=(THEME["font_mono"], 14, "bold"),
            bg=THEME["bg"], fg=THEME["accent"]
        )
        self.score_label.pack(pady=10)

        grid_frame = tk.Frame(self, bg="#2a2a3e", padx=10, pady=10)
        grid_frame.pack()

        for r in range(self.SIZE):
            row_cells = []
            for c in range(self.SIZE):
                cell = tk.Label(
                    grid_frame, text="", width=6, height=3,
                    font=(THEME["font_mono"], 14, "bold"),
                    bg=THEME["card"], fg=THEME["text"]
                )
                cell.grid(row=r, column=c, padx=5, pady=5)
                row_cells.append(cell)
            self.cells.append(row_cells)

        tk.Button(
            self, text="🔄 Reiniciar", bg=THEME["card"], fg=THEME["text"],
            command=self.reset
        ).pack(pady=10)

        self._add_new_tile()
        self._add_new_tile()
        self._update_board()

    def _add_new_tile(self):
        empty_cells = [(r, c) for r in range(self.SIZE) for c in range(self.SIZE) if self.grid[r][c] == 0]
        if empty_cells:
            r, c = random.choice(empty_cells)
            self.grid[r][c] = 2 if random.random() < 0.9 else 4

    def _update_board(self):
        colors = {
            2: "#eee4da", 4: "#ede0c8", 8: "#f2b179", 16: "#f59563",
            32: "#f67c5f", 64: "#f65e3b", 128: "#edcf72", 256: "#edcc61",
            512: "#edc850", 1024: "#edc53f", 2048: "#edc22e"
        }
        for r in range(self.SIZE):
            for c in range(self.SIZE):
                val = self.grid[r][c]
                self.cells[r][c].config(
                    text=str(val) if val != 0 else "",
                    bg=colors.get(val, THEME["card"]),
                    fg="#776e65" if val < 8 else "#f9f6f2"
                )
        self.score_label.config(text=f"Puntuación: {self.score}")

    def _on_key(self, event):
        key = event.keysym
        moved = False
        if key == "Up": moved = self._move(3)
        elif key == "Down": moved = self._move(1)
        elif key == "Left": moved = self._move(0)
        elif key == "Right": moved = self._move(2)

        if moved:
            self._add_new_tile()
            self._update_board()
            if self._is_game_over():
                self.score_label.config(text="GAME OVER", fg=THEME["danger"])

    def _move(self, direction):
        # 0: Up, 1: Right, 2: Down, 3: Left
        def rotate(grid):
            return [list(r) for r in zip(*grid[::-1])]
        
        temp_grid = self.grid
        for _ in range(direction):
            temp_grid = rotate(temp_grid)
        
        new_grid = []
        moved = False
        for row in temp_grid:
            # Compress
            non_zero = [v for v in row if v != 0]
            # Merge
            for i in range(len(non_zero)-1):
                if non_zero[i] == non_zero[i+1]:
                    non_zero[i] *= 2
                    self.score += non_zero[i]
                    non_zero[i+1] = 0
            non_zero = [v for v in non_zero if v != 0]
            new_row = non_zero + [0] * (self.SIZE - len(non_zero))
            if new_row != row: moved = True
            new_grid.append(new_row)
        
        for _ in range((4 - direction) % 4):
            new_grid = rotate(new_grid)
        
        self.grid = new_grid
        return moved

    def _is_game_over(self):
        if any(0 in row for row in self.grid): return False
        for r in range(self.SIZE):
            for c in range(self.SIZE-1):
                if self.grid[r][c] == self.grid[r][c+1] or self.grid[c][r] == self.grid[c+1][r]:
                    return False
        return True

    def reset(self):
        self.grid = [[0] * self.SIZE for _ in range(self.SIZE)]
        self.score = 0
        self._add_new_tile()
        self._add_new_tile()
        self._update_board()
        self.focus_set()
