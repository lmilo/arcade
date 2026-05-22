import tkinter as tk
from tkinter import font
from utils.theme import THEME
from games.chess import Chess
from games.checkers import Checkers
from games.pacman import PacMan
from games.tetris import Tetris
from games.sokoban import Sokoban
from games.othello import Othello
from games.bomberman import Bomberman
from games.treasure_hunt_adv import TreasureHuntAdv
from games.tower_defense import TowerDefense
from games.solitaire import Solitaire
from games.tactical_rpg import TacticalRPG
from games.pathfinding import Pathfinding
from games.game_of_life import GameOfLife
from games.game_2048 import Game2048
from games.memory_match import MemoryMatch
from games.simon_says import SimonSays
from games.sudoku import Sudoku
from games.maze import Maze
from games.tictactoe import TicTacToe
from games.snake import Snake
from games.minesweeper import Minesweeper
from games.sliding_puzzle import SlidingPuzzle
from games.treasure_hunt import TreasureHunt
from games.connect_four import ConnectFour

GAMES = [
    ("♟️ Ajedrez", Chess), ("🏁 Damas", Checkers), ("🟡 Pac-Man", PacMan), ("🧱 Tetris", Tetris),
    ("📦 Sokoban", Sokoban), ("⚪ Othello", Othello), ("💣 Bomberman", Bomberman), ("💎 Tesoro (Adv)", TreasureHuntAdv),
    ("🛡️ Tower Defense", TowerDefense), ("🃏 Solitario", Solitaire), ("⚔️ RPG Táctico", TacticalRPG), ("🛰️ Pathfinding", Pathfinding),
    ("🦠 Vida", GameOfLife), ("🔢 2048", Game2048), ("🧠 Memoria", MemoryMatch), ("🔴 Simon", SimonSays),
    ("🧩 Sudoku", Sudoku), ("🌀 Laberinto", Maze), ("❌ TicTacToe", TicTacToe), ("🐍 Snake", Snake),
    ("🚩 Minas", Minesweeper), ("🖼️ Sliding", SlidingPuzzle), ("💰 Tesoro", TreasureHunt), ("🔵 Conecta 4", ConnectFour),
]

class ArcadeLauncher(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("🕹️ Arcade")
        self.geometry("800x600")
        self.configure(bg=THEME["bg"])
        self._build_menu()

    def _build_menu(self):
        tk.Label(self, text="🕹️ ARCADE", font=("Press Start 2P", 24),
                 bg=THEME["bg"], fg=THEME["accent"]).pack(pady=20)

        frame = tk.Frame(self, bg=THEME["bg"])
        frame.pack(fill="both", expand=True, padx=30)

        for i, (label, GameClass) in enumerate(GAMES):
            row, col = divmod(i, 4)
            btn = tk.Button(
                frame, text=label, width=18,
                command=lambda gc=GameClass: gc(self),
                bg=THEME["card"], fg=THEME["text"],
                relief="flat", pady=10,
                activebackground=THEME["accent"],
            )
            btn.grid(row=row, column=col, padx=6, pady=6)

if __name__ == "__main__":
    ArcadeLauncher().mainloop()
