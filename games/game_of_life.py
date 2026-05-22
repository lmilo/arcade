import tkinter as tk
from games.base_game import BaseGame
from utils.theme import THEME

class GameOfLife(BaseGame):
    ROWS = 20
    COLS = 20

    def __init__(self, parent):
        self.grid = [[0] * self.COLS for _ in range(self.ROWS)]
        self.running = False
        self.cells = []
        super().__init__(parent, title="🧬 Juego de la Vida", width=460, height=600)

    def get_tutorial_text(self):
        return (
            "El Juego de la Vida es un autómata celular.\n\n"
            "REGLAS:\n"
            "1. Una célula viva con 2 o 3 vecinos vivos sobrevive.\n"
            "2. Una célula muerta con exactamente 3 vecinos vivos 'nace'.\n"
            "3. En cualquier otro caso, la célula muere o permanece muerta.\n\n"
            "INSTRUCCIONES:\n"
            "- Haz clic en las celdas para dibujar un patrón inicial.\n"
            "- Dale a 'Iniciar' para ver la evolución.\n"
            "- Puedes pausar y modificar el estado en cualquier momento."
        )

    def _build_ui(self):
        self.configure(bg=THEME["bg"])

        controls = tk.Frame(self, bg=THEME["bg"])
        controls.pack(pady=10)

        self.start_btn = tk.Button(
            controls, text="▶️ Iniciar", bg=THEME["card"], fg=THEME["text"],
            command=self._toggle_run
        )
        self.start_btn.pack(side="left", padx=10)

        tk.Button(
            controls, text="🔄 Limpiar", bg=THEME["card"], fg=THEME["text"],
            command=self.reset
        ).pack(side="left", padx=10)

        grid_frame = tk.Frame(self, bg="#2a2a3e", padx=2, pady=2)
        grid_frame.pack()

        for r in range(self.ROWS):
            row_cells = []
            for c in range(self.COLS):
                cell = tk.Frame(
                    grid_frame, width=18, height=18, bg=THEME["card"],
                    highlightbackground="#0f0f1a", highlightthickness=1
                )
                cell.grid(row=r, column=c)
                cell.bind("<Button-1>", lambda e, row=r, col=c: self._toggle_cell(row, col))
                row_cells.append(cell)
            self.cells.append(row_cells)

    def _toggle_cell(self, r, c):
        self.grid[r][c] = 1 - self.grid[r][c]
        color = THEME["success"] if self.grid[r][c] else THEME["card"]
        self.cells[r][c].config(bg=color)

    def _toggle_run(self):
        self.running = not self.running
        self.start_btn.config(text="⏸️ Pausar" if self.running else "▶️ Iniciar")
        if self.running:
            self._step()

    def _step(self):
        if not self.running:
            return

        new_grid = [[0] * self.COLS for _ in range(self.ROWS)]
        for r in range(self.ROWS):
            for c in range(self.COLS):
                neighbors = sum(
                    self.grid[i][j]
                    for i in range(r-1, r+2)
                    for j in range(c-1, c+2)
                    if 0 <= i < self.ROWS and 0 <= j < self.COLS and (i != r or j != c)
                )
                if self.grid[r][c] == 1:
                    new_grid[r][c] = 1 if 2 <= neighbors <= 3 else 0
                else:
                    new_grid[r][c] = 1 if neighbors == 3 else 0

        self.grid = new_grid
        self._update_ui()
        self.after(200, self._step)

    def _update_ui(self):
        for r in range(self.ROWS):
            for c in range(self.COLS):
                color = THEME["success"] if self.grid[r][c] else THEME["card"]
                self.cells[r][c].config(bg=color)

    def reset(self):
        self.running = False
        self.start_btn.config(text="▶️ Iniciar")
        self.grid = [[0] * self.COLS for _ in range(self.ROWS)]
        self._update_ui()
