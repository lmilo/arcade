import tkinter as tk
import random
from games.base_game import BaseGame
from utils.theme import THEME, ICONS


class Minesweeper(BaseGame):

    ROWS = 9
    COLS = 9
    MINES = 10

    def __init__(self, parent):
        self.board = []
        self.revealed = []
        self.flagged = []
        self.buttons = []
        self.game_over = False
        self.first_click = True
        self.cells_revealed = 0
        self.board_frame = None
        super().__init__(parent, title="Buscaminas", width=420, height=540) # Aumentar alto para tutorial button

    def get_tutorial_text(self):
        return (
            "OBJETIVO:\n"
            "Revelar todas las casillas que no contienen minas.\n\n"
            "CONTROLES:\n"
            "- Clic IZQUIERDO: Revelar casilla.\n"
            "- Clic DERECHO: Poner/Quitar bandera en una mina sospechosa.\n\n"
            "REGLAS:\n"
            "- Si revelas una mina, pierdes.\n"
            "- Los números indican cuántas minas hay en las 8 casillas adyacentes.\n"
            "- ¡Usa la lógica para descartar posiciones!"
        )

    # ------------------------------------------------------------------ UI ---

    def _build_ui(self):
        self.configure(bg=THEME["bg"])

        # Header
        header = tk.Frame(self, bg=THEME["bg"])
        header.pack(pady=(14, 6))

        self.mine_label = tk.Label(
            header, text=f"{ICONS['mine']} {self.MINES}",
            font=(THEME["font_mono"], 13, "bold"),
            bg=THEME["bg"], fg=THEME["danger"]
        )
        self.mine_label.pack(side="left", padx=12)

        self.status_label = tk.Label(
            header, text=ICONS["smile"],
            font=(THEME["font_mono"], 16),
            bg=THEME["bg"], fg=THEME["text"]
        )
        self.status_label.pack(side="left", padx=20)

        self.flag_label = tk.Label(
            header, text=f"{ICONS['flag']} 0",
            font=(THEME["font_mono"], 13, "bold"),
            bg=THEME["bg"], fg=THEME["warning"]
        )
        self.flag_label.pack(side="left", padx=12)

        # Tablero
        self.board_frame = tk.Frame(self, bg=THEME["bg"])
        self.board_frame.pack(padx=10, pady=6)
        self._build_board()

        # Botón reset
        tk.Button(
            self, text=ICONS["reset"],
            font=(THEME["font_mono"], 11),
            bg=THEME["card"], fg=THEME["text"],
            relief="flat", padx=10, pady=6,
            activebackground=THEME["accent"],
            command=self.reset
        ).pack(pady=10)

        self._init_board()

    def _build_board(self):
        """Construye solo el grid de botones dentro de board_frame."""
        for widget in self.board_frame.winfo_children():
            widget.destroy()
        self.buttons = []

        for r in range(self.ROWS):
            row_btns = []
            for c in range(self.COLS):
                btn = tk.Button(
                    self.board_frame,
                    text="", width=2, height=1,
                    font=(THEME["font_mono"], 12, "bold"),
                    bg=THEME["card"], fg=THEME["text"],
                    relief="raised", bd=2,
                )
                btn.grid(row=r, column=c, padx=1, pady=1)
                btn.bind("<Button-1>", lambda e, row=r, col=c: self._on_left(row, col))
                btn.bind("<Button-3>", lambda e, row=r, col=c: self._on_right(row, col))
                row_btns.append(btn)
            self.buttons.append(row_btns)

    # --------------------------------------------------------- Board logic ---

    def _init_board(self):
        self.board    = [[0] * self.COLS for _ in range(self.ROWS)]
        self.revealed = [[False] * self.COLS for _ in range(self.ROWS)]
        self.flagged  = [[False] * self.COLS for _ in range(self.ROWS)]
        self.game_over = False
        self.first_click = True
        self.cells_revealed = 0

    def _place_mines(self, safe_r: int, safe_c: int):
        safe_zone = {
            (safe_r + dr, safe_c + dc)
            for dr in range(-1, 2)
            for dc in range(-1, 2)
        }
        candidates = [
            (r, c)
            for r in range(self.ROWS)
            for c in range(self.COLS)
            if (r, c) not in safe_zone
        ]
        for r, c in random.sample(candidates, self.MINES):
            self.board[r][c] = -1

        for r in range(self.ROWS):
            for c in range(self.COLS):
                if self.board[r][c] == -1:
                    continue
                self.board[r][c] = sum(
                    1 for dr in range(-1, 2)
                    for dc in range(-1, 2)
                    if 0 <= r + dr < self.ROWS
                    and 0 <= c + dc < self.COLS
                    and self.board[r + dr][c + dc] == -1
                )

    def _flood_fill(self, r: int, c: int):
        if not (0 <= r < self.ROWS and 0 <= c < self.COLS):
            return
        if self.revealed[r][c] or self.flagged[r][c]:
            return

        self.revealed[r][c] = True
        self.cells_revealed += 1
        self._render_cell(r, c)

        if self.board[r][c] == 0:
            for dr in range(-1, 2):
                for dc in range(-1, 2):
                    if dr != 0 or dc != 0:
                        self._flood_fill(r + dr, c + dc)

    # ---------------------------------------------------------- Rendering ---

    NUMBER_COLORS = {
        1: "#3b82f6", 2: "#22c55e", 3: "#ef4444",
        4: "#7c3aed", 5: "#f59e0b", 6: "#06b6d4",
        7: "#ec4899", 8: "#e2e8f0",
    }

    def _render_cell(self, r: int, c: int):
        btn = self.buttons[r][c]
        val = self.board[r][c]

        if val == -1:
            btn.config(text=ICONS["mine"], bg=THEME["danger"], relief="sunken", state="disabled")
        elif val == 0:
            btn.config(text="", bg="#2a2a3e", relief="sunken", state="disabled")
        else:
            btn.config(
                text=str(val),
                fg=self.NUMBER_COLORS.get(val, THEME["text"]),
                bg="#2a2a3e", relief="sunken", state="disabled"
            )

    # ------------------------------------------------------------ Events ---

    def _on_left(self, r: int, c: int):
        if self.game_over or self.revealed[r][c] or self.flagged[r][c]:
            return

        if self.first_click:
            self._place_mines(r, c)
            self.first_click = False

        if self.board[r][c] == -1:
            self._game_lost(r, c)
            return

        self._flood_fill(r, c)

        safe_cells = self.ROWS * self.COLS - self.MINES
        if self.cells_revealed >= safe_cells:
            self._game_won()

    def _on_right(self, r: int, c: int):
        if self.game_over or self.revealed[r][c]:
            return

        self.flagged[r][c] = not self.flagged[r][c]
        flags = sum(
            self.flagged[ri][ci]
            for ri in range(self.ROWS)
            for ci in range(self.COLS)
        )
        self.flag_label.config(text=f"{ICONS['flag']} {flags}")

        if self.flagged[r][c]:
            self.buttons[r][c].config(
                text=ICONS["flag"], fg=THEME["warning"],
                bg="#3a2a0e", relief="raised"
            )
        else:
            self.buttons[r][c].config(
                text="", fg=THEME["text"],
                bg=THEME["card"], relief="raised"
            )

    # ------------------------------------------------------- Game states ---

    def _game_lost(self, hit_r: int, hit_c: int):
        self.game_over = True
        self.status_label.config(text=ICONS["lose"])
        for r in range(self.ROWS):
            for c in range(self.COLS):
                if self.board[r][c] == -1:
                    self.buttons[r][c].config(
                        text=ICONS["mine"],
                        bg=THEME["danger"] if (r == hit_r and c == hit_c) else THEME["card"],
                        relief="sunken", state="disabled"
                    )

    def _game_won(self):
        self.game_over = True
        self.status_label.config(text=ICONS["win"])
        self.mine_label.config(text=f"{ICONS['mine']} 0", fg=THEME["success"])

    # ------------------------------------------------------------ Reset ---

    def reset(self):
        self._init_board()
        self.status_label.config(text=ICONS["smile"], fg=THEME["text"])
        self.mine_label.config(text=f"{ICONS['mine']} {self.MINES}", fg=THEME["danger"])
        self.flag_label.config(text=f"{ICONS['flag']} 0")
        self._build_board()
