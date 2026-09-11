import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'kfitpro' },
})

export const isDemoMode = () =>
  supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project')

export type UserRole = 'admin' | 'cliente'

export interface AppUser {
  id: string
  email: string
  nombre: string
  rol: UserRole
  foto_url?: string
}

export interface PesoEntry {
  mes: string
  peso: number
  fecha?: string
}

export interface DiaRutina {
  id: string
  nombre: string
  titulo: string
  ejercicios: {
    id: string
    nombre: string
    series: number
    repsMin: number
    repsMax: number
    peso: number
    rpe: number
  }[]
}

export interface RutinaData {
  id?: string
  nombre: string
  semana_actual: number
  diasSemana?: number
  activa: boolean
  dias: DiaRutina[]
}

export interface ClienteDisplay {
  id: string
  nombre: string
  email: string
  objetivo: string
  edad: number
  pesoInicial: number
  activo: boolean
  iniciales: string
  color: string
  semanas: number
  cumplimiento: number
}

const CLIENT_COLORS = ['#F5611A', '#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', '#EC4899']

function initiales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function weeksSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime()
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24 * 7)))
}

export async function fetchMisClientes(): Promise<ClienteDisplay[]> {
  const { data: clienteRows, error } = await supabase
    .from('clientes')
    .select('usuario_id, objetivo, edad, peso_inicial, activo, created_at')
    .order('created_at', { ascending: false })

  if (error || !clienteRows || clienteRows.length === 0) return []

  const userIds = clienteRows.map(c => c.usuario_id)

  const { data: usuarioRows } = await supabase
    .from('usuarios')
    .select('id, nombre, email')
    .in('id', userIds)

  const usuarioMap = new Map((usuarioRows ?? []).map(u => [u.id, u]))

  return clienteRows.map((c, i) => {
    const u = usuarioMap.get(c.usuario_id)
    return {
      id: c.usuario_id,
      nombre: u?.nombre ?? 'Sin nombre',
      email: u?.email ?? '',
      objetivo: c.objetivo ?? '',
      edad: c.edad ?? 0,
      pesoInicial: c.peso_inicial ?? 0,
      activo: c.activo ?? true,
      iniciales: initiales(u?.nombre ?? 'XX'),
      color: CLIENT_COLORS[i % CLIENT_COLORS.length],
      semanas: weeksSince(c.created_at),
      cumplimiento: 0,
    }
  })
}

export async function fetchClienteData(clienteId: string): Promise<ClienteDisplay | null> {
  const { data: c, error } = await supabase
    .from('clientes')
    .select('usuario_id, objetivo, edad, peso_inicial, activo, created_at')
    .eq('usuario_id', clienteId)
    .single()

  if (error || !c) return null

  const { data: u } = await supabase
    .from('usuarios')
    .select('nombre, email')
    .eq('id', clienteId)
    .single()

  return {
    id: clienteId,
    nombre: u?.nombre ?? 'Sin nombre',
    email: u?.email ?? '',
    objetivo: c.objetivo ?? '',
    edad: c.edad ?? 0,
    pesoInicial: c.peso_inicial ?? 0,
    activo: c.activo ?? true,
    iniciales: initiales(u?.nombre ?? 'XX'),
    color: '#F5611A',
    semanas: weeksSince(c.created_at),
    cumplimiento: 0,
  }
}

export async function fetchRegistrosPeso(clienteId: string): Promise<PesoEntry[]> {
  const { data, error } = await supabase
    .from('registros_peso')
    .select('peso_kg, fecha')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: true })
    .limit(12)

  if (error || !data || data.length === 0) return []

  return data.map(r => ({
    mes: new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short' }),
    peso: Number(r.peso_kg),
    fecha: r.fecha,
  }))
}

export async function addRegistroPeso(
  clienteId: string,
  peso: number,
  fecha: string
): Promise<void> {
  const { error } = await supabase
    .from('registros_peso')
    .insert({ cliente_id: clienteId, peso_kg: peso, fecha })
  if (error) throw error
}

export async function fetchRutina(clienteId: string): Promise<RutinaData | null> {
  const { data, error } = await supabase
    .from('rutinas')
    .select('id, nombre, semana_actual, activa, dias')
    .eq('cliente_id', clienteId)
    .eq('activa', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    nombre: data.nombre,
    semana_actual: data.semana_actual,
    activa: data.activa,
    dias: data.dias as DiaRutina[],
  }
}

