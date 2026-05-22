import tkinter as tk
import random
from games.base_game import BaseGame
from utils.theme import THEME

class Maze(BaseGame):
    def __init__(self, parent):
        self.level = 1
        self._init_level_vars()
        self.cells = []
        super().__init__(parent, title="🌀 Laberinto", width=600, height=700)
        self.bind("<Key>", self._on_key)
        self.after(100, self.focus_set)

    def _init_level_vars(self):
        # El tamaño aumenta con el nivel: 7, 9, 11, ..., 25
        self.size = 5 + (self.level * 2) 
        self.maze = [[1] * self.size for _ in range(self.size)]
        self.player_pos = [1, 1]
        self.exit_pos = [self.size-2, self.size-2]
        self._generate_maze(1, 1)
        self.maze[self.exit_pos[0]][self.exit_pos[1]] = 0

    def get_tutorial_text(self):
        return (
            "OBJETIVO:\n"
            "Guiar al jugador (color morado) hacia la salida (color dorado).\n\n"
            "CONTROLES:\n"
            "- Usa las FLECHAS del teclado para moverte.\n\n"
            "CONSEJO:\n"
            "- ¡Si el personaje no se mueve, haz clic dentro del laberinto para activarlo!"
        )

    def _generate_maze(self, r, c):
        self.maze[r][c] = 0
        dirs = [(0, 2), (0, -2), (2, 0), (-2, 0)]
        random.shuffle(dirs)
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 < nr < self.size and 0 < nc < self.size and self.maze[nr][nc] == 1:
                self.maze[r + dr//2][c + dc//2] = 0
                self._generate_maze(nr, nc)

    def _build_ui(self):
        self.configure(bg=THEME["bg"])
        for widget in self.winfo_children():
            if widget != getattr(self, "tutorial_btn", None):
                widget.destroy()

        header = tk.Frame(self, bg=THEME["bg"])
        header.pack(pady=10)

        tk.Label(
            header, text=f"Nivel {self.level}/10", font=(THEME["font_mono"], 14, "bold"),
            bg=THEME["bg"], fg=THEME["accent"]
        ).pack()

        self.grid_frame = tk.Frame(self, bg="#2a2a3e", padx=2, pady=2)
        self.grid_frame.pack()

        self.cells = []
        cell_size = max(10, 300 // self.size)
        for r in range(self.size):
            row_cells = []
            for c in range(self.size):
                cell = tk.Frame(self.grid_frame, width=cell_size, height=cell_size)
                cell.grid(row=r, column=c)
                row_cells.append(cell)
            self.cells.append(row_cells)
        
        self._update_ui()

    def _update_ui(self):
        for r in range(self.size):
            for c in range(self.size):
                if [r, c] == self.player_pos: color = THEME["accent"]
                elif [r, c] == self.exit_pos: color = THEME["warning"]
                elif self.maze[r][c] == 1: color = "#1e1e2e"
                else: color = "#f9f6f2"
                self.cells[r][c].config(bg=color)

    def _on_key(self, event):
        dr, dc = 0, 0
        if event.keysym == "Up": dr = -1
        elif event.keysym == "Down": dr = 1
        elif event.keysym == "Left": dc = -1
        elif event.keysym == "Right": dc = 1
        
        nr, nc = self.player_pos[0] + dr, self.player_pos[1] + dc
        if 0 <= nr < self.size and 0 <= nc < self.size and self.maze[nr][nc] == 0:
            self.player_pos = [nr, nc]
            self._update_ui()
            if self.player_pos == self.exit_pos:
                if self.level < 10:
                    self.level += 1
                    self.after(500, self._next_level)
                else:
                    tk.Label(self, text="🏆 ¡MAESTRO DEL LABERINTO!", font=(THEME["font_mono"], 16, "bold"),
                             bg=THEME["bg"], fg=THEME["success"]).place(relx=0.5, rely=0.5, anchor="center")

    def _next_level(self):
        self._init_level_vars()
        self._build_ui()

    def reset(self):
        self.level = 1
        self._init_level_vars()
        self._build_ui()
        self.focus_set()
