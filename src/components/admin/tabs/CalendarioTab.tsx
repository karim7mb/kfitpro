import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Clock, Calendar } from 'lucide-react'
import {
  fetchRutina4Semanas, fetchSesionesLog, fetchPerfilEntrenamiento,
  type Rutina4Semanas, type SesionLog, type DiaRutina, type PerfilEntrenamiento,
} from '../../../lib/supabase'

interface CalendarioTabProps {
  clienteId: string
  isDemo?: boolean
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T12:00:00') // noon evita desfase UTC en cualquier zona horaria
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDayOfWeekMon(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  return (d.getDay() + 6) % 7 // 0=Mon
}

function getStartOfWeekMon(dateStr: string): string {
  const dow = getDayOfWeekMon(dateStr)
  return addDays(dateStr, -dow)
}

interface CalDay {
  date: string
  semanaNum: number
  dia: DiaRutina | null
  sesion?: SesionLog
  isToday: boolean
  isPast: boolean
  isOverride: boolean
}

const GRUPO_KEYWORDS: [string, string[]][] = [
  ['Pecho',       ['press banca', 'press inclin', 'press plano', 'apertura', 'mariposa', 'pec deck', 'flies', 'cruce polea', 'fondos pecho', 'chest', 'press declin', 'press máquina', 'press maquina']],
  ['Dorsales',    ['jalón', 'jalon', 'dominadas', 'pulldown', 'pull-up', 'pull up', 'polea al pecho', 'polea alta', 'agarre abierto', 'agarre cerrado', 'lat ']],
  ['Espalda Alta', ['remo', 'dorsal', 'seated row', 'cable row', 'espalda']],
  ['Hombros',     ['press militar', 'press hombro', 'press arnold', 'arnold', 'elevaci', 'face pull', 'pájaros', 'pajaros', 'deltoid', 'hombro', 'vuelo lateral', 'vuelo frontal', 'lateral raise', 'front raise']],
  ['Tríceps',     ['tríceps', 'triceps', 'extensión', 'extension', 'press estrecho', 'press codos', 'codos cerrados', 'franc', 'skull', 'fondos tríceps', 'fondos triceps', 'patada', 'kickback', 'overhead tri', 'pushdown', 'jale tríceps', 'jale triceps', 'rope tricep']],
  ['Bíceps',      ['curl', 'bíceps', 'biceps', 'rosca', 'martillo', 'hammer', 'predicador', 'scott']],
  ['Cuádriceps',  ['sentadilla', 'squat', 'prensa', 'leg press', 'extensión pierna', 'extension pierna', 'hack', 'pistol', 'lunge', 'zancada', 'cuádricep', 'cuadricep']],
  ['Isquios',     ['peso muerto', 'deadlift', 'curl femoral', 'curl isquio', 'femoral', 'isquio', 'buenos días', 'buenos dias', 'rdl', 'rumano', 'nordico']],
  ['Glúteos',     ['hip thrust', 'glúteo', 'gluteo', 'patada trasera', 'puente de', 'abductor', 'kickback glút']],
  ['Gemelos',     ['gemelo', 'pantorrilla', 'elevación talón', 'elevacion talon', 'calf', 'soleo']],
  ['Core',        ['plancha', 'plank', 'crunch', 'encogimiento abdom', 'oblicuo', 'abdomen', 'abdominal', 'core', 'rotación', 'rotacion']],
]

function getGrupoMuscular(nombre: string): string {
  const lower = nombre.toLowerCase()
  for (const [grupo, keywords] of GRUPO_KEYWORDS) {
    if (keywords.some(kw => lower.includes(kw))) return grupo
  }
  return 'Otros'
}

function buildCalendar(
  rutina: Rutina4Semanas,
  sesiones: SesionLog[],
  diasSemana: number[],
  sesionOverrides: Record<string, string>,
  diaWorkoutMap?: Record<number, number>,
  semanaOverrides?: PerfilEntrenamiento['semanaOverrides'],
): CalDay[][] {
  const fechaInicio = rutina.fecha_inicio
  if (!fechaInicio) return []

  const cycleStart = calcCycleStart(fechaInicio)
  const sesionMap = new Map(sesiones.map(s => [s.fecha + '_' + s.dia_id, s]))
  const sesionByDate = new Map<string, SesionLog>()
  for (const s of sesiones) {
    const existing = sesionByDate.get(s.fecha)
    if (!existing || s.completada) sesionByDate.set(s.fecha, s)
  }
  const todayStr = today()

  // Show: prev cycle (historial) + current cycle + next cycle
  const planWeekStart = getStartOfWeekMon(fechaInicio)
  const prevCycleWeekStart = getStartOfWeekMon(addDays(cycleStart, -28))
  const displayStart = prevCycleWeekStart < planWeekStart ? planWeekStart : prevCycleWeekStart
  const displayEnd = addDays(cycleStart, 55)

  const weeks: CalDay[][] = []
  let weekStart = displayStart

  while (weekStart <= displayEnd) {
    const msFromPlanStart = new Date(weekStart + 'T12:00:00').getTime() - new Date(planWeekStart + 'T12:00:00').getTime()
    const weeksSincePlanStart = Math.round(msFromPlanStart / (7 * 24 * 60 * 60 * 1000))
    const planWeekIndex = ((weeksSincePlanStart % 4) + 4) % 4
    const semanaNum = planWeekIndex + 1

    const semanaData = rutina.semanas?.[planWeekIndex]
    const dias = semanaData?.dias ?? rutina.dias ?? []
    const total = dias.length
    const diasMap = new Map<number, DiaRutina>()

    const weekOverride = semanaOverrides?.[weekStart]
    const effectiveDiaWorkoutMap = weekOverride?.diaWorkoutMap ?? diaWorkoutMap
    const effectiveDiasSemana = weekOverride?.diasSemana ?? diasSemana

    if (effectiveDiaWorkoutMap && Object.keys(effectiveDiaWorkoutMap).length > 0) {
      for (const [dayStr, slotIdx] of Object.entries(effectiveDiaWorkoutMap)) {
        const day = Number(dayStr)
        if (dias[slotIdx] !== undefined) diasMap.set(day, dias[slotIdx])
      }
    } else if (effectiveDiasSemana.length > 0) {
      const sorted = [...effectiveDiasSemana].sort((a, b) => a - b)
      dias.forEach((dia, i) => { if (i < sorted.length) diasMap.set(sorted[i], dia) })
    } else {
      const maxSlot = total <= 5 ? 4 : 6
      dias.forEach((dia, i) => {
        const slot = total === 1 ? 0 : Math.round((i * maxSlot) / (total - 1))
        diasMap.set(slot, dia)
      })
    }

    const row: CalDay[] = []
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d)
      let dia = diasMap.get(d) ?? null
      let isOverride = false

      const overrideDiaId = sesionOverrides[date]
      if (overrideDiaId) {
        const weekDias = semanaData?.dias ?? rutina.dias ?? []
        const overrideDia = weekDias.find(dd => dd.id === overrideDiaId) ?? null
        if (overrideDia) { dia = overrideDia; isOverride = true }
      }

      const sesionKey = dia ? date + '_' + dia.id : ''
      row.push({
        date, semanaNum, dia,
        sesion: sesionKey ? (sesionMap.get(sesionKey) ?? sesionByDate.get(date)) : undefined,
        isToday: date === todayStr,
        isPast: date < todayStr,
        isOverride,
      })
    }
    weeks.push(row)
    weekStart = addDays(weekStart, 7)
  }
  return weeks
}

