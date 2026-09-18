import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Clock, Calendar, Loader2 } from 'lucide-react'
import {
  fetchRutina4Semanas, fetchSesionesLog,
  type Rutina4Semanas, type SesionLog, type DiaRutina,
} from '../../lib/supabase'

interface MiCalendarioProps {
  userId: string
}

const DAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDayOfWeekMon(dateStr: string): number {
  return (new Date(dateStr + 'T00:00:00').getDay() + 6) % 7
}

function getStartOfWeekMon(dateStr: string): string {
  return addDays(dateStr, -getDayOfWeekMon(dateStr))
}

function calcCurrentWeek(rutina: Rutina4Semanas): number {
  if (!rutina.fecha_inicio) return 1
  const ms = Date.now() - new Date(rutina.fecha_inicio).getTime()
  return Math.min(4, Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24 * 7)) + 1))
}

interface CalDay {
  date: string
  semanaNum: number
  dia: DiaRutina | null
  sesion?: SesionLog
  isToday: boolean
  isPast: boolean
}

function buildCalendar(rutina: Rutina4Semanas, sesiones: SesionLog[]): CalDay[][] {
  const fechaInicio = rutina.fecha_inicio ?? todayStr()
  const sesionMap = new Map(sesiones.map(s => [s.fecha + '_' + s.dia_id, s]))
  const today = todayStr()
  const weeks: CalDay[][] = []

  for (let w = 0; w < 4; w++) {
    const dias = rutina.semanas?.[w]?.dias ?? rutina.dias ?? []
    const total = dias.length
    const maxSlot = total <= 5 ? 4 : 6
    const diasMap = new Map<number, DiaRutina>()
    dias.forEach((dia, i) => {
      const slot = total === 1 ? 0 : Math.round((i * maxSlot) / (total - 1))
      diasMap.set(slot, dia)
    })

    const weekStartMon = getStartOfWeekMon(addDays(fechaInicio, w * 7))
    const row: CalDay[] = []
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStartMon, d)
      const dia = diasMap.get(d) ?? null
      const sesionKey = dia ? date + '_' + dia.id : ''
      row.push({
        date, semanaNum: w + 1, dia,
        sesion: sesionKey ? sesionMap.get(sesionKey) : undefined,
        isToday: date === today,
        isPast: date < today,
      })
    }
    weeks.push(row)
  }
  return weeks
}

