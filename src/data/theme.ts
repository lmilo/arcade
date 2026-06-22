export type Theme = 'dark' | 'light'

const KEY = 'arcade.theme'

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Aplica el tema guardado al arrancar la app. */
export function initTheme() {
  applyTheme(getTheme())
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}
