import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface AuthResult {
  ok: boolean
  error?: string
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'El modo online no está configurado.' }
  const { error } = await supabase.auth.signUp({ email, password })
  return error ? { ok: false, error: translateAuthError(error.message) } : { ok: true }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'El modo online no está configurado.' }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? { ok: false, error: translateAuthError(error.message) } : { ok: true }
}

/** Pasa los mensajes de error de Supabase (en inglés) a español acorde a la marca. */
function translateAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('email not confirmed')) return 'Confirma tu correo antes de entrar (revisa tu bandeja).'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Ese correo ya tiene una cuenta. Inicia sesión.'
  if (m.includes('unable to validate email') || m.includes('invalid format') || m.includes('invalid email'))
    return 'El correo no parece válido.'
  const pwd = m.match(/at least (\d+) characters/)
  if (pwd) return `La contraseña debe tener al menos ${pwd[1]} caracteres.`
  if (m.includes('weak password') || m.includes('password should')) return 'La contraseña es demasiado débil.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexión con el servidor. Revisa tu internet.'
  return 'No se pudo completar. Inténtalo de nuevo.'
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

/** Suscribe a cambios de sesión; devuelve la función para desuscribir. */
export function onAuthChange(cb: (session: Session | null) => void): () => void {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}
