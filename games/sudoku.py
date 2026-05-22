import tkinter as tk
import random
from games.base_game import BaseGame
from utils.theme import THEME

class Sudoku(BaseGame):
    # Tableros base válidos para cada tamaño
    BASE_BOARDS = {
        4: {
            "b": [[1,2,3,4],[3,4,1,2],[2,3,4,1],[4,1,2,3]],
            "rows": 2, "cols": 2
        },
        6: {
            "b": [[1,2,3,4,5,6],[4,5,6,1,2,3],[2,3,1,5,6,4],[5,6,4,2,3,1],[3,1,2,6,4,5],[6,4,5,3,1,2]],
            "rows": 2, "cols": 3
        },
        9: {
            "b": [
                [5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],
                [8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],
                [9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9]
            ],
            "rows": 3, "cols": 3
        },
        12: {
            "b": [
                [1,2,3,4,5,6,7,8,9,10,11,12],[5,6,7,8,9,10,11,12,1,2,3,4],[9,10,11,12,1,2,3,4,5,6,7,8],
                [2,3,4,5,6,7,8,9,10,11,12,1],[6,7,8,9,10,11,12,1,2,3,4,5],[10,11,12,1,2,3,4,5,6,7,8,9],
                [3,4,5,6,7,8,9,10,11,12,1,2],[7,8,9,10,11,12,1,2,3,4,5,6],[11,12,1,2,3,4,5,6,7,8,9,10],
                [4,5,6,7,8,9,10,11,12,1,2,3],[8,9,10,11,12,1,2,3,4,5,6,7],[12,1,2,3,4,5,6,7,8,9,10,11]
            ],
            "rows": 3, "cols": 4
        }
    }

    def __init__(self, parent):
        self.size = None
        self.block_rows = 0
        self.block_cols = 0
        self.puzzle = []
        self.solution = []
        self.entries = []
        # Título genérico al inicio
        super().__init__(parent, title="🔢 Sudoku Maestro", width=500, height=650)

    def get_tutorial_text(self):
        if not self.size:
            return "Selecciona un tamaño para ver las reglas específicas."
        return (
            f"OBJETIVO:\n"
            f"Rellenar la cuadrícula de {self.size}x{self.size} con los números del 1 al {self.size}.\n\n"
            f"REGLAS:\n"
            f"- Cada fila y columna debe contener los números del 1 al {self.size} sin repetir.\n"
            f"- Cada sub-cuadrícula de {self.block_rows}x{self.block_cols} (bordes marcados) "
            f"debe contener todos los números sin repetir."
        )

    def _build_ui(self):
        self.configure(bg=THEME["bg"])
        # Limpiar UI previa
        for widget in self.winfo_children():
            if widget != getattr(self, "tutorial_btn", None):
                widget.destroy()

        if not self.size:
            self._show_menu()
        else:
            self._draw_grid()

    def _show_menu(self):
        tk.Label(
            self, text="Selecciona el tamaño del Sudoku",
            font=(THEME["font_mono"], 16, "bold"),
            bg=THEME["bg"], fg=THEME["accent"]
        ).pack(pady=40)

        btn_frame = tk.Frame(self, bg=THEME["bg"])
        btn_frame.pack(expand=True)

        sizes = [("Mini (4x4)", 4), ("Medio (6x6)", 6), ("Clásico (9x9)", 9), ("Grande (12x12)", 12)]
        for label, s in sizes:
            tk.Button(
                btn_frame, text=label, width=20, font=(THEME["font_mono"], 12),
                bg=THEME["card"], fg=THEME["text"], pady=10,
                command=lambda val=s: self._start_game(val)
            ).pack(pady=10)

    def _start_game(self, size):
        self.size = size
        config = self.BASE_BOARDS[size]
        self.block_rows = config["rows"]
        self.block_cols = config["cols"]
        self._generate_puzzle(config["b"])
        self._build_ui()
        # Ajustar geometría tras crear la cuadrícula
        self.update_idletasks()
        rw = self.winfo_reqwidth()
        rh = self.winfo_reqheight()
        self.geometry(f"{max(500, rw + 40)}x{max(600, rh + 40)}")

    def _generate_puzzle(self, base_board):
        # 1. Copiar base
        board = [row[:] for row in base_board]
        
        # 2. Barajar dígitos
        digits = list(range(1, self.size + 1))
        mapping = list(range(1, self.size + 1))
        random.shuffle(mapping)
        digit_map = dict(zip(digits, mapping))
        
        for r in range(self.size):
            for c in range(self.size):
                board[r][c] = digit_map[board[r][c]]
        
        # 3. Barajar filas dentro de bloques
        for b in range(0, self.size, self.block_rows):
            rows_in_block = board[b : b + self.block_rows]
            random.shuffle(rows_in_block)
            board[b : b + self.block_rows] = rows_in_block

        # Guardar solución
        self.solution = [row[:] for row in board]
        
        # 4. Quitar números para crear puzzle (aprox 50-60%)
        self.puzzle = [row[:] for row in board]
        to_remove = int(self.size * self.size * 0.55)
        removed = 0
        while removed < to_remove:
            r, c = random.randint(0, self.size-1), random.randint(0, self.size-1)
            if self.puzzle[r][c] != 0:
                self.puzzle[r][c] = 0
                removed += 1

    def _draw_grid(self):
        tk.Label(
            self, text=f"Sudoku {self.size}x{self.size}",
            font=(THEME["font_mono"], 16, "bold"),
            bg=THEME["bg"], fg=THEME["accent"]
        ).pack(pady=10)

        grid_container = tk.Frame(self, bg=THEME["accent"], padx=2, pady=2)
        grid_container.pack(pady=5)

        self.entries = []
        cell_font = (THEME["font_mono"], 12 if self.size < 9 else 10, "bold")
        entry_font = (THEME["font_mono"], 14 if self.size < 9 else 11, "bold")
        cell_w = 4 if self.size < 9 else 3

        for r in range(self.size):
            row_entries = []
            for c in range(self.size):
                # Determinar bordes para simular bloques
                padx = (2 if c % self.block_cols == 0 and c > 0 else 1)
                pady = (2 if r % self.block_rows == 0 and r > 0 else 1)
                
                cell_frame = tk.Frame(grid_container, bg=THEME["bg"], padx=padx, pady=pady)
                cell_frame.grid(row=r, column=c, sticky="nsew")

                val = self.puzzle[r][c]
                if val != 0:
                    lbl = tk.Label(
                        cell_frame, text=str(val), width=cell_w, height=2,
                        font=cell_font, bg="#2a2a3e", fg=THEME["text"]
                    )
                    lbl.pack(expand=True, fill="both")
                    row_entries.append(lbl)
                else:
                    ent = tk.Entry(
                        cell_frame, width=cell_w, font=entry_font,
                        justify="center", bg=THEME["card"], fg=THEME["accent"],
                        insertbackground=THEME["text"], relief="flat"
                    )
                    ent.pack(expand=True, fill="both", ipady=5 if self.size < 9 else 2)
                    row_entries.append(ent)
            self.entries.append(row_entries)

        self.status_label = tk.Label(self, text="¡Buena suerte!", bg=THEME["bg"], fg=THEME["text"])
        self.status_label.pack(pady=10)

        cmd_frame = tk.Frame(self, bg=THEME["bg"])
        cmd_frame.pack(pady=10)
        
        tk.Button(cmd_frame, text="✅ Validar", command=self._validate, bg=THEME["card"], fg=THEME["text"]).pack(side="left", padx=10)
        tk.Button(cmd_frame, text="🔙 Menú", command=self.reset, bg=THEME["card"], fg=THEME["text"]).pack(side="left", padx=10)

    def _validate(self):
        correct = True
        for r in range(self.size):
            for c in range(self.size):
                if isinstance(self.entries[r][c], tk.Entry):
                    user_val = self.entries[r][c].get()
                    if user_val != str(self.solution[r][c]):
                        correct = False
                        self.entries[r][c].config(bg=THEME["danger"])
                    else:
                        self.entries[r][c].config(bg="#1d3d2d")
        
        if correct:
            self.status_label.config(text="🏆 ¡EXCELENTE!", fg=THEME["success"])
        else:
            self.status_label.config(text="❌ Hay errores", fg=THEME["danger"])

    def reset(self):
        self.size = None
        self._build_ui()
        self.geometry("500x650")
