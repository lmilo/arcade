import tkinter as tk
from games.base_game import BaseGame
from utils.theme import THEME

class Checkers(BaseGame):
    def __init__(self, parent):
        self.board = self._create_board()
        self.selected = None
        self.turn = 1 # 1: Red, 2: Black
        super().__init__(parent, title="🏁 Damas", width=500, height=600)

    def get_tutorial_text(self):
        return (
            "OBJETIVO:\n"
            "Capturar todas las fichas del oponente.\n\n"
            "REGLAS:\n"
            "- Las fichas mueven en diagonal.\n"
            "- Capturas saltando sobre la ficha rival.\n"
            "- Las fichas normales NO pueden retroceder."
        )

    def _create_board(self):
        board = [[0] * 8 for _ in range(8)]
        for r in range(3):
            for c in range(8):
                if (r + c) % 2 == 1: board[r][c] = 2
        for r in range(5, 8):
            for c in range(8):
                if (r + c) % 2 == 1: board[r][c] = 1
        return board

    def _build_ui(self):
        self.canvas = tk.Canvas(self, width=400, height=400, bg=THEME["bg"], highlightthickness=0)
        self.canvas.pack(pady=20)
        self.canvas.bind("<Button-1>", self._on_click)
        self._draw()

    def _draw(self):
        self.canvas.delete("all")
        s = 50
        for r in range(8):
            for c in range(8):
                x1, y1 = c*s, r*s
                color = "#444" if (r+c)%2==1 else "#eee"
                if self.selected == (r, c): color = THEME["warning"]
                self.canvas.create_rectangle(x1, y1, x1+s, y1+s, fill=color, outline="")
                
                p = self.board[r][c]
                if p > 0:
                    p_color = THEME["danger"] if p == 1 else "#000"
                    self.canvas.create_oval(x1+5, y1+5, x1+s-5, y1+s-5, fill=p_color, outline="white")

    def _on_click(self, event):
        c, r = event.x//50, event.y//50
        if not (0<=r<8 and 0<=c<8): return
        
        if self.selected:
            sr, sc = self.selected
            if self.board[r][c] == 0 and (r+c)%2==1:
                # Basic move logic
                if abs(r-sr) == 1 and abs(c-sc) == 1:
                    # Normal move
                    if (self.turn == 1 and r < sr) or (self.turn == 2 and r > sr):
                        self.board[r][c] = self.board[sr][sc]
                        self.board[sr][sc] = 0
                        self.turn = 3 - self.turn
                elif abs(r-sr) == 2 and abs(c-sc) == 2:
                    # Jump
                    mr, mc = (r+sr)//2, (c+sc)//2
                    if self.board[mr][mc] != 0 and self.board[mr][mc] != self.turn:
                        self.board[r][c] = self.board[sr][sc]
                        self.board[sr][sc] = 0
                        self.board[mr][mc] = 0
                        self.turn = 3 - self.turn
            self.selected = None
        else:
            if self.board[r][c] == self.turn:
                self.selected = (r, c)
        self._draw()

    def reset(self):
        self.board = self._create_board()
        self.turn = 1
        self.selected = None
        self._draw()
