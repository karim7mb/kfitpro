import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Clock, Calendar, Settings, X, ArrowLeftRight, Loader2 } from 'lucide-react'
import {
  fetchRutina4Semanas, fetchSesionesLog, fetchPerfilEntrenamiento, updatePerfilEntrenamiento,
  type Rutina4Semanas, type SesionLog, type DiaRutina, type PerfilEntrenamiento,
} from '../../lib/supabase'

interface MiCalendarioProps {
  userId: string
}

const DAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DAYS_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

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
  isOverride: boolean
}

function buildCalendar(
  rutina: Rutina4Semanas,
  sesiones: SesionLog[],
  diasSemana: number[],
  sesionOverrides: Record<string, string>,
): CalDay[][] {
  const fechaInicio = rutina.fecha_inicio ?? todayStr()
  const sesionMap = new Map(sesiones.map(s => [s.fecha + '_' + s.dia_id, s]))
  const today = todayStr()
  const weeks: CalDay[][] = []

  for (let w = 0; w < 4; w++) {
    const dias = rutina.semanas?.[w]?.dias ?? rutina.dias ?? []
    const total = dias.length
    const diasMap = new Map<number, DiaRutina>()

    if (diasSemana.length > 0) {
      const sorted = [...diasSemana].sort((a, b) => a - b)
      dias.forEach((dia, i) => { if (i < sorted.length) diasMap.set(sorted[i], dia) })
    } else {
      const maxSlot = total <= 5 ? 4 : 6
      dias.forEach((dia, i) => {
        const slot = total === 1 ? 0 : Math.round((i * maxSlot) / (total - 1))
        diasMap.set(slot, dia)
      })
    }

    const weekStartMon = getStartOfWeekMon(addDays(fechaInicio, w * 7))
    const row: CalDay[] = []

    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStartMon, d)
      let dia = diasMap.get(d) ?? null
      let isOverride = false

      const overrideDiaId = sesionOverrides[date]
      if (overrideDiaId) {
        const weekDias = rutina.semanas?.[w]?.dias ?? rutina.dias ?? []
        const overrideDia = weekDias.find(dd => dd.id === overrideDiaId) ?? null
        if (overrideDia) { dia = overrideDia; isOverride = true }
      }

      const sesionKey = dia ? date + '_' + dia.id : ''
      row.push({
        date, semanaNum: w + 1, dia,
        sesion: sesionKey ? sesionMap.get(sesionKey) : undefined,
        isToday: date === today,
        isPast: date < today,
        isOverride,
      })
    }
    weeks.push(row)
  }
  return weeks
}

// ── Day picker modal ──────────────────────────────────────────────────────────

