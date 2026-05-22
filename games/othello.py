import tkinter as tk
from games.base_game import BaseGame
from utils.theme import THEME

class Othello(BaseGame):
    def __init__(self, parent):
        self.board = [[0]*8 for _ in range(8)]
        self.board[3][3] = 2; self.board[3][4] = 1
        self.board[4][3] = 1; self.board[4][4] = 2
        self.turn = 1 # 1: White, 2: Black
        super().__init__(parent, title="⚪ Othello", width=500, height=600)

    def get_tutorial_text(self):
        return (
            "OBJETIVO:\n"
            "Tener más fichas de tu color al final.\n\n"
            "REGLAS:\n"
            "- Encierra fichas rivales entre dos tuyas para cambiarlas de color.\n"
            "- Debes capturar al menos una ficha en cada turno."
        )

    def _build_ui(self):
        self.canvas = tk.Canvas(self, width=400, height=400, bg="#2e7d32")
        self.canvas.pack(pady=20)
        self.canvas.bind("<Button-1>", self._on_click)
        self._draw()

    def _draw(self):
        self.canvas.delete("all")
        s = 50
        for r in range(8):
            for c in range(8):
                x1, y1 = c*s, r*s
                self.canvas.create_rectangle(x1, y1, x1+s, y1+s, outline="black")
                p = self.board[r][c]
                if p > 0:
                    color = "white" if p == 1 else "black"
                    self.canvas.create_oval(x1+4, y1+4, x1+s-4, y1+s-4, fill=color)

    def _on_click(self, event):
        c, r = event.x//50, event.y//50
        if not (0<=r<8 and 0<=c<8) or self.board[r][c] != 0: return
        
        captured = self._get_captured(r, c, self.turn)
        if captured:
            self.board[r][c] = self.turn
            for cr, cc in captured:
                self.board[cr][cc] = self.turn
            self.turn = 3 - self.turn
            self._draw()

    def _get_captured(self, r, c, player):
        target = 3 - player
        captured = []
        for dr, dc in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(1,-1),(-1,1),(-1,-1)]:
            potential = []
            nr, nc = r+dr, c+dc
            while 0<=nr<8 and 0<=nc<8 and self.board[nr][nc] == target:
                potential.append((nr, nc))
                nr += dr; nc += dc
            if 0<=nr<8 and 0<=nc<8 and self.board[nr][nc] == player:
                captured.extend(potential)
        return captured

    def reset(self):
        self.__init__(self.master) # Simplified reset
        self._draw()
