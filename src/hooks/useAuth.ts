import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { AppUser } from '../lib/supabase'
import { demoTrainer, demoClient } from '../data/demo'

interface AuthState {
  user: AppUser | null
  loading: boolean
  profileError: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, profileError: null })

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setState({ user: null, loading: false, profileError: null })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        const msg = error?.message ?? 'Sin datos de perfil'
        console.error('[KFitPro] Error perfil:', error?.code, msg)
        setState({ user: null, loading: false, profileError: msg })
        return
      }

      setState({
        user: {
          id: data.id,
          email: data.email,
          nombre: data.nombre,
          rol: data.rol,
          foto_url: data.foto_url,
        },
        loading: false,
        profileError: null,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[KFitPro] Excepción:', msg)
      setState({ user: null, loading: false, profileError: msg })
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const loginAsDemo = useCallback((role: 'admin' | 'cliente') => {
    setState({ user: role === 'admin' ? demoTrainer : demoClient, loading: false, profileError: null })
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setState({ user: null, loading: false, profileError: null })
  }, [])

  return { ...state, login, loginAsDemo, logout }
}