function DayPickerModal({
  numSesiones,
  selected,
  saving,
  onConfirm,
  onClose,
}: {
  numSesiones: number
  selected: number[]
  saving: boolean
  onConfirm: (dias: number[]) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<number[]>(selected)

  const toggle = (d: number) =>
    setLocal(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b))

  const tooMany = local.length > numSesiones
  const tooFew = local.length > 0 && local.length < numSesiones

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="w-full rounded-t-2xl pb-8 pt-5 px-5 max-w-md" style={{ background: '#161820', border: '1px solid #1E2130' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-white">Mis días de entreno</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg cursor-pointer" style={{ background: '#1E2130', color: '#9CA3AF' }}>
            <X size={16} />
          </button>
        </div>
        <p className="text-xs mb-5" style={{ color: '#6B7280' }}>
          Tu rutina tiene <span style={{ color: '#F5611A', fontWeight: 600 }}>{numSesiones} sesiones</span>/semana — selecciona {numSesiones} días
        </p>
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {DAYS_ES.map((day, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              className="py-3 rounded-xl text-sm font-bold cursor-pointer transition-all"
              style={{
                background: local.includes(i) ? 'rgba(245,97,26,0.2)' : '#1E2130',
                color: local.includes(i) ? '#F5611A' : '#6B7280',
                border: `1px solid ${local.includes(i) ? '#F5611A' : '#2a2d3e'}`,
              }}
            >
              {day}
            </button>
          ))}
        </div>
        {(tooMany || tooFew) && (
          <p className="text-xs text-center mb-3" style={{ color: tooMany ? '#F59E0B' : '#6B7280' }}>
            {tooMany
              ? `${local.length} seleccionados — solo se usarán los primeros ${numSesiones}`
              : `Selecciona ${numSesiones - local.length} día${numSesiones - local.length !== 1 ? 's' : ''} más`}
          </p>
        )}
        <button
          onClick={() => local.length > 0 && !saving && onConfirm(local)}
          disabled={local.length === 0 || saving}
          className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
          style={{ background: local.length > 0 ? '#F5611A' : '#374151', color: 'white', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : 'Guardar horario'}
        </button>
      </div>
    </div>
  )
}

// ── Swap session modal ────────────────────────────────────────────────────────

function SwapModal({
  date,
  currentDiaId,
  weekDias,
  hasOverride,
  onConfirm,
  onClear,
  onClose,
}: {
  date: string
  currentDiaId: string | undefined
  weekDias: DiaRutina[]
  hasOverride: boolean
  onConfirm: (diaId: string) => void
  onClear: () => void
  onClose: () => void
}) {
  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="w-full rounded-t-2xl pb-8 pt-5 px-5 max-w-md" style={{ background: '#161820', border: '1px solid #1E2130' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-white">Elegir sesión</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg cursor-pointer" style={{ background: '#1E2130', color: '#9CA3AF' }}>
            <X size={16} />
          </button>
        </div>
        <p className="text-xs mb-4 capitalize" style={{ color: '#6B7280' }}>{dateLabel}</p>
        <div className="space-y-2 mb-4">
          {weekDias.map(dia => (
            <button
              key={dia.id}
              onClick={() => onConfirm(dia.id)}
              className="w-full px-4 py-3 rounded-xl text-left cursor-pointer transition-all"
              style={{
                background: currentDiaId === dia.id ? 'rgba(245,97,26,0.15)' : '#1E2130',
                border: `1px solid ${currentDiaId === dia.id ? '#F5611A' : '#2a2d3e'}`,
              }}
            >
              <span className="block text-sm font-semibold" style={{ color: currentDiaId === dia.id ? '#F5611A' : '#E5E7EB' }}>
                {dia.nombre}
              </span>
              <span className="block text-xs mt-0.5" style={{ color: '#6B7280' }}>{dia.titulo}</span>
            </button>
          ))}
        </div>
        {(hasOverride || currentDiaId) && (
          <button
            onClick={onClear}
            className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            {hasOverride ? 'Quitar cambio — volver a original' : 'Quitar sesión de este día'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MiCalendario({ userId }: MiCalendarioProps) {
  const [rutina, setRutina] = useState<Rutina4Semanas | null>(null)
  const [sesiones, setSesiones] = useState<SesionLog[]>([])
  const [perfil, setPerfil] = useState<PerfilEntrenamiento | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CalDay | null>(null)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [showSwap, setShowSwap] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, logs, p] = await Promise.all([
        fetchRutina4Semanas(userId),
        fetchSesionesLog(userId),
        fetchPerfilEntrenamiento(userId),
      ])
      setRutina(r)
      setSesiones(logs)
      setPerfil(p)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const diasSemana: number[] = perfil?.diasSemana ?? []
  const sesionOverrides: Record<string, string> = perfil?.sesionOverrides ?? {}

  const getOrCreatePerfil = (): PerfilEntrenamiento =>
    perfil ?? {
      altura: 0, diasEntreno: rutina?.dias?.length ?? 3, tiempoEntrenoSemana: '3-4h',
      tipoTrabajo: 'sedentario', nivel: 'principiante', tiempoIntentando: 'menos1',
      entrenadorPrevio: false, lesiones: [],
    }

  const saveDiasSemana = async (newDias: number[]) => {
    setSaving(true)
    try {
      const updated: PerfilEntrenamiento = { ...getOrCreatePerfil(), diasSemana: newDias.sort((a, b) => a - b) }
      await updatePerfilEntrenamiento(userId, updated)
      setPerfil(updated)
      setShowDayPicker(false)
    } finally {
      setSaving(false)
    }
  }

  const saveOverride = async (date: string, diaId: string) => {
    const updated: PerfilEntrenamiento = {
      ...getOrCreatePerfil(),
      sesionOverrides: { ...sesionOverrides, [date]: diaId },
    }
    await updatePerfilEntrenamiento(userId, updated)
    setPerfil(updated)
    setShowSwap(false)
    setSelected(null)
  }

  const removeOverride = async (date: string) => {
    const newOverrides = { ...sesionOverrides }
    delete newOverrides[date]
    const updated: PerfilEntrenamiento = { ...getOrCreatePerfil(), sesionOverrides: newOverrides }
    await updatePerfilEntrenamiento(userId, updated)
    setPerfil(updated)
    setShowSwap(false)
    setSelected(null)
  }

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
        <p className="text-sm" style={{ color: '#6B7280' }}>Tu entrenador te asignará un plan de 4 semanas pronto.</p>
      </div>
    )
  }

  const numSesiones = rutina.dias?.length ?? 0
  const calendar = buildCalendar(rutina, sesiones, diasSemana, sesionOverrides)
  const allDaysList = calendar.flat()
  const totalSessions = allDaysList.filter(d => d.dia !== null).length
  const completedSessions = allDaysList.filter(d => d.sesion?.completada).length
  const pastTrainingDays = allDaysList.filter(d => d.dia && d.isPast).length
  const adherencia = pastTrainingDays > 0 ? Math.round((completedSessions / pastTrainingDays) * 100) : 0
  const semanaActual = calcCurrentWeek(rutina)

  // Sessions list for the selected day's week (for swap modal)
  const selectedWeekIdx = (selected?.semanaNum ?? 1) - 1
  const swapDias = rutina.semanas?.[selectedWeekIdx]?.dias ?? rutina.dias ?? []

  const diasSemanaLabel = diasSemana.length > 0
    ? diasSemana.sort((a, b) => a - b).map(d => DAYS_LONG[d]).join(', ')
    : 'Auto'

  return (
    <div className="pb-28 px-4 pt-4 space-y-4">
      {/* Modals */}
      {showDayPicker && (
        <DayPickerModal
          numSesiones={numSesiones}
          selected={diasSemana}
          saving={saving}
          onConfirm={saveDiasSemana}
          onClose={() => setShowDayPicker(false)}
        />
      )}
      {showSwap && selected && (
        <SwapModal
          date={selected.date}
          currentDiaId={selected.dia?.id}
          weekDias={swapDias}
          hasOverride={selected.isOverride}
          onConfirm={(diaId) => saveOverride(selected.date, diaId)}
          onClear={() => removeOverride(selected.date)}
          onClose={() => setShowSwap(false)}
        />
      )}

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

      {/* Header con botón Mis días */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: '#6B7280' }}>
          <span style={{ color: '#4B5563' }}>Entreno: </span>
          <span style={{ color: diasSemana.length > 0 ? '#E5E7EB' : '#4B5563' }}>{diasSemanaLabel}</span>
        </p>
        <button
          onClick={() => setShowDayPicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
          style={{ background: '#1E2130', color: '#9CA3AF', border: '1px solid #2a2d3e' }}
        >
          <Settings size={12} />
          Mis días
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1E2130' }}>
        <div className="grid grid-cols-8 text-xs font-medium" style={{ background: '#1E2130' }}>
          <div className="py-2 text-center" style={{ color: '#4B5563' }}>#</div>
          {DAYS_ES.map(d => (
            <div key={d} className="py-2 text-center" style={{ color: '#6B7280' }}>{d}</div>
          ))}
        </div>

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
                  const isSelected = selected?.date === day.date

                  let bg = 'transparent'
                  if (isDone) bg = 'rgba(16,185,129,0.18)'
                  else if (day.isToday && isTraining) bg = '#F5611A'
                  else if (isTraining && !day.isPast) bg = 'rgba(245,97,26,0.55)'
                  else if (day.isToday) bg = 'rgba(245,97,26,0.15)'

                  return (
                    <button
                      key={day.date}
                      onClick={() => setSelected(isSelected ? null : day)}
                      className="flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all relative"
                      style={{
                        background: bg,
                        minHeight: 52,
                        border: `1px solid ${isSelected ? '#F5611A' : day.isToday ? 'rgba(245,97,26,0.4)' : 'transparent'}`,
                      }}
                    >
                      <span className="text-xs font-semibold" style={{
                        color: (day.isToday && isTraining) ? 'white'
                          : (!isDone && isTraining && !day.isPast) ? 'white'
                          : day.isPast ? '#4B5563' : '#D1D5DB',
                      }}>
                        {dayNum}
                      </span>
                      {isDone && <CheckCircle2 size={12} style={{ color: '#10B981' }} />}
                      {!isDone && isTraining && day.isToday && <Clock size={11} style={{ color: 'white' }} />}
                      {!isDone && isTraining && day.isPast && (
                        <div className="w-2 h-2 rounded-full" style={{ background: '#EF4444AA' }} />
                      )}
                      {day.isOverride && (
                        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: '#8B5CF6' }} />
                      )}
                    </button>
                  )
                })}
              </div>
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
            <div className="flex items-center gap-2">
              {selected.sesion?.completada && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                  Completada
                </span>
              )}
              {selected.isOverride && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
                  Modificada
                </span>
              )}
            </div>
          </div>

          {selected.dia ? (
            <>
              <p className="text-sm font-medium" style={{ color: '#F5611A' }}>{selected.dia.titulo}</p>
              <div className="space-y-1.5">
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
              {!selected.isPast && !selected.sesion?.completada && (
                <button
                  onClick={() => setShowSwap(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer pt-1"
                  style={{ color: '#6B7280' }}
                >
                  <ArrowLeftRight size={12} />
                  Cambiar sesión para este día
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: '#6B7280' }}>Día de descanso</p>
              {!selected.isPast && (
                <button
                  onClick={() => setShowSwap(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(245,97,26,0.1)', color: '#F5611A', border: '1px solid rgba(245,97,26,0.2)' }}
                >
                  <ArrowLeftRight size={12} />
                  Entrenar este día
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-xs px-1 flex-wrap" style={{ color: '#6B7280' }}>
        <span className="flex items-center gap-1"><CheckCircle2 size={11} style={{ color: '#10B981' }} /> Completada</span>
        <span className="flex items-center gap-1"><Clock size={11} style={{ color: '#F5611A' }} /> Hoy</span>
        <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F5611A' }} /> Entreno</span>
        <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444AA' }} /> Perdida</span>
        <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#8B5CF6' }} /> Modificada</span>
      </div>
    </div>
  )
}
