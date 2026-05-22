import tkinter as tk
from games.base_game import BaseGame
from utils.theme import THEME

class TicTacToe(BaseGame):

    def __init__(self, parent):
        self.board = [""] * 9
        self.current_player = "X"
        self.buttons = []
        self.game_over = False
        super().__init__(parent, title="❌ Triqui", width=340, height=440)

    def get_tutorial_text(self):
        return (
            "OBJETIVO:\n"
            "Ser el primero en alinear 3 de tus símbolos (X o O) en línea horizontal, vertical o diagonal.\n\n"
            "CONTROLES:\n"
            "- Haz clic en cualquier casilla vacía para colocar tu marca.\n\n"
            "REGLAS:\n"
            "- Los jugadores alternan turnos.\n"
            "- Si el tablero se llena sin un ganador, es un empate."
        )

    def _build_ui(self):
        self.configure(bg=THEME["bg"])

        # --- Header ---
        self.status_label = tk.Label(
            self, text="Turno: X", font=(THEME["font_mono"], 14, "bold"),
            bg=THEME["bg"], fg=THEME["accent"]
        )
        self.status_label.pack(pady=(20, 10))

        # --- Tablero 3x3 ---
        board_frame = tk.Frame(self, bg=THEME["bg"])
        board_frame.pack()

        for i in range(9):
            btn = tk.Button(
                board_frame,
                text="", font=(THEME["font_mono"], 28, "bold"),
                width=3, height=1,
                bg=THEME["card"], fg=THEME["text"],
                relief="flat", bd=2,
                activebackground=THEME["accent"],
                command=lambda idx=i: self._on_click(idx)
            )
            btn.grid(
                row=i // 3, column=i % 3,
                padx=5, pady=5
            )
            self.buttons.append(btn)

        # --- Botón Reset ---
        tk.Button(
            self, text="🔄 Reiniciar",
            font=(THEME["font_mono"], 11),
            bg=THEME["card"], fg=THEME["text"],
            relief="flat", padx=10, pady=6,
            activebackground=THEME["accent"],
            command=self.reset
        ).pack(pady=20)

    def _on_click(self, idx: int):
        if self.game_over or self.board[idx]:
            return

        self.board[idx] = self.current_player
        color = THEME["danger"] if self.current_player == "X" else THEME["success"]
        self.buttons[idx].config(text=self.current_player, fg=color, state="disabled")

        winner = self._check_winner()
        if winner:
            self._highlight_winner(winner)
            self.bell()
            self.status_label.config(
                text=f"🏆 ¡Ganó {self.current_player}!",
                fg=THEME["warning"]
            )
            self.game_over = True
        elif "" not in self.board:
            self.status_label.config(text="🤝 ¡Empate!", fg=THEME["warning"])
            self.game_over = True
        else:
            self.current_player = "O" if self.current_player == "X" else "X"
            self.status_label.config(text=f"Turno: {self.current_player}")

    def _check_winner(self):
        wins = [
            [0,1,2],[3,4,5],[6,7,8],  # filas
            [0,3,6],[1,4,7],[2,5,8],  # columnas
            [0,4,8],[2,4,6]           # diagonales
        ]
        for combo in wins:
            a, b, c = combo
            if self.board[a] == self.board[b] == self.board[c] != "":
                return combo
        return None

    def _highlight_winner(self, combo: list):
        for idx in combo:
            self.buttons[idx].config(bg=THEME["accent"])

    def reset(self):
        self.board = [""] * 9
        self.current_player = "X"
        self.game_over = False
        self.status_label.config(text="Turno: X", fg=THEME["accent"])
        for btn in self.buttons:
            btn.config(
                text="", state="normal",
                bg=THEME["card"], fg=THEME["text"]
            )
