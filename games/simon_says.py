import tkinter as tk
import random
from games.base_game import BaseGame
from utils.theme import THEME

class SimonSays(BaseGame):
    def __init__(self, parent):
        self.sequence = []
        self.user_pos = 0
        self.is_playing = False
        self.buttons = []
        self.colors = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"] # Red, Blue, Green, Yellow
        self.is_busy = False
        super().__init__(parent, title="🔘 Simon Says", width=400, height=520)

    def get_tutorial_text(self):
        return (
            "OBJETIVO:\n"
            "Repetir la secuencia de colores que Simon muestra.\n\n"
            "CONTROLES:\n"
            "- Haz clic en los botones de colores en el MISMO ORDEN que parpadearon.\n\n"
            "REGLAS:\n"
            "- Cada nivel añade un nuevo color a la secuencia.\n"
            "- Si te equivocas, el juego se reinicia.\n"
            "- ¡Presta mucha atención y entrena tu memoria!"
        )

    def _build_ui(self):
        self.configure(bg=THEME["bg"])

        self.status_label = tk.Label(
            self, text="Atento a la secuencia", font=(THEME["font_mono"], 14, "bold"),
            bg=THEME["bg"], fg=THEME["accent"]
        )
        self.status_label.pack(pady=20)

        grid_frame = tk.Frame(self, bg=THEME["bg"])
        grid_frame.pack()

        for i in range(4):
            btn = tk.Button(
                grid_frame, width=10, height=5, bg=self.colors[i],
                relief="flat", activebackground="#ffffff",
                command=lambda idx=i: self._on_btn_click(idx)
            )
            r, c = divmod(i, 2)
            btn.grid(row=r, column=c, padx=10, pady=10)
            self.buttons.append(btn)

        self.start_btn = tk.Button(
            self, text="▶️ Jugar", bg=THEME["card"], fg=THEME["text"],
            command=self._next_round
        )
        self.start_btn.pack(pady=20)

    def _next_round(self):
        self.start_btn.config(state="disabled")
        self.is_playing = True
        random.seed() # Asegurar aleatoriedad
        self.sequence.append(random.randint(0, 3))
        self.user_pos = 0
        self._play_sequence()

    def _play_sequence(self, idx=0):
        if idx < len(self.sequence):
            btn_idx = self.sequence[idx]
            self._flash(btn_idx)
            self.after(600, lambda: self._play_sequence(idx + 1))
        else:
            self.is_playing = False
            self.status_label.config(text="¡Tu turno!")

    def _flash(self, idx):
        orig_bg = self.colors[idx]
        self.buttons[idx].config(bg="#ffffff")
        self.after(300, lambda: self.buttons[idx].config(bg=orig_bg))

    def _on_btn_click(self, idx):
        if self.is_playing: return

        if self.sequence and idx == self.sequence[self.user_pos]:
            self._flash(idx)
            self.user_pos += 1
            if self.user_pos == len(self.sequence):
                self.status_label.config(text="¡Muy bien!")
                self.after(1000, self._next_round)
        else:
            self.status_label.config(text="❌ ¡PERDISTE!", fg=THEME["danger"])
            self.sequence = []
            self.start_btn.config(state="normal")

    def reset(self):
        self.sequence = []
        self.user_pos = 0
        self.is_playing = False
        self.status_label.config(text="Atento a la secuencia", fg=THEME["accent"])
        self.start_btn.config(state="normal")
