import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSession, onAuthChange } from '../data/auth'

/** Estado de sesión reactivo para el shell. `ready` indica que ya se resolvió la sesión inicial. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    getSession().then((s) => {
      if (!active) return
      setSession(s)
      setReady(true)
    })
    const off = onAuthChange((s) => setSession(s))
    return () => {
      active = false
      off()
    }
  }, [])

  return { session, ready }
}
