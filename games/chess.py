import tkinter as tk
from games.base_game import BaseGame
from utils.theme import THEME

class Chess(BaseGame):
    def __init__(self, parent):
        self.board = self._create_board()
        self.selected_piece = None
        self.turn = "white"
        super().__init__(parent, title="♟️ Ajedrez", width=500, height=600)

    def get_tutorial_text(self):
        return (
            "OBJETIVO:\n"
            "Poner al Rey oponente en Jaque Mate.\n\n"
            "REGLAS:\n"
            "- Cada pieza tiene su movimiento único.\n"
            "- No puedes saltar piezas (excepto el Caballo).\n"
            "- No puedes moverte a una casilla de tu mismo color.\n"
            "- No puedes dejar a tu propio Rey en jaque."
        )

    def _create_board(self):
        # r, n, b, q, k, b, n, r (lowercase black, uppercase white)
        board = [
            ["r", "n", "b", "q", "k", "b", "n", "r"],
            ["p"] * 8,
            [None] * 8, [None] * 8, [None] * 8, [None] * 8,
            ["P"] * 8,
            ["R", "N", "B", "Q", "K", "B", "N", "R"]
        ]
        return board

    def _build_ui(self):
        self.canvas = tk.Canvas(self, width=400, height=400, bg=THEME["bg"], highlightthickness=0)
        self.canvas.pack(pady=20)
        self.canvas.bind("<Button-1>", self._on_click)
        
        self.info_label = tk.Label(self, text="Turno: Blancas", bg=THEME["bg"], fg=THEME["text"])
        self.info_label.pack()
        
        self._draw_board()

    def _draw_board(self):
        self.canvas.delete("all")
        size = 50
        colors = ["#eeeed2", "#769656"]
        
        piece_symbols = {
            "r": "♜", "n": "♞", "b": "♝", "q": "♛", "k": "♚", "p": "♟",
            "R": "♖", "N": "♘", "B": "♗", "Q": "♕", "K": "♔", "P": "♙"
        }

        for r in range(8):
            for c in range(8):
                x1, y1 = c * size, r * size
                x2, y2 = x1 + size, y1 + size
                color = colors[(r + c) % 2]
                
                # Highlight selection
                if self.selected_piece == (r, c):
                    color = THEME["warning"]
                
                self.canvas.create_rectangle(x1, y1, x2, y2, fill=color, outline="")
                
                piece = self.board[r][c]
                if piece:
                    self.canvas.create_text(x1 + size/2, y1 + size/2, text=piece_symbols[piece], font=("Arial", 30))

    def _on_click(self, event):
        c, r = event.x // 50, event.y // 50
        if not (0 <= r < 8 and 0 <= c < 8): return

        if self.selected_piece:
            sr, sc = self.selected_piece
            if (sr, sc) != (r, c):
                # Basic move (no validation for now, just basic jump check)
                target = self.board[r][c]
                # Check color
                piece = self.board[sr][sc]
                is_white = piece.isupper()
                if is_white and (not target or target.islower()):
                    self.board[r][c] = piece
                    self.board[sr][sc] = None
                    self.turn = "black" if is_white else "white"
                    self.info_label.config(text=f"Turno: {'Negras' if self.turn == 'black' else 'Blancas'}")
            self.selected_piece = None
        else:
            piece = self.board[r][c]
            if piece and ((self.turn == "white" and piece.isupper()) or (self.turn == "black" and piece.islower())):
                self.selected_piece = (r, c)
        
        self._draw_board()

    def reset(self):
        self.board = self._create_board()
        self.turn = "white"
        self.selected_piece = None
        self._draw_board()