export default function MiCalendario({ userId }: MiCalendarioProps) {
  const [rutina, setRutina] = useState<Rutina4Semanas | null>(null)
  const [sesiones, setSesiones] = useState<SesionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CalDay | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, logs] = await Promise.all([fetchRutina4Semanas(userId), fetchSesionesLog(userId)])
      setRutina(r)
      setSesiones(logs)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin" style={{ width: 22, height: 22, color: '#F5611A' }} />
      </div>
    )
  }

  if (!rutina?.semanas?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 px-6 text-center">
        <Calendar size={40} style={{ color: '#374151' }} />
        <p className="font-semibold text-white">Sin plan activo</p>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Tu entrenador te asignará un plan de 4 semanas pronto.
        </p>
      </div>
    )
  }

  const calendar = buildCalendar(rutina, sesiones)
  const allDays = calendar.flat()
  const totalSessions = allDays.filter(d => d.dia !== null).length
  const completedSessions = allDays.filter(d => d.sesion?.completada).length
  const pastTrainingDays = allDays.filter(d => d.dia && d.isPast).length
  const adherencia = pastTrainingDays > 0 ? Math.round((completedSessions / pastTrainingDays) * 100) : 0
  const semanaActual = calcCurrentWeek(rutina)

  return (
    <div className="pb-28 px-4 pt-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Sesiones', value: `${completedSessions}/${totalSessions}`, color: '#F5611A' },
          { label: 'Adherencia', value: `${adherencia}%`, color: '#10B981' },
          { label: 'Semana', value: `${semanaActual}/4`, color: '#8B5CF6' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1E2130' }}>
        {/* Header días */}
        <div className="grid grid-cols-8 text-xs font-medium" style={{ background: '#1E2130' }}>
          <div className="py-2 text-center" style={{ color: '#4B5563' }}>#</div>
          {DAYS_ES.map(d => (
            <div key={d} className="py-2 text-center" style={{ color: '#6B7280' }}>{d}</div>
          ))}
        </div>

        {/* Semanas */}
        {calendar.map((week, wi) => {
          const semDesc = rutina.semanas?.[wi]?.descripcion ?? `Semana ${wi + 1}`
          const isCurrentWeek = wi + 1 === semanaActual
          return (
            <div key={wi} style={{ borderTop: wi > 0 ? '1px solid #1E2130' : undefined }}>
              <div className="grid grid-cols-8">
                <div
                  className="flex items-center justify-center text-xs font-bold"
                  style={{ background: '#161820', color: isCurrentWeek ? '#F5611A' : '#4B5563', minHeight: 52 }}
                >
                  S{wi + 1}
                </div>
                {week.map(day => {
                  const isTraining = day.dia !== null
                  const isDone = day.sesion?.completada
                  const dayNum = new Date(day.date + 'T00:00:00').getDate()

                  let bg = 'transparent'
                  if (isDone) bg = 'rgba(16,185,129,0.18)'
                  else if (day.isToday && isTraining) bg = '#F5611A'
                  else if (isTraining && !day.isPast) bg = 'rgba(245,97,26,0.55)'
                  else if (day.isToday) bg = 'rgba(245,97,26,0.15)'

                  const isSelected = selected?.date === day.date

                  return (
                    <button
                      key={day.date}
                      onClick={() => setSelected(isSelected ? null : day)}
                      className="flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
                      style={{
                        background: bg,
                        minHeight: 52,
                        border: `1px solid ${isSelected ? '#F5611A' : day.isToday ? 'rgba(245,97,26,0.4)' : 'transparent'}`,
                      }}
                    >
                      <span className="text-xs font-semibold" style={{
                        color: (day.isToday && isTraining) ? 'white'
                          : (!isDone && isTraining && !day.isPast) ? 'white'
                          : day.isPast ? '#4B5563' : '#D1D5DB'
                      }}>
                        {dayNum}
                      </span>
                      {isDone && <CheckCircle2 size={12} style={{ color: '#10B981' }} />}
                      {!isDone && isTraining && day.isToday && <Clock size={11} style={{ color: 'white' }} />}
                      {!isDone && isTraining && day.isPast && (
                        <div className="w-2 h-2 rounded-full" style={{ background: '#EF4444AA' }} />
                      )}
                    </button>
                  )
                })}
              </div>
              {/* Semana descripción */}
              <div className="px-3 py-1 text-xs truncate" style={{ background: '#0D0E13', color: '#4B5563' }}>
                {semDesc}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detalle día seleccionado */}
      {selected && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white text-sm capitalize">
              {new Date(selected.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {selected.sesion?.completada && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>✓ Completada</span>
            )}
          </div>

          {selected.dia ? (
            <>
              <p className="text-sm font-medium" style={{ color: '#F5611A' }}>{selected.dia.titulo}</p>
              <div className="space-y-2">
                {selected.dia.ejercicios.map(ej => {
                  const log = selected.sesion?.series_completadas?.[ej.id]
                  const done = log?.filter(s => s.completada).length ?? 0
                  return (
                    <div key={ej.id} className="flex items-center justify-between text-xs">
                      <span style={{ color: '#D1D5DB' }}>{ej.nombre}</span>
                      <div className="flex items-center gap-2" style={{ color: '#6B7280' }}>
                        <span>{ej.series}×{ej.repsMin}-{ej.repsMax}</span>
                        {log && (
                          <span style={{ color: done === ej.series ? '#10B981' : '#F5611A' }}>
                            {done}/{ej.series}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {selected.sesion?.sensacion && (
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  Sensación: {selected.sesion.sensacion === 'facil' ? '😊 Fácil' : selected.sesion.sensacion === 'justo' ? '😅 Justo' : '💀 Brutal'}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm" style={{ color: '#6B7280' }}>🛌 Día de descanso</p>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-xs px-1 flex-wrap" style={{ color: '#6B7280' }}>
        <span className="flex items-center gap-1"><CheckCircle2 size={11} style={{ color: '#10B981' }} /> Completada</span>
        <span className="flex items-center gap-1"><Clock size={11} style={{ color: '#F5611A' }} /> Hoy</span>
        <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F5611A' }} /> Entreno</span>
        <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444AA' }} /> Perdida</span>
      </div>
    </div>
  )
}
