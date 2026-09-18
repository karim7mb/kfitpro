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
    rir?: number
    descanso?: number
    superset?: boolean
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
  pesoObjetivo?: number
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
    .select('usuario_id, objetivo, edad, peso_inicial, peso_objetivo, activo, created_at')
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
    pesoObjetivo: c.peso_objetivo ?? undefined,
    activo: c.activo ?? true,
    iniciales: initiales(u?.nombre ?? 'XX'),
    color: '#F5611A',
    semanas: weeksSince(c.created_at),
    cumplimiento: 0,
  }
}

export async function updatePesoObjetivo(clienteId: string, pesoObjetivo: number): Promise<void> {
  const { error } = await supabase
    .from('clientes')
    .update({ peso_objetivo: pesoObjetivo })
    .eq('usuario_id', clienteId)
  if (error) throw error
}

export async function fetchRegistrosPeso(clienteId: string): Promise<PesoEntry[]> {
  const { data, error } = await supabase
    .from('registros_peso')
    .select('peso_kg, fecha')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: true })
    .limit(12)

  if (error || !data || data.length === 0) return []

  const mapped = data.map(r => ({
    mes: new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    peso: Number(r.peso_kg),
    fecha: r.fecha,
  }))

  // Deduplicate by date, keeping the last entry per day
  const seen = new Map<string, PesoEntry>()
  for (const entry of mapped) {
    seen.set(entry.fecha, entry)
  }
  return Array.from(seen.values())
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
  foto_url?: string
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

export interface MedidaCorporal {
  id?: string
  fecha: string
  cintura?: number
  cadera?: number
  pecho?: number
  brazo?: number
  muslo?: number
}

export interface RegistroRendimiento {
  id?: string
  fecha: string
  ejercicio: string
  peso_kg?: number
  reps?: number
  notas?: string
}

export async function fetchMedidasCorporales(clienteId: string): Promise<MedidaCorporal[]> {
  const { data, error } = await supabase
    .from('medidas_corporales')
    .select('id, fecha, cintura, cadera, pecho, brazo, muslo')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: true })
    .limit(20)
  if (error || !data) return []
  return data.map(r => ({
    id: r.id,
    fecha: r.fecha,
    cintura: r.cintura != null ? Number(r.cintura) : undefined,
    cadera: r.cadera != null ? Number(r.cadera) : undefined,
    pecho: r.pecho != null ? Number(r.pecho) : undefined,
    brazo: r.brazo != null ? Number(r.brazo) : undefined,
    muslo: r.muslo != null ? Number(r.muslo) : undefined,
  }))
}

export async function addMedidaCorporal(clienteId: string, medida: Omit<MedidaCorporal, 'id'>): Promise<void> {
  const obj: Record<string, unknown> = { cliente_id: clienteId, fecha: medida.fecha }
  if (medida.cintura != null) obj.cintura = medida.cintura
  if (medida.cadera != null) obj.cadera = medida.cadera
  if (medida.pecho != null) obj.pecho = medida.pecho
  if (medida.brazo != null) obj.brazo = medida.brazo
  if (medida.muslo != null) obj.muslo = medida.muslo
  const { error } = await supabase.from('medidas_corporales').insert(obj)
  if (error) throw error
}

export async function fetchRegistrosRendimiento(clienteId: string): Promise<RegistroRendimiento[]> {
  const { data, error } = await supabase
    .from('registros_rendimiento')
    .select('id, fecha, ejercicio, peso_kg, reps, notas')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: true })
    .limit(100)
  if (error || !data) return []
  return data.map(r => ({
    id: r.id,
    fecha: r.fecha,
    ejercicio: r.ejercicio,
    peso_kg: r.peso_kg != null ? Number(r.peso_kg) : undefined,
    reps: r.reps ?? undefined,
    notas: r.notas ?? undefined,
  }))
}

export async function addRegistroRendimiento(clienteId: string, registro: Omit<RegistroRendimiento, 'id'>): Promise<void> {
  const { error } = await supabase.from('registros_rendimiento').insert({
    cliente_id: clienteId,
    fecha: registro.fecha,
    ejercicio: registro.ejercicio,
    peso_kg: registro.peso_kg,
    reps: registro.reps,
    notas: registro.notas,
  })
  if (error) throw error
}

