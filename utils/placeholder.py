# utils/placeholder.py
import tkinter as tk
from utils.theme import THEME

def placeholder(parent, name):
    win = tk.Toplevel(parent)
    win.title(name)
    win.geometry("300x200")
    win.configure(bg=THEME["bg"])
    tk.Label(win, text="🚧 Próximamente",
             font=("Courier New", 16), bg=THEME["bg"],
             fg=THEME["warning"]).pack(expand=True)
