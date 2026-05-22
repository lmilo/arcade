import tkinter as tk
from abc import ABC, abstractmethod
from utils.theme import THEME


class BaseGame(tk.Toplevel, ABC):
    """Clase base para todos los juegos del arcade."""

    def __init__(self, parent, title: str, width: int, height: int):
        super().__init__(parent)
        self.title(title)
        self.resizable(False, False)
        self.configure(bg="#0f0f1a")
        self.protocol("WM_DELETE_WINDOW", self.on_close)

        # Construir UI primero
        self._build_ui()

        # Forzar que tkinter calcule el tamaño real del contenido
        self.update_idletasks()

        # Usar el tamaño pasado como mínimo, pero respetar el contenido si es mayor
        real_w = max(width, self.winfo_reqwidth())
        real_h = max(height, self.winfo_reqheight())
        self.geometry(f"{real_w}x{real_h}")

        # Centrar la ventana en pantalla
        self.update_idletasks()
        screen_w = self.winfo_screenwidth()
        screen_h = self.winfo_screenheight()
        x = (screen_w - real_w) // 2
        y = (screen_h - real_h) // 2
        self.geometry(f"{real_w}x{real_h}+{x}+{y}")

        # Tutorial Button
        self.tutorial_btn = tk.Button(
            self, text="❓", font=("Segoe UI Emoji", 12),
            bg=THEME["accent"], fg="white", relief="flat",
            command=self.show_tutorial_popup
        )
        self.tutorial_btn.place(relx=1.0, x=-10, y=10, anchor="ne")

    def show_tutorial_popup(self):
        tutorial_win = tk.Toplevel(self)
        tutorial_win.title(f"Tutorial: {self.title()}")
        tutorial_win.geometry("340x440")
        tutorial_win.configure(bg=THEME["card"])
        tutorial_win.resizable(False, False)
        tutorial_win.transient(self) # Mantener sobre el juego
        tutorial_win.grab_set()      # Bloquear el juego mientras se lee

        tk.Label(
            tutorial_win, text="📖 CÓMO JUGAR",
            font=(THEME["font_mono"], 16, "bold"),
            bg=THEME["card"], fg=THEME["accent"]
        ).pack(pady=20)

        txt = tk.Text(
            tutorial_win, wrap="word", font=("Arial", 11),
            bg="#1e1e2e", fg=THEME["text"], padx=15, pady=15,
            relief="flat", height=12
        )
        txt.pack(padx=20, fill="both", expand=True)
        txt.insert("1.0", self.get_tutorial_text())
        txt.config(state="disabled")

        tk.Button(
            tutorial_win, text="¡ENTENDIDO!", bg=THEME["accent"], fg="white",
            font=("Arial", 10, "bold"), relief="flat", padx=20, pady=8,
            command=tutorial_win.destroy
        ).pack(pady=20)

    def get_tutorial_text(self):
        """Sobrescribir en cada juego."""
        return "No hay tutorial disponible para este juego."

    @abstractmethod
    def _build_ui(self):
        """Construir todos los widgets del juego."""
        pass

    @abstractmethod
    def reset(self):
        """Reiniciar el estado del juego."""
        pass

    def on_close(self):
        self.destroy()