export async function upsertRutina(
  clienteId: string,
  entrenadorId: string,
  rutina: Omit<RutinaData, 'id'>
): Promise<void> {
  await supabase.from('rutinas').update({ activa: false }).eq('cliente_id', clienteId)

  const { error } = await supabase.from('rutinas').insert({
    cliente_id: clienteId,
    entrenador_id: entrenadorId,
    nombre: rutina.nombre,
    semana_actual: rutina.semana_actual,
    activa: true,
    dias: rutina.dias,
  })
  if (error) throw error
}

export interface MensajeDB {
  id: string
  remitente_id: string
  destinatario_id: string
  texto: string
  es_ia: boolean
  leido: boolean
  created_at: string
}

export async function fetchEntrenadorId(clienteId: string): Promise<string | null> {
  const { data } = await supabase
    .from('clientes')
    .select('entrenador_id')
    .eq('usuario_id', clienteId)
    .single()
  return data?.entrenador_id ?? null
}

export async function fetchMensajes(userId: string, otroId: string): Promise<MensajeDB[]> {
  const { data, error } = await supabase
    .from('mensajes')
    .select('*')
    .or(`and(remitente_id.eq.${userId},destinatario_id.eq.${otroId}),and(remitente_id.eq.${otroId},destinatario_id.eq.${userId})`)
    .order('created_at', { ascending: true })
    .limit(60)
  if (error || !data) return []
  return data as MensajeDB[]
}

export async function sendMensaje(
  remitenteId: string,
  destinatarioId: string,
  texto: string,
  esIa = false
): Promise<void> {
  const { error } = await supabase
    .from('mensajes')
    .insert({ remitente_id: remitenteId, destinatario_id: destinatarioId, texto, es_ia: esIa })
  if (error) throw error
}

export interface Alimento {
  id: string
  nombre: string
  gramos: number
  calorias: number
  proteinas: number
  carbos: number
  grasas: number
}

export interface ComidaPlan {
  id: string
  nombre: string
  hora: string
  alimentos: Alimento[]
}

export interface PlanNutricional {
  id?: string
  cliente_id: string
  entrenador_id: string
  nombre: string
  calorias_objetivo: number
  proteinas_g: number
  carbos_g: number
  grasas_g: number
  comidas: ComidaPlan[]
}

export async function fetchPlanNutricional(clienteId: string): Promise<PlanNutricional | null> {
  const { data, error } = await supabase
    .from('planes_nutricionales')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data as PlanNutricional
}

export async function upsertPlanNutricional(plan: PlanNutricional): Promise<void> {
  if (plan.id) {
    const { error } = await supabase
      .from('planes_nutricionales')
      .update({ nombre: plan.nombre, calorias_objetivo: plan.calorias_objetivo, proteinas_g: plan.proteinas_g, carbos_g: plan.carbos_g, grasas_g: plan.grasas_g, comidas: plan.comidas })
      .eq('id', plan.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('planes_nutricionales')
      .insert({ cliente_id: plan.cliente_id, entrenador_id: plan.entrenador_id, nombre: plan.nombre, calorias_objetivo: plan.calorias_objetivo, proteinas_g: plan.proteinas_g, carbos_g: plan.carbos_g, grasas_g: plan.grasas_g, comidas: plan.comidas, activo: true })
    if (error) throw error
  }
}

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

interface InviteClientPayload {
  email: string
  nombre: string
  objetivo: string
  edad: number
  pesoInicial: number
}

export async function inviteClient(payload: InviteClientPayload & { password: string }) {
  if (isDemoMode()) {
    await new Promise(r => setTimeout(r, 1200))
    return { success: true, demo: true }
  }

  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'kfitpro' },
  })

  const { data: authData, error: authError } = await tempClient.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: { data: { nombre: payload.nombre, rol: 'cliente' } },
  })
  if (authError) throw authError
  if (!authData.user) throw new Error('No se pudo crear el usuario')

  const { error: userError } = await supabase.from('usuarios').insert({
    id: authData.user.id,
    email: payload.email,
    nombre: payload.nombre,
    rol: 'cliente',
  })
  if (userError) throw userError

  const { data: { user: trainer } } = await supabase.auth.getUser()
  if (!trainer) throw new Error('No hay sesión de entrenador')

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
