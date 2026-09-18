import { useState, useEffect, useCallback } from 'react'
import { Loader2, CheckCircle2, Pencil, X, Check, Droplets, Moon, Zap } from 'lucide-react'
import { demoRutina } from '../../data/demo'
import {
  fetchRutina4Semanas, upsertSesionLog, fetchLastSesionForDia,
  upsertProgresoDiario, fetchProgresoDiario,
  type Rutina4Semanas, type DiaRutina, type ProgresoDiario,
} from '../../lib/supabase'

interface MiRutinaProps {
  userName: string
  userId: string
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const isDemo = (id: string) => id.startsWith('client-') || id.startsWith('admin-')

function serieKey(ejId: string, i: number) { return `${ejId}-${i}` }

function getDayOfWeekIndex(): number {
  return (new Date().getDay() + 6) % 7
}

function calcSemanaActual(fechaInicio?: string): number {
  if (!fechaInicio) return 1
  const ms = Date.now() - new Date(fechaInicio).getTime()
  return Math.min(4, Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24 * 7)) + 1))
}

function getTodayDiaIdx(dias: DiaRutina[]): number {
  if (!dias.length) return 0
  const dayIdx = getDayOfWeekIndex()
  const total = dias.length
  const maxSlot = total <= 5 ? 4 : 6
  const slotMap: Record<number, number> = {}
  for (let i = 0; i < total; i++) {
    slotMap[total === 1 ? 0 : Math.round((i * maxSlot) / (total - 1))] = i
  }
  return slotMap[dayIdx] ?? 0
}

function todayDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MiRutina({ userName, userId, onToast }: MiRutinaProps) {
  const demo = isDemo(userId)
  const [rutina, setRutina] = useState<Rutina4Semanas | null>(null)
  const [loading, setLoading] = useState(!demo)
  const [selectedDiaIdx, setSelectedDiaIdx] = useState(0)
  const [seriesDone, setSeriesDone] = useState<Record<string, boolean>>({})
  const [pesos, setPesos] = useState<Record<string, string>>({})
  const [reps, setReps] = useState<Record<string, string>>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [feeling, setFeeling] = useState(7)
  const [note, setNote] = useState('')
  const [sessionDate, setSessionDate] = useState(todayDateStr())
  const [sessionDone, setSessionDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSesionDate, setLastSesionDate] = useState<string | null>(null)
  // Per-exercise client overrides (name, series, reps) — session only
  const [ejOverrides, setEjOverrides] = useState<Record<string, { nombre: string; series: number; repsMin: number; repsMax: number }>>({})
  const [editingEj, setEditingEj] = useState<{ id: string; nombre: string; series: number; repsMin: number; repsMax: number } | null>(null)
  const [progreso, setProgreso] = useState<ProgresoDiario | null>(null)
  const [hidratacion, setHidratacion] = useState(0)
  const [litrosInput, setLitrosInput] = useState<number | ''>('')
  const [pasos, setPasos] = useState(0)
  const [horasSueno, setHorasSueno] = useState<number | ''>('')
  const [dolor, setDolor] = useState(5)

  const load = useCallback(async () => {
    if (demo) {
      const r: Rutina4Semanas = { nombre: demoRutina.nombre, semana_actual: 1, activa: true, dias: demoRutina.dias }
      setRutina(r)
      setSelectedDiaIdx(0)
      return
    }
    setLoading(true)
    const [r, progresos] = await Promise.all([
      fetchRutina4Semanas(userId),
      fetchProgresoDiario(userId, 1),
    ])
    setRutina(r)
    if (r) {
      const dias = r.semanas?.[calcSemanaActual(r.fecha_inicio) - 1]?.dias ?? r.dias ?? []
      const idx = getTodayDiaIdx(dias)
      setSelectedDiaIdx(idx)
      if (dias[idx]) prefillFromLast(dias[idx].id)
    }
    const todayProg = progresos.find(p => p.fecha === todayDateStr())
    if (todayProg) {
      setProgreso(todayProg)
      setHidratacion(todayProg.hidratacion ?? 0)
      setLitrosInput(todayProg.litros ?? (todayProg.hidratacion ?? 0) * 0.25)
      setPasos(todayProg.pasos ?? 0)
      setHorasSueno(todayProg.horas_sueno ?? '')
      setDolor(todayProg.dolor_corporal ?? 5)
    }
    setLoading(false)
  }, [userId, demo])

  useEffect(() => { load() }, [load])

  const today = new Date()
  const dayIndex = getDayOfWeekIndex()
  const dateStr = today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  const semanaActual = rutina ? calcSemanaActual(rutina.fecha_inicio) : 1
  const dias: DiaRutina[] = rutina
    ? (rutina.semanas?.[semanaActual - 1]?.dias ?? rutina.dias ?? [])
    : []

  const todayDiaIdx = getTodayDiaIdx(dias)
  const todayWorkout: DiaRutina | null = dias[selectedDiaIdx] ?? null

  const totalSeries = todayWorkout?.ejercicios.reduce((acc, e) => acc + (ejOverrides[e.id]?.series ?? e.series), 0) ?? 0
  const doneCount = Object.values(seriesDone).filter(Boolean).length
  const allDone = totalSeries > 0 && doneCount >= totalSeries

  const toggleSerie = (key: string) => {
    setSeriesDone(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const prefillFromLast = useCallback(async (diaId: string) => {
    if (demo) return
    setLastSesionDate(null)
    const last = await fetchLastSesionForDia(userId, diaId)
    if (!last) return
    const newPesos: Record<string, string> = {}
    const newReps: Record<string, string> = {}
    for (const [ejId, series] of Object.entries(last.series_completadas)) {
      series.forEach((s, idx) => {
        const k = serieKey(ejId, idx)
        if (s.peso != null && s.peso > 0) newPesos[k] = String(s.peso)
        if (s.reps != null && s.reps > 0) newReps[k] = String(s.reps)
      })
    }
    setPesos(newPesos)
    setReps(newReps)
    setLastSesionDate(last.fecha)
  }, [userId, demo])

  const selectDay = (idx: number) => {
    setSelectedDiaIdx(idx)
    setSeriesDone({})
    setPesos({})
    setReps({})
    setSessionDone(false)
    setEjOverrides({})
    setLastSesionDate(null)
    if (dias[idx]) prefillFromLast(dias[idx].id)
  }

  const saveEjEdit = () => {
    if (!editingEj) return
    setEjOverrides(prev => ({ ...prev, [editingEj.id]: { nombre: editingEj.nombre, series: editingEj.series, repsMin: editingEj.repsMin, repsMax: editingEj.repsMax } }))
    // Reset series done/pesos/reps for this exercise if series count changed
    setSeriesDone(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => { if (k.startsWith(editingEj.id + '-')) delete next[k] })
      return next
    })
    setPesos(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => { if (k.startsWith(editingEj.id + '-')) delete next[k] })
      return next
    })
    setReps(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => { if (k.startsWith(editingEj.id + '-')) delete next[k] })
      return next
    })
    setEditingEj(null)
  }

  const handleSubmitFeedback = async () => {
    if (!demo && rutina && todayWorkout) {
      setSaving(true)
      try {
        const sensacion: 'facil' | 'justo' | 'brutal' =
          feeling >= 7 ? 'facil' : feeling >= 4 ? 'justo' : 'brutal'
        const seriesMap: Record<string, { serie: number; reps?: number; peso?: number; completada: boolean }[]> = {}
        for (const ej of todayWorkout.ejercicios) {
          seriesMap[ej.id] = Array.from({ length: ej.series }, (_, i) => {
            const k = serieKey(ej.id, i)
            return { serie: i + 1, reps: reps[k] ? Number(reps[k]) : undefined, peso: pesos[k] ? Number(pesos[k]) : undefined, completada: seriesDone[k] ?? false }
          })
        }
        await Promise.all([
          upsertSesionLog({
            cliente_id: userId, rutina_id: rutina.id, semana_num: semanaActual,
            dia_id: todayWorkout.id, fecha: sessionDate, completada: allDone,
            sensacion, notas: note || undefined, series_completadas: seriesMap,
          }),
          upsertProgresoDiario({
            id: progreso?.id,
            cliente_id: userId, fecha: sessionDate,
            hidratacion,
            litros: litrosInput !== '' ? Number(litrosInput) : hidratacion * 0.25,
            pasos: pasos > 0 ? pasos : undefined,
            horas_sueno: horasSueno !== '' ? Number(horasSueno) : undefined,
            dolor_corporal: dolor,
          }),
        ])
      } catch (e) {
        console.error(e)
        setSaving(false)
        onToast('Error al guardar la sesión', 'error')
        return
      }
      setSaving(false)
    }
    setShowFeedback(false)
    setSessionDone(true)
    onToast('¡Sesión guardada! 🎉', 'success')
  }

  // Week dots
  const weekDots = (() => {
    const slots = new Set<number>()
    const total = dias.length
    const maxSlot = total <= 5 ? 4 : 6
    dias.forEach((_, i) => slots.add(total === 1 ? 0 : Math.round((i * maxSlot) / (total - 1))))
    return DIAS_SEMANA.map((d, i) => ({
      label: d, isToday: i === dayIndex,
      isTraining: slots.has(i), isDone: slots.has(i) && i < dayIndex,
    }))
  })()

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#F5611A' }} /></div>
  }

  if (!rutina || dias.length === 0) {
    return (
      <div className="px-4 pt-6">
        <div className="rounded-2xl p-10 flex flex-col items-center gap-3" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <div className="text-4xl">🏋️</div>
          <p className="font-medium text-white">Sin rutina asignada</p>
          <p className="text-sm text-center" style={{ color: '#6B7280' }}>Tu entrenador te asignará una rutina pronto</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-bold text-white">Hola, {userName.split(' ')[0]}! 👋</h1>
        <p className="text-sm mt-0.5 capitalize" style={{ color: '#6B7280' }}>{dateStr}</p>
      </div>

      {/* Day picker */}
      <div className="px-4 pb-4 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {dias.map((dia, i) => {
          const isSelected = i === selectedDiaIdx
          const isToday = i === todayDiaIdx
          return (
            <button key={dia.id} onClick={() => selectDay(i)}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              style={{ background: isSelected ? '#F5611A' : '#161820', color: isSelected ? 'white' : '#9CA3AF', border: `1px solid ${isSelected ? '#F5611A' : isToday ? 'rgba(245,97,26,0.4)' : '#1E2130'}` }}
            >
              {dia.titulo || dia.nombre}
              {isToday && !isSelected && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: '#F5611A' }} />}
            </button>
          )
        })}
      </div>

      {sessionDone ? (
        <div className="mx-4 rounded-2xl p-10 flex flex-col items-center gap-4" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <CheckCircle2 style={{ width: 36, height: 36, color: '#10B981' }} />
          </div>
          <div className="text-center">
            <p className="font-bold text-white text-lg">¡Sesión guardada!</p>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Buen trabajo. Tu entrenador verá tu progreso.</p>
          </div>
          <button onClick={() => { setSessionDone(false); setSeriesDone({}); setPesos({}); setReps({}) }}
            className="text-sm px-4 py-2 rounded-xl cursor-pointer" style={{ background: '#1E2130', color: '#6B7280' }}>
            Ver rutina de nuevo
          </button>
        </div>
      ) : todayWorkout ? (
        <>
          {/* Progress header */}
          <div className="mx-4 mb-3 rounded-2xl px-5 py-3" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold text-white text-sm">{todayWorkout.titulo || todayWorkout.nombre}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{rutina.nombre} · Semana {semanaActual}/4</p>
                {lastSesionDate && (
                  <p className="text-xs mt-0.5" style={{ color: '#10B981' }}>
                    ↺ Pesos de {new Date(lastSesionDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </div>
              <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(245,97,26,0.15)', color: '#F5611A' }}>
                {doneCount}/{totalSeries}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: '#1E2130' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: totalSeries > 0 ? `${(doneCount / totalSeries) * 100}%` : '0%', background: '#F5611A' }} />
            </div>
            {/* Save button always visible here */}
            <button onClick={() => setShowFeedback(true)}
              className="w-full py-2.5 rounded-xl font-bold cursor-pointer text-sm"
              style={{ background: allDone ? '#F5611A' : '#1E2130', border: allDone ? 'none' : '1px solid #2a2d3e', color: allDone ? 'white' : '#9CA3AF' }}>
              {allDone ? '🎉 Finalizar sesión' : `Guardar sesión (${doneCount}/${totalSeries})`}
            </button>
          </div>

          {/* Exercises */}
          <div className="mx-4 space-y-3 mb-4">
            {todayWorkout.ejercicios.map((ej, ejIdx) => {
              const ov = ejOverrides[ej.id]
              const nombre = ov?.nombre ?? ej.nombre
              const series = ov?.series ?? ej.series
              const repsMin = ov?.repsMin ?? ej.repsMin
              const repsMax = ov?.repsMax ?? ej.repsMax
              const ejDone = Array.from({ length: series }, (_, i) => seriesDone[serieKey(ej.id, i)] ?? false).every(Boolean)
              return (
                <div key={ej.id} className="rounded-2xl overflow-hidden" style={{ background: '#161820', border: `1px solid ${ejDone ? 'rgba(16,185,129,0.3)' : '#1E2130'}` }}>
                  {/* Exercise header */}
                  <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid #1E2130' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: ejDone ? 'rgba(16,185,129,0.2)' : 'rgba(245,97,26,0.15)', color: ejDone ? '#10B981' : '#F5611A' }}>
                      {ejDone ? '✓' : ejIdx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white truncate">{nombre}{ov && <span className="ml-1.5 text-xs" style={{ color: '#F5611A' }}>✎</span>}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        {series} series · {repsMin}–{repsMax} reps{ej.peso > 0 ? ` · Ref: ${ej.peso} kg` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingEj({ id: ej.id, nombre, series, repsMin, repsMax })}
                      className="flex-shrink-0 p-1.5 rounded-lg cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#6B7280' }}
                      title="Editar ejercicio"
                    >
                      <Pencil style={{ width: 13, height: 13 }} />
                    </button>
                  </div>

                  {/* Series */}
                  <div className="p-3 space-y-2">
                    {Array.from({ length: series }, (_, i) => {
                      const k = serieKey(ej.id, i)
                      const done = seriesDone[k] ?? false
                      return (
                        <div key={k} className="rounded-xl p-3" style={{ background: done ? 'rgba(16,185,129,0.07)' : '#0D0E13', border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : '#1E2130'}` }}>
                          {/* Row top: number + done button */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold" style={{ color: done ? '#10B981' : '#6B7280' }}>
                              Serie {i + 1}
                            </span>
                            <button
                              onClick={() => toggleSerie(k)}
                              className="px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all"
                              style={{
                                background: done ? 'rgba(16,185,129,0.2)' : 'rgba(245,97,26,0.15)',
                                color: done ? '#10B981' : '#F5611A',
                                border: `1px solid ${done ? 'rgba(16,185,129,0.4)' : 'rgba(245,97,26,0.3)'}`,
                              }}
                            >
                              {done ? '✓ Lista' : 'Marcar lista'}
                            </button>
                          </div>
                          {/* Inputs row */}
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="text-xs mb-1 block" style={{ color: '#4B5563' }}>Peso (kg)</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                placeholder="0"
                                value={pesos[k] ?? ''}
                                onChange={e => setPesos(prev => ({ ...prev, [k]: e.target.value }))}
                                disabled={done}
                                className="w-full px-3 py-2 rounded-lg text-sm font-semibold text-white outline-none text-center"
                                style={{ background: done ? 'rgba(255,255,255,0.03)' : '#161820', border: `1px solid ${done ? 'transparent' : '#2a2d3e'}`, opacity: done ? 0.5 : 1 }}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs mb-1 block" style={{ color: '#4B5563' }}>Reps</label>
                              <input
                                type="number"
                                inputMode="numeric"
                                placeholder="0"
                                value={reps[k] ?? ''}
                                onChange={e => setReps(prev => ({ ...prev, [k]: e.target.value }))}
                                disabled={done}
                                className="w-full px-3 py-2 rounded-lg text-sm font-semibold text-white outline-none text-center"
                                style={{ background: done ? 'rgba(255,255,255,0.03)' : '#161820', border: `1px solid ${done ? 'transparent' : '#2a2d3e'}`, opacity: done ? 0.5 : 1 }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recuperación */}
          <div className="mx-4 mb-3 rounded-2xl p-4 space-y-4" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap size={14} style={{ color: '#F5611A' }} /> Recuperación de hoy
            </p>
            {/* Hidratación */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs flex items-center gap-1" style={{ color: '#6B7280' }}><Droplets size={12} /> Hidratación</span>
                <span className="text-xs font-mono text-white">{hidratacion} vasos</span>
              </div>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <button key={i}
                    onClick={() => { const v = hidratacion === i + 1 ? i : i + 1; setHidratacion(v); setLitrosInput(parseFloat((v * 0.25).toFixed(2))) }}
                    className="w-8 h-8 rounded-full text-xs cursor-pointer transition-all"
                    style={{ background: i < hidratacion ? '#3B82F6' : '#1E2130', color: i < hidratacion ? 'white' : '#6B7280' }}>
                    💧
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={4} step={0.25} placeholder="0.00" value={litrosInput}
                  onChange={e => { const l = parseFloat(e.target.value); if (!isNaN(l)) { setLitrosInput(l); setHidratacion(Math.round(l / 0.25)) } else setLitrosInput('') }}
                  className="w-20 rounded-xl px-3 py-1.5 text-sm text-white outline-none text-center"
                  style={{ background: '#0D0E13', border: '1px solid #1E2130' }} />
                <span className="text-xs" style={{ color: '#6B7280' }}>litros · 1 vaso = 0.25 L</span>
              </div>
            </div>
            {/* Pasos */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs" style={{ color: '#6B7280' }}>👟 Pasos diarios</span>
                <span className="text-xs font-mono" style={{ color: pasos >= 10000 ? '#10B981' : pasos >= 5000 ? '#F59E0B' : '#9ca3af' }}>{pasos.toLocaleString('es-ES')}</span>
              </div>
              <input type="range" min={0} max={20000} step={100} value={pasos} onChange={e => setPasos(Number(e.target.value))} className="w-full accent-orange-500" />
              <div className="flex justify-between text-xs mt-1" style={{ color: '#4B5563' }}><span>0</span><span>20.000</span></div>
            </div>
            {/* Sueño */}
            <div>
              <span className="text-xs flex items-center gap-1 mb-2" style={{ color: '#6B7280' }}><Moon size={12} /> Horas de sueño</span>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={14} step={0.5} placeholder="7.5" value={horasSueno}
                  onChange={e => setHorasSueno(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-20 rounded-xl px-3 py-1.5 text-sm text-white outline-none text-center"
                  style={{ background: '#0D0E13', border: '1px solid #1E2130' }} />
                <span className="text-xs" style={{ color: '#6B7280' }}>horas</span>
              </div>
            </div>
            {/* Dolor */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs" style={{ color: '#6B7280' }}>Dolor muscular</span>
                <span className="text-xs font-mono" style={{ color: dolor > 7 ? '#EF4444' : dolor > 4 ? '#F59E0B' : '#10B981' }}>{dolor}/10</span>
              </div>
              <input type="range" min={1} max={10} value={dolor} onChange={e => setDolor(Number(e.target.value))} className="w-full accent-orange-500" />
              <div className="flex justify-between text-xs mt-1" style={{ color: '#4B5563' }}><span>Sin dolor</span><span>Muy intenso</span></div>
            </div>
          </div>

          {/* Week strip */}
          <div className="mx-4 rounded-2xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <h3 className="font-semibold text-white mb-4 text-sm">Esta semana</h3>
            <div className="flex gap-2 justify-between">
              {weekDots.map(({ label, isToday, isTraining, isDone }) => (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs" style={{ color: '#4B5563' }}>{label}</span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: isToday ? '#F5611A' : isDone ? 'rgba(16,185,129,0.2)' : isTraining ? 'rgba(245,97,26,0.1)' : '#1E2130', color: isToday ? 'white' : isDone ? '#10B981' : isTraining ? '#F5611A' : '#4B5563', border: isToday ? '2px solid #F5611A' : 'none' }}>
                    {isDone ? '✓' : isTraining ? '●' : '·'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {/* Edit exercise modal */}
      {editingEj && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#161820', border: '1px solid #1E2130', maxWidth: 480 }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white">Editar ejercicio</h3>
              <button onClick={() => setEditingEj(null)} className="cursor-pointer" style={{ color: '#6B7280' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <label className="text-xs mb-1.5 block" style={{ color: '#9CA3AF' }}>Nombre del ejercicio</label>
            <input
              type="text"
              value={editingEj.nombre}
              onChange={e => setEditingEj(prev => prev ? { ...prev, nombre: e.target.value } : null)}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none mb-4"
              style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
            />

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: '#9CA3AF' }}>Series</label>
                <input type="number" min={1} max={10}
                  value={editingEj.series}
                  onChange={e => setEditingEj(prev => prev ? { ...prev, series: Math.max(1, Number(e.target.value)) } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none text-center"
                  style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
                />
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: '#9CA3AF' }}>Reps mín</label>
                <input type="number" min={1}
                  value={editingEj.repsMin}
                  onChange={e => setEditingEj(prev => prev ? { ...prev, repsMin: Math.max(1, Number(e.target.value)) } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none text-center"
                  style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
                />
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: '#9CA3AF' }}>Reps máx</label>
                <input type="number" min={1}
                  value={editingEj.repsMax}
                  onChange={e => setEditingEj(prev => prev ? { ...prev, repsMax: Math.max(1, Number(e.target.value)) } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none text-center"
                  style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setEjOverrides(prev => { const n = { ...prev }; delete n[editingEj.id]; return n }); setEditingEj(null) }}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold cursor-pointer" style={{ background: '#1E2130', color: '#6B7280' }}>
                Restablecer
              </button>
              <button onClick={saveEjEdit}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white cursor-pointer flex items-center justify-center gap-2" style={{ background: '#F5611A' }}>
                <Check style={{ width: 14, height: 14 }} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#161820', border: '1px solid #1E2130', maxWidth: 480 }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: '#2a2d3e' }} />
            <h3 className="font-bold text-white text-lg mb-1">¿Cómo fue la sesión?</h3>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Tu entrenador verá tu feedback</p>

            {/* Fecha */}
            <p className="text-sm font-medium text-white mb-2">Fecha del entrenamiento</p>
            <input
              type="date"
              value={sessionDate}
              max={todayDateStr()}
              onChange={e => setSessionDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none mb-6 cursor-pointer"
              style={{ background: '#1E2130', border: '1px solid #2a2d3e', colorScheme: 'dark' }}
            />

            <p className="text-sm font-medium text-white mb-3">Sensación general</p>
            <div className="flex gap-1.5 mb-3">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setFeeling(n)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all"
                  style={{ background: feeling === n ? '#F5611A' : '#1E2130', color: feeling === n ? 'white' : '#6B7280', border: `1px solid ${feeling === n ? '#F5611A' : '#2a2d3e'}` }}>
                  {n}
                </button>
              ))}
            </div>
            <p className="text-center text-sm mb-6" style={{ color: feeling >= 8 ? '#10B981' : feeling >= 5 ? '#F59E0B' : '#EF4444' }}>
              {feeling >= 9 ? '🔥 Excelente' : feeling >= 7 ? '💪 Bien' : feeling >= 5 ? '😐 Regular' : '😓 Duro'}
            </p>

            <p className="text-sm font-medium text-white mb-2">Nota (opcional)</p>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Ej: Aumenté peso en sentadilla, RPE 8..." rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none mb-5"
              style={{ background: '#1E2130', border: '1px solid #2a2d3e' }} />

            <button onClick={handleSubmitFeedback} disabled={saving}
              className="w-full py-3.5 rounded-2xl font-bold text-white cursor-pointer text-sm flex items-center justify-center gap-2"
              style={{ background: '#F5611A', opacity: saving ? 0.8 : 1 }}>
              {saving ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Guardando...</> : 'Enviar feedback'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