export async function fetchFotosProgreso(clienteId: string): Promise<{ id: string; fecha: string; url: string }[]> {
  const { data, error } = await supabase
    .from('fotos_progreso')
    .select('id, fecha, url')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: false })
    .limit(20)
  if (error || !data) return []
  return data
}

export async function uploadFotoProgreso(clienteId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${clienteId}/${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('progress-photos')
    .upload(path, file, { contentType: file.type })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('progress-photos').getPublicUrl(path)
  const url = data.publicUrl
  const fecha = new Date().toISOString().split('T')[0]
  const { error: dbError } = await supabase
    .from('fotos_progreso')
    .insert({ cliente_id: clienteId, url, fecha, tipo: 'general' })
  if (dbError) throw dbError
  return url
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

export interface PerfilNutricional {
  alergias: string[]
  aversiones: string[]
  preferencias: string[]
  supermercados: string[]
  tipoDieta: string
  presupuesto: string
  habilidadCulinaria: string
  tiempoCocina: string
}

export interface PerfilEntrenamiento {
  altura: number
  diasEntreno: number
  tiempoEntrenoSemana: string
  tipoTrabajo: string
  nivel: string
  tiempoIntentando: string
  entrenadorPrevio: boolean
  lesiones: string[]
}

export async function fetchPerfilNutricional(clienteId: string): Promise<PerfilNutricional | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select('perfil_nutricional')
    .eq('usuario_id', clienteId)
    .single()
  if (error || !data?.perfil_nutricional) return null
  return data.perfil_nutricional as PerfilNutricional
}

export async function updatePerfilNutricional(clienteId: string, perfil: PerfilNutricional): Promise<void> {
  const { error } = await supabase
    .from('clientes')
    .update({ perfil_nutricional: perfil })
    .eq('usuario_id', clienteId)
  if (error) throw error
}

export async function fetchPerfilEntrenamiento(clienteId: string): Promise<PerfilEntrenamiento | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select('perfil_entrenamiento')
    .eq('usuario_id', clienteId)
    .single()
  if (error || !data?.perfil_entrenamiento) return null
  return data.perfil_entrenamiento as PerfilEntrenamiento
}

export async function updatePerfilEntrenamiento(clienteId: string, perfil: PerfilEntrenamiento): Promise<void> {
  const { error } = await supabase
    .from('clientes')
    .update({ perfil_entrenamiento: perfil })
    .eq('usuario_id', clienteId)
  if (error) throw error
}

// ─── 4-WEEK PLAN ────────────────────────────────────────────────────────────

export interface SemanaRutina {
  semana: number
  descripcion: string
  dias: DiaRutina[]
}

export interface Rutina4Semanas {
  id?: string
  nombre: string
  semana_actual: number
  activa: boolean
  fecha_inicio?: string
  dias: DiaRutina[]
  semanas?: SemanaRutina[]
}

