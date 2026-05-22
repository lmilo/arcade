import tkinter as tk
from games.base_game import BaseGame
from utils.theme import THEME

class ConnectFour(BaseGame):
    ROWS = 6
    COLS = 7

    def __init__(self, parent):
        self.board = [["" for _ in range(self.COLS)] for _ in range(self.ROWS)]
        self.current_player = "🔴"
        self.buttons = []
        self.game_over = False
        super().__init__(parent, title="🔴 Cuatro en Raya", width=500, height=620)

    def get_tutorial_text(self):
        return (
            "OBJETIVO:\n"
            "Ser el primero en formar una línea de 4 fichas de tu color (vertical, horizontal o diagonal).\n\n"
            "CONTROLES:\n"
            "- Haz clic en cualquier columna para soltar una ficha.\n\n"
            "REGLAS:\n"
            "- Las fichas siempre caen al espacio más bajo disponible debido a la gravedad.\n"
            "- El juego alterna entre el jugador Rojo 🔴 y el Amarillo 🟡."
        )

    def _build_ui(self):
        self.configure(bg=THEME["bg"])

        # Header
        self.status_label = tk.Label(
            self, text="Turno: 🔴", 
            font=(THEME["font_mono"], 14, "bold"),
            bg=THEME["bg"], fg=THEME["danger"]
        )
        self.status_label.pack(pady=(20, 10))

        # Tablero
        board_frame = tk.Frame(self, bg="#2a2a3e", padx=10, pady=10)
        board_frame.pack()

        for r in range(self.ROWS):
            row_btns = []
            for c in range(self.COLS):
                btn = tk.Canvas(
                    board_frame, width=50, height=50,
                    bg="#1e1e2e", highlightthickness=0
                )
                btn.grid(row=r, column=c, padx=4, pady=4)
                # Dibujar círculo vacío
                btn.create_oval(5, 5, 45, 45, fill="#0f0f1a", outline="#3f3f5a", width=2, tags="circle")
                btn.bind("<Button-1>", lambda e, col=c: self._on_column_click(col))
                row_btns.append(btn)
            self.buttons.append(row_btns)

        # Controles de columna (botones arriba para mayor claridad, opcional)
        # Pero seguiremos la lógica de hacer clic en cualquier parte de la columna
        
        # Botón Reset
        tk.Button(
            self, text="🔄 Reiniciar",
            font=(THEME["font_mono"], 11),
            bg=THEME["card"], fg=THEME["text"],
            relief="flat", padx=10, pady=6,
            activebackground=THEME["accent"],
            command=self.reset
        ).pack(pady=20)

    def _on_column_click(self, col: int):
        if self.game_over:
            return

        # Encontrar la fila más baja disponible en esa columna
        row = -1
        for r in range(self.ROWS - 1, -1, -1):
            if self.board[r][col] == "":
                row = r
                break
        
        if row == -1:
            return # Columna llena

        # Colocar pieza
        self.board[row][col] = self.current_player
        self._draw_piece(row, col, self.current_player)

        # Verificar victoria
        if self._check_winner(row, col):
            self.status_label.config(
                text=f"🏆 ¡Ganó {self.current_player}!",
                fg=THEME["warning"]
            )
            self.game_over = True
        elif all(self.board[0][c] != "" for c in range(self.COLS)):
            self.status_label.config(text="🤝 ¡Empate!", fg=THEME["warning"])
            self.game_over = True
        else:
            # Cambiar turno
            if self.current_player == "🔴":
                self.current_player = "🟡"
                color = THEME["warning"]
            else:
                self.current_player = "🔴"
                color = THEME["danger"]
            self.status_label.config(text=f"Turno: {self.current_player}", fg=color)

    def _draw_piece(self, row: int, col: int, player: str):
        color = THEME["danger"] if player == "🔴" else THEME["warning"]
        canvas = self.buttons[row][col]
        canvas.itemconfig("circle", fill=color, outline=color)

    def _check_winner(self, r: int, c: int):
        player = self.board[r][c]
        directions = [(0, 1), (1, 0), (1, 1), (1, -1)] # Horiz, Vert, Diag\, Diag/

        for dr, dc in directions:
            count = 1
            # Buscar en una dirección
            for i in range(1, 4):
                nr, nc = r + dr * i, c + dc * i
                if 0 <= nr < self.ROWS and 0 <= nc < self.COLS and self.board[nr][nc] == player:
                    count += 1
                else:
                    break
            # Buscar en la dirección opuesta
            for i in range(1, 4):
                nr, nc = r - dr * i, c - dc * i
                if 0 <= nr < self.ROWS and 0 <= nc < self.COLS and self.board[nr][nc] == player:
                    count += 1
                else:
                    break
            
            if count >= 4:
                return True
        return False

    def reset(self):
        self.board = [["" for _ in range(self.COLS)] for _ in range(self.ROWS)]
        self.current_player = "🔴"
        self.game_over = False
        self.status_label.config(text="Turno: 🔴", fg=THEME["danger"])
        for r in range(self.ROWS):
            for c in range(self.COLS):
                self.buttons[r][c].itemconfig("circle", fill="#0f0f1a", outline="#3f3f5a")
