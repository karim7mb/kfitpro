import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'kfitpro' },
})

export type UserRole = 'admin' | 'cliente'

export interface AppUser {
  id: string
  email: string
  nombre: string
  rol: UserRole
  foto_url?: string
}

interface InviteClientPayload {
  email: string
  nombre: string
  objetivo: string
  edad: number
  pesoInicial: number
}

export async function inviteClient(payload: InviteClientPayload & { password: string }) {
  const isDemoMode = supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project')

  if (isDemoMode) {
    await new Promise(r => setTimeout(r, 1200))
    return { success: true, demo: true }
  }

  // Use a non-persisting client so admin session is not affected
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'kfitpro' },
  })

  // 1. Create auth user with password (no invite email needed)
  const { data: authData, error: authError } = await tempClient.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: { data: { nombre: payload.nombre, rol: 'cliente' } },
  })
  if (authError) throw authError
  if (!authData.user) throw new Error('No se pudo crear el usuario')

  // 2. Create usuario record (as admin)
  const { error: userError } = await supabase.from('usuarios').insert({
    id: authData.user.id,
    email: payload.email,
    nombre: payload.nombre,
    rol: 'cliente',
  })
  if (userError) throw userError

  // 3. Get current trainer id
  const { data: { user: trainer } } = await supabase.auth.getUser()
  if (!trainer) throw new Error('No hay sesión de entrenador')

  // 4. Create cliente record linked to trainer
  const { error: clienteError } = await supabase.from('clientes').insert({
    usuario_id: authData.user.id,
    entrenador_id: trainer.id,
    objetivo: payload.objetivo,
    edad: payload.edad,
    peso_inicial: payload.pesoInicial,
    activo: true,
  })
  if (clienteError) throw clienteError

  return { success: true, userId: authData.user.id }
}

export async function completeClientProfile(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}