export async function fetchRutina4Semanas(clienteId: string): Promise<Rutina4Semanas | null> {
  const { data, error } = await supabase
    .from('rutinas')
    .select('id, nombre, semana_actual, activa, dias, semanas, fecha_inicio')
    .eq('cliente_id', clienteId)
    .eq('activa', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return {
    id: data.id,
    nombre: data.nombre,
    semana_actual: data.semana_actual ?? 1,
    activa: data.activa,
    dias: (data.dias as DiaRutina[]) ?? [],
    semanas: (data.semanas as SemanaRutina[]) ?? undefined,
    fecha_inicio: data.fecha_inicio ?? undefined,
  }
}

export async function upsertRutina4Semanas(
  clienteId: string,
  entrenadorId: string,
  rutina: Omit<Rutina4Semanas, 'id'>
): Promise<string | undefined> {
  await supabase.from('rutinas').update({ activa: false }).eq('cliente_id', clienteId)

  const { data, error } = await supabase
    .from('rutinas')
    .insert({
      cliente_id: clienteId,
      entrenador_id: entrenadorId,
      nombre: rutina.nombre,
      semana_actual: rutina.semana_actual,
      activa: true,
      dias: rutina.dias,
      semanas: rutina.semanas ?? null,
      fecha_inicio: rutina.fecha_inicio ?? null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data?.id
}

// ─── SESSION LOG ─────────────────────────────────────────────────────────────

export interface SerieLog {
  serie: number
  reps?: number
  peso?: number
  completada: boolean
}

export interface SesionLog {
  id?: string
  cliente_id: string
  rutina_id?: string
  semana_num: number
  dia_id: string
  fecha: string
  completada: boolean
  sensacion?: 'facil' | 'justo' | 'brutal'
  notas?: string
  series_completadas: Record<string, SerieLog[]>
}

export async function fetchSesionesLog(clienteId: string, rutinaId?: string): Promise<SesionLog[]> {
  let q = supabase
    .from('sesiones_log')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: false })
    .limit(60)

  if (rutinaId) q = q.eq('rutina_id', rutinaId)

  const { data, error } = await q
  if (error || !data) return []
  return data as SesionLog[]
}

export async function fetchLastSesionForDia(clienteId: string, diaId: string): Promise<SesionLog | null> {
  const { data, error } = await supabase
    .from('sesiones_log')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('dia_id', diaId)
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data as SesionLog
}

export async function upsertSesionLog(sesion: SesionLog): Promise<void> {
  const payload = {
    cliente_id: sesion.cliente_id,
    rutina_id: sesion.rutina_id ?? null,
    semana_num: sesion.semana_num,
    dia_id: sesion.dia_id,
    fecha: sesion.fecha,
    completada: sesion.completada,
    sensacion: sesion.sensacion ?? null,
    notas: sesion.notas ?? null,
    series_completadas: sesion.series_completadas,
    updated_at: new Date().toISOString(),
  }

  if (sesion.id) {
    const { error } = await supabase.from('sesiones_log').update(payload).eq('id', sesion.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('sesiones_log')
      .upsert(payload, { onConflict: 'cliente_id,fecha,dia_id' })
    if (error) throw error
  }
}

// ─── DAILY PROGRESS ──────────────────────────────────────────────────────────

export interface ProgresoDiario {
  id?: string
  cliente_id: string
  fecha: string
  peso_corporal?: number
  hidratacion?: number
  litros?: number
  pasos?: number
  horas_sueno?: number
  dolor_corporal?: number
  prs?: Record<string, { peso: number; reps: number; fecha: string }>
  victorias?: string[]
  revision_semanal?: {
    energia: number
    sueno: number
    estres: number
    adherencia: number
    notas: string
    feedback_ia?: string
  }
}

export async function fetchProgresoDiario(clienteId: string, limit = 30): Promise<ProgresoDiario[]> {
  const { data, error } = await supabase
    .from('progreso_diario')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: true })
    .limit(limit)

  if (error || !data) return []
  return data as ProgresoDiario[]
}

export async function upsertProgresoDiario(progreso: ProgresoDiario): Promise<void> {
  const payload = {
    cliente_id: progreso.cliente_id,
    fecha: progreso.fecha,
    ...(progreso.peso_corporal != null && { peso_corporal: progreso.peso_corporal }),
    ...(progreso.hidratacion != null && { hidratacion: progreso.hidratacion }),
    ...(progreso.litros != null && { litros: progreso.litros }),
    ...(progreso.pasos != null && { pasos: progreso.pasos }),
    ...(progreso.horas_sueno != null && { horas_sueno: progreso.horas_sueno }),
    ...(progreso.dolor_corporal != null && { dolor_corporal: progreso.dolor_corporal }),
    ...(progreso.prs && { prs: progreso.prs }),
    ...(progreso.victorias && { victorias: progreso.victorias }),
    ...(progreso.revision_semanal && { revision_semanal: progreso.revision_semanal }),
  }

  const { error } = await supabase
    .from('progreso_diario')
    .upsert(payload, { onConflict: 'cliente_id,fecha' })
  if (error) throw error
}
