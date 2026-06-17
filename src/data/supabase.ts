import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Cliente de Supabase. Es `null` si faltan las variables de entorno, de modo que la app
 * sigue funcionando offline (juego + progresión local) y las funciones online degradan solas.
 * La seguridad real la dan las RLS policies en la base, no la anon key (que es pública).
 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export function isOnline(): boolean {
  return supabase !== null
}
