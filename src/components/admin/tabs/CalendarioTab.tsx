import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Clock, Calendar } from 'lucide-react'
import {
  fetchRutina4Semanas, fetchSesionesLog,
  type Rutina4Semanas, type SesionLog, type DiaRutina,
} from '../../../lib/supabase'

interface CalendarioTabProps {
  clienteId: string
  isDemo?: boolean
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
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
}

function buildCalendar(rutina: Rutina4Semanas, sesiones: SesionLog[]): CalDay[][] {
  const fechaInicio = rutina.fecha_inicio ?? today()
  const weeks: CalDay[][] = []
  const sesionMap = new Map(sesiones.map(s => [s.fecha + '_' + s.dia_id, s]))
  const todayStr = today()

  for (let w = 0; w < 4; w++) {
    const semanaData = rutina.semanas?.[w]
    const dias = semanaData?.dias ?? rutina.dias ?? []
    // Map training days to weekday slots (same logic as HoyTab)
    const diasMap = new Map<number, DiaRutina>()
    dias.forEach((dia, i) => {
      const slot = Math.round((i * 7) / dias.length)
      diasMap.set(slot, dia)
    })

    const weekStart = addDays(fechaInicio, w * 7)
    const weekStartMon = getStartOfWeekMon(weekStart)
    const row: CalDay[] = []

    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStartMon, d)
      const dia = diasMap.get(d) ?? null
      const sesionKey = dia ? date + '_' + dia.id : ''
      const sesion = sesionKey ? sesionMap.get(sesionKey) : undefined

      row.push({
        date,
        semanaNum: w + 1,
        dia,
        sesion,
        isToday: date === todayStr,
        isPast: date < todayStr,
      })
    }
    weeks.push(row)
  }
  return weeks
}

export default function CalendarioTab({ clienteId, isDemo, onToast: _onToast }: CalendarioTabProps) {
  const [rutina, setRutina] = useState<Rutina4Semanas | null>(null)
  const [sesiones, setSesiones] = useState<SesionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CalDay | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemo) return
      const [r, logs] = await Promise.all([
        fetchRutina4Semanas(clienteId),
        fetchSesionesLog(clienteId),
      ])
      setRutina(r)
      setSesiones(logs)
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

  const calendar = buildCalendar(rutina, sesiones)
  const totalSessions = calendar.flat().filter(d => d.dia !== null).length
  const completedSessions = calendar.flat().filter(d => d.sesion?.completada).length

  return (
    <div className="space-y-4 pb-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Sesiones" value={`${completedSessions}/${totalSessions}`} color="#F5611A" />
        <StatCard label="Adherencia" value={`${totalSessions > 0 ? Math.round((completedSessions / Math.max(1, calendar.flat().filter(d => d.dia && d.isPast).length)) * 100) : 0}%`} color="#10B981" />
        <StatCard label="Semana" value={`${calcCurrentWeek(rutina)}/4`} color="#8B5CF6" />
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
          const semanaData = rutina.semanas?.[wi]
          return (
            <div key={wi} style={{ borderTop: wi > 0 ? '1px solid #2a2d3e' : undefined }}>
              {/* Week label */}
              <div className="grid grid-cols-8">
                <div
                  className="flex items-center justify-center py-1 text-xs font-bold"
                  style={{ background: '#262940', color: wi === calcCurrentWeek(rutina) - 1 ? '#F5611A' : '#6b7280' }}
                >
                  S{wi + 1}
                </div>
                {week.map((day) => (
                  <DayCell key={day.date} day={day} onClick={() => setSelected(selected?.date === day.date ? null : day)} isSelected={selected?.date === day.date} />
                ))}
              </div>
              {/* Week description */}
              <div className="px-3 py-1.5 text-xs text-gray-500 truncate" style={{ background: '#141623' }}>
                {semanaData?.descripcion ?? `Semana ${wi + 1}`}
              </div>
            </div>
          )
        })}
      </div>

      {/* Day detail */}
      {selected && (
        <DayDetail day={selected} />
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

function calcCurrentWeek(rutina: Rutina4Semanas): number {
  if (!rutina.fecha_inicio) return 1
  const ms = Date.now() - new Date(rutina.fecha_inicio).getTime()
  return Math.min(4, Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24 * 7)) + 1))
}

function DayCell({ day, onClick, isSelected }: { day: CalDay; onClick: () => void; isSelected: boolean }) {
  const isTraining = day.dia !== null
  const isDone = day.sesion?.completada
  const date = new Date(day.date + 'T00:00:00')

  let bg = 'transparent'
  if (isDone) bg = '#10B98115'
  else if (day.isToday) bg = '#F5611A20'
  else if (isTraining && !day.isPast) bg = '#F5611A10'

  let border = 'transparent'
  if (isSelected) border = '#F5611A'
  else if (day.isToday) border = '#F5611A66'

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center py-2 gap-0.5 cursor-pointer transition-all relative"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        minHeight: 52,
      }}
    >
      <span className="text-xs" style={{ color: day.isToday ? '#F5611A' : day.isPast ? '#6b7280' : '#d1d5db' }}>
        {date.getDate()}
      </span>
      {isDone && <CheckCircle2 size={14} style={{ color: '#10B981' }} />}
      {!isDone && isTraining && day.isToday && <Clock size={12} style={{ color: '#F5611A' }} />}
      {!isDone && isTraining && !day.isToday && (
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: day.isPast ? '#ef444466' : '#F5611A66' }} />
      )}
    </button>
  )
}

function DayDetail({ day }: { day: CalDay }) {
  const date = new Date(day.date + 'T00:00:00')
  const label = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

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
            {day.dia.ejercicios.map(ej => {
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
