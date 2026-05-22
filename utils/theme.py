# utils/theme.py
import sys

THEME = {
    "bg":       "#0f0f1a",
    "card":     "#1e1e2e",
    "accent":   "#7c3aed",
    "text":     "#e2e8f0",
    "success":  "#22c55e",
    "danger":   "#ef4444",
    "warning":  "#f59e0b",
    "font_mono": "Courier New",
}

# Iconos seguros por plataforma
IS_LINUX = sys.platform.startswith("linux")

ICONS = {
    "mine":    "[M]"  if IS_LINUX else "💣",
    "flag":    "[F]"  if IS_LINUX else "🚩",
    "win":     "[WIN]" if IS_LINUX else "🏆",
    "lose":    "[X]"  if IS_LINUX else "💀",
    "smile":   ":)"   if IS_LINUX else "😀",
    "reset":   "Reset" if IS_LINUX else "🔄 Reiniciar",
    "snake":   "O"    if IS_LINUX else "🐍",
    "apple":   "*"    if IS_LINUX else "🍎",
    "life":    "#"    if IS_LINUX else "🟩",
    "trophy":  "***"  if IS_LINUX else "🏆",
    "blocked": "X"    if IS_LINUX else "🚧",
    "mem_syms": ["A","B","C","D","E","F","G","H"] if IS_LINUX else ["🍎","🍐","🍋","🍌","🍉","🍓","🍇","🍒"],
}