export default function CalendarioTab({ clienteId, isDemo, onToast: _onToast }: CalendarioTabProps) {
  const [rutina, setRutina] = useState<Rutina4Semanas | null>(null)
  const [sesiones, setSesiones] = useState<SesionLog[]>([])
  const [diasSemana, setDiasSemana] = useState<number[]>([])
  const [sesionOverrides, setSesionOverrides] = useState<Record<string, string>>({})
  const [diaWorkoutMap, setDiaWorkoutMap] = useState<Record<number, number>>({})
  const [semanaOverrides, setSemanaOverrides] = useState<PerfilEntrenamiento['semanaOverrides']>({})
  const [perfil, setPerfil] = useState<PerfilEntrenamiento | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CalDay | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemo) return
      const [r, logs, perfil] = await Promise.all([
        fetchRutina4Semanas(clienteId),
        fetchSesionesLog(clienteId),
        fetchPerfilEntrenamiento(clienteId),
      ])
      setRutina(r)
      setSesiones(logs)
      setPerfil(perfil)
      setDiasSemana(perfil?.diasSemana ?? [])
      setSesionOverrides(perfil?.sesionOverrides ?? {})
      setDiaWorkoutMap(perfil?.diaWorkoutMap ?? {})
      setSemanaOverrides(perfil?.semanaOverrides ?? {})
    } finally {
      setLoading(false)
    }
  }, [clienteId, isDemo])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Cargando calendario…</div>
  }

  if (!rutina?.semanas?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <Calendar size={36} className="text-gray-500" />
        <p className="text-gray-400 text-sm">No hay plan de 4 semanas activo.</p>
        <p className="text-gray-500 text-xs">Genera un plan desde la pestaña Rutina.</p>
      </div>
    )
  }

  const calendar = buildCalendar(rutina, sesiones, diasSemana, sesionOverrides, diaWorkoutMap, semanaOverrides)
  const allDays = calendar.flat()
  const totalSessions = allDays.filter(d => d.dia !== null).length
  const completedSessions = allDays.filter(d => d.sesion?.completada).length
  const currentWeekNum = allDays.find(d => d.isToday)?.semanaNum ?? calcCurrentWeek(rutina)

  return (
    <div className="space-y-4 pb-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Sesiones" value={`${completedSessions}/${totalSessions}`} color="#F5611A" />
        <StatCard label="Adherencia" value={`${totalSessions > 0 ? Math.round((completedSessions / Math.max(1, calendar.flat().filter(d => d.dia && d.isPast).length)) * 100) : 0}%`} color="#10B981" />
        <StatCard label="Semana" value={`${currentWeekNum}/4`} color="#8B5CF6" />
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #2a2d3e' }}>
        {/* Header */}
        <div className="grid grid-cols-8 text-xs text-gray-500 font-medium" style={{ background: '#1A1D2E' }}>
          <div className="py-2 px-2 text-center">#</div>
          {DAYS_ES.map(d => (
            <div key={d} className="py-2 text-center">{d}</div>
          ))}
        </div>

        {/* Rows */}
        {calendar.map((week, wi) => {
          const planWeekNum = week[0].semanaNum
          const semanaData = rutina.semanas?.[planWeekNum - 1]
          const isCurrentWeek = week.some(d => d.isToday)
          const isCycleStart = wi > 0 && planWeekNum === 1
          return (
            <div key={week[0].date}>
              {isCycleStart && (
                <div className="py-1 text-xs text-center text-gray-600" style={{ background: '#0f1020', borderTop: '2px solid #2a2d3e' }}>
                  · · · nuevo ciclo · · ·
                </div>
              )}
              <div style={{ borderTop: wi > 0 && !isCycleStart ? '1px solid #2a2d3e' : undefined }}>
                {/* Week label */}
                <div className="grid grid-cols-8">
                  <div
                    className="flex items-center justify-center py-1 text-xs font-bold"
                    style={{ background: '#262940', color: isCurrentWeek ? '#F5611A' : '#6b7280' }}
                  >
                    S{planWeekNum}
                  </div>
                  {week.map((day) => (
                    <DayCell key={day.date} day={day} onClick={() => setSelected(selected?.date === day.date ? null : day)} isSelected={selected?.date === day.date} />
                  ))}
                </div>
                {/* Week description */}
                <div className="px-3 py-1.5 text-xs text-gray-500 truncate" style={{ background: '#141623' }}>
                  {semanaData?.descripcion ?? `Semana ${planWeekNum}`}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Volumen semanal */}
      {(() => {
        const currentWeek = calendar.find(week => week.some(d => d.isToday)) ?? calendar.find(week => !week.every(d => d.isPast))
        if (!currentWeek) return null
        const volumen: Record<string, { plan: number; done: number }> = {}
        for (const day of currentWeek) {
          if (!day.dia) continue
          const diaId = day.dia.id
          const ocultos = perfil?.ejerciciosOcultos?.[diaId] ?? []
          const eliminados = perfil?.ejerciciosEliminados?.[diaId] ?? []
          const ovr = perfil?.ejercicioOverrides ?? {}
          const extra = perfil?.ejerciciosExtra?.[diaId] ?? []
          const ejs = [
            ...day.dia.ejercicios.map(ej => ({
              id: ej.id,
              nombre: ovr[ej.id]?.nombre ?? ej.nombre,
              series: ovr[ej.id]?.series ?? ej.series,
            })),
            ...extra.map(e => ({ id: e.id, nombre: e.nombre, series: e.series })),
          ].filter(e => !ocultos.includes(e.id) && !eliminados.includes(e.id))
          for (const ej of ejs) {
            const grupo = getGrupoMuscular(ej.nombre)
            if (!volumen[grupo]) volumen[grupo] = { plan: 0, done: 0 }
            volumen[grupo].plan += ej.series
            const completadas = day.sesion?.series_completadas?.[ej.id]
            volumen[grupo].done += completadas?.filter(s => s.completada).length ?? 0
          }
        }
        const entries = Object.entries(volumen).sort((a, b) => b[1].plan - a[1].plan)
        if (!entries.length) return null
        const GRUPO_COLORS: Record<string, string> = {
          Pecho: '#F5611A', Dorsales: '#8B5CF6', 'Espalda Alta': '#0EA5E9', Hombros: '#3B82F6',
          'Tríceps': '#10B981', 'Bíceps': '#F59E0B', 'Cuádriceps': '#EF4444',
          Isquios: '#06B6D4', 'Glúteos': '#EC4899', Gemelos: '#84CC16', Core: '#6B7280', Otros: '#4B5563',
        }
        return (
          <div className="rounded-2xl p-4" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: '#6B7280' }}>VOLUMEN SEMANAL</p>
            <div className="space-y-3">
              {entries.map(([grupo, { plan, done }]) => {
                const color = GRUPO_COLORS[grupo] ?? '#F5611A'
                const pct = Math.round((done / plan) * 100)
                return (
                  <div key={grupo}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium" style={{ color: '#D1D5DB' }}>{grupo}</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: done >= plan ? '#10B981' : color }}>
                        {done}<span style={{ color: '#4B5563' }}>/{plan}</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1E2130' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%`, background: done >= plan ? '#10B981' : color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Day detail */}
      {selected && (
        <DayDetail day={selected} perfil={perfil} />
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
        <span className="flex items-center gap-1"><CheckCircle2 size={12} style={{ color: '#10B981' }} /> Completada</span>
        <span className="flex items-center gap-1"><Clock size={12} style={{ color: '#F5611A' }} /> Hoy</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ background: '#F5611A33' }} /> Entreno</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ background: '#1A1D2E' }} /> Descanso</span>
      </div>
    </div>
  )
}

function calcCycleStart(fechaInicio: string): string {
  const elapsed = Date.now() - new Date(fechaInicio + 'T12:00:00').getTime()
  if (elapsed <= 0) return fechaInicio
  return addDays(fechaInicio, Math.floor(elapsed / (28 * 24 * 60 * 60 * 1000)) * 28)
}

function calcCurrentWeek(rutina: Rutina4Semanas): number {
  if (!rutina.fecha_inicio) return 1
  const ms = Date.now() - new Date(rutina.fecha_inicio + 'T12:00:00').getTime()
  if (ms <= 0) return 1
  return (Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) % 4) + 1
}

function DayCell({ day, onClick, isSelected }: { day: CalDay; onClick: () => void; isSelected: boolean; }) {
  const isTraining = day.dia !== null
  const isDone = day.sesion?.completada
  const date = new Date(day.date + 'T00:00:00')

  let bg = 'transparent'
  if (isDone) bg = 'rgba(16,185,129,0.18)'
  else if (day.isToday && isTraining) bg = '#F5611A'
  else if (isTraining && !day.isPast) bg = 'rgba(245,97,26,0.55)'
  else if (day.isToday) bg = '#F5611A20'

  let border = 'transparent'
  if (isSelected) border = '#F5611A'
  else if (day.isToday) border = '#F5611A66'

  const textColor = (!isDone && isTraining && !day.isPast) ? 'white' : day.isPast ? '#6b7280' : '#d1d5db'

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center py-2 gap-0.5 cursor-pointer transition-all relative"
      style={{ background: bg, border: `1px solid ${border}`, minHeight: 52 }}
    >
      <span className="text-xs font-semibold" style={{ color: textColor }}>
        {date.getDate()}
      </span>
      {isDone && <CheckCircle2 size={14} style={{ color: '#10B981' }} />}
      {!isDone && isTraining && day.isToday && <Clock size={12} style={{ color: 'white' }} />}
      {!isDone && isTraining && day.isPast && (
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444aa' }} />
      )}
      {day.isOverride && (
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: '#8B5CF6' }} />
      )}
    </button>
  )
}

function DayDetail({ day, perfil }: { day: CalDay; perfil: PerfilEntrenamiento | null }) {
  const date = new Date(day.date + 'T00:00:00')
  const label = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  const displayEjercicios = (() => {
    if (!day.dia) return []
    const diaId = day.dia.id
    const ovrMap = perfil?.ejercicioOverrides ?? {}
    const ocultos = perfil?.ejerciciosOcultos?.[diaId] ?? []
    const eliminados = perfil?.ejerciciosEliminados?.[diaId] ?? []
    const extras = perfil?.ejerciciosExtra?.[diaId] ?? []
    const orden = perfil?.ejercicioOrden?.[diaId]
    const raw = [
      ...day.dia.ejercicios.map(ej => ({
        ...ej,
        nombre: ovrMap[ej.id]?.nombre ?? ej.nombre,
        series: ovrMap[ej.id]?.series ?? ej.series,
        repsMin: ovrMap[ej.id]?.repsMin ?? ej.repsMin,
        repsMax: ovrMap[ej.id]?.repsMax ?? ej.repsMax,
      })),
      ...extras.map(e => ({ ...e, rir: 2, rpe: 8, descanso: 90, superset: false as const })),
    ].filter(ej => !ocultos.includes(ej.id) && !eliminados.includes(ej.id))
    return orden
      ? [...raw].sort((a, b) => { const ia = orden.indexOf(a.id), ib = orden.indexOf(b.id); if (ia === -1 && ib === -1) return 0; if (ia === -1) return 1; if (ib === -1) return -1; return ia - ib })
      : raw
  })()

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1A1D2E', border: '1px solid #2a2d3e' }}>
      <div className="flex items-center justify-between">
        <p className="text-white font-semibold text-sm capitalize">{label}</p>
        {day.sesion?.completada && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#10B98120', color: '#10B981' }}>✓ Completada</span>
        )}
        {day.sesion && !day.sesion.completada && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F5611A20', color: '#F5611A' }}>Parcial</span>
        )}
      </div>

      {day.dia ? (
        <>
          <p className="text-sm font-medium" style={{ color: '#F5611A' }}>{day.dia.titulo}</p>
          <div className="space-y-1.5">
            {displayEjercicios.map(ej => {
              const log = day.sesion?.series_completadas?.[ej.id]
              const done = log?.filter(s => s.completada).length ?? 0
              return (
                <div key={ej.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">{ej.nombre}</span>
                  <div className="flex items-center gap-3 text-gray-500">
                    <span>{ej.series}×{ej.repsMin}-{ej.repsMax}</span>
                    {log && <span style={{ color: done === ej.series ? '#10B981' : '#F5611A' }}>{done}/{ej.series}</span>}
                  </div>
                </div>
              )
            })}
          </div>
          {day.sesion?.sensacion && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-gray-500 text-xs">Sensación:</span>
              <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: '#262940', color: '#d1d5db' }}>
                {day.sesion.sensacion === 'facil' ? '😊 Fácil' : day.sesion.sensacion === 'justo' ? '😅 Justo' : '💀 Brutal'}
              </span>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-400 text-sm">🛌 Día de descanso</p>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: '#1A1D2E', border: '1px solid #2a2d3e' }}>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      <p className="text-gray-500 text-xs mt-0.5">{label}</p>
    </div>
  )
}
