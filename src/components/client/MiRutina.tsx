import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, Circle } from 'lucide-react'
import { demoRutina } from '../../data/demo'
import { fetchRutina, type RutinaData } from '../../lib/supabase'

interface MiRutinaProps {
  userName: string
  userId: string
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const isDemo = (id: string) => id.startsWith('client-') || id.startsWith('admin-')

function serieKey(ejId: string, i: number) { return `${ejId}-${i}` }

export default function MiRutina({ userName, userId, onToast }: MiRutinaProps) {
  const demo = isDemo(userId)
  const [rutina, setRutina] = useState<RutinaData | null>(null)
  const [loading, setLoading] = useState(!demo)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [seriesDone, setSeriesDone] = useState<Record<string, boolean>>({})
  const [pesos, setPesos] = useState<Record<string, string>>({})
  const [reps, setReps] = useState<Record<string, string>>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [feeling, setFeeling] = useState(7)
  const [note, setNote] = useState('')
  const [sessionDone, setSessionDone] = useState(false)

  useEffect(() => {
    if (demo) {
      setRutina(demoRutina)
      return
    }
    fetchRutina(userId).then(r => {
      setRutina(r ?? demoRutina)
      setLoading(false)
    })
  }, [userId, demo])

  const today = new Date()
  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1
  const dateStr = today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayWorkout = rutina?.dias[0] ?? null

  const totalSeries = todayWorkout?.ejercicios.reduce((acc, e) => acc + e.series, 0) ?? 0
  const doneCount = Object.values(seriesDone).filter(Boolean).length
  const allDone = totalSeries > 0 && doneCount >= totalSeries

  const toggleSerie = (key: string) => {
    setSeriesDone(prev => {
      const next = { ...prev, [key]: !prev[key] }
      return next
    })
  }

  const handleFinalizar = () => {
    setShowFeedback(true)
  }

  const handleSubmitFeedback = () => {
    setShowFeedback(false)
    setSessionDone(true)
    onToast('¡Sesión completada! 🎉', 'success')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#F5611A' }} />
      </div>
    )
  }

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold text-white">
          Hola, {userName.split(' ')[0]}! 👋
        </h1>
        <p className="text-sm mt-0.5 capitalize" style={{ color: '#6B7280' }}>{dateStr}</p>
      </div>

      {!rutina || !todayWorkout ? (
        <div className="mx-4 rounded-2xl p-10 flex flex-col items-center gap-3" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <div className="text-4xl">🏋️</div>
          <p className="font-medium text-white">Sin rutina asignada</p>
          <p className="text-sm text-center" style={{ color: '#6B7280' }}>Tu entrenador te asignará una rutina pronto</p>
        </div>
      ) : sessionDone ? (
        <div className="mx-4 rounded-2xl p-10 flex flex-col items-center gap-4" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <CheckCircle2 style={{ width: 36, height: 36, color: '#10B981' }} />
          </div>
          <div className="text-center">
            <p className="font-bold text-white text-lg">¡Sesión completada!</p>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Buen trabajo. Tu entrenador verá tu progreso.</p>
          </div>
          <button
            onClick={() => { setSessionDone(false); setSeriesDone({}); setPesos({}); setReps({}) }}
            className="text-sm px-4 py-2 rounded-xl cursor-pointer"
            style={{ background: '#1E2130', color: '#6B7280' }}
          >
            Ver rutina de nuevo
          </button>
        </div>
      ) : (
        <>
          {/* Session card */}
          <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            {/* Session header */}
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #1E2130' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bold text-white">{todayWorkout.titulo || todayWorkout.nombre}</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                    {rutina.nombre} · Semana {rutina.semana_actual}
                  </p>
                </div>
                <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(245,97,26,0.15)', color: '#F5611A' }}>
                  {doneCount}/{totalSeries}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2130' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: totalSeries > 0 ? `${(doneCount / totalSeries) * 100}%` : '0%', background: '#F5611A' }}
                />
              </div>
            </div>

            {/* Exercises */}
            <div className="divide-y" style={{ borderColor: '#1E2130' }}>
              {todayWorkout.ejercicios.map(ej => {
                const ejDone = Array.from({ length: ej.series }, (_, i) => seriesCompletadas(seriesDone, ej.id, i)).every(Boolean)
                const isOpen = expanded[ej.id] ?? true

                return (
                  <div key={ej.id}>
                    {/* Exercise row */}
                    <button
                      className="w-full flex items-center gap-3 px-5 py-4 cursor-pointer text-left"
                      onClick={() => setExpanded(prev => ({ ...prev, [ej.id]: !isOpen }))}
                    >
                      <div className="flex-shrink-0">
                        {ejDone
                          ? <CheckCircle2 style={{ width: 22, height: 22, color: '#10B981' }} />
                          : <Circle style={{ width: 22, height: 22, color: '#4B5563' }} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white" style={{ textDecoration: ejDone ? 'line-through' : 'none', opacity: ejDone ? 0.6 : 1 }}>
                          {ej.nombre}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                          {ej.series} series · {ej.repsMin}–{ej.repsMax} reps
                          {ej.peso > 0 ? ` · Ref: ${ej.peso} kg` : ''}
                        </p>
                      </div>
                      {isOpen
                        ? <ChevronUp style={{ width: 16, height: 16, color: '#4B5563', flexShrink: 0 }} />
                        : <ChevronDown style={{ width: 16, height: 16, color: '#4B5563', flexShrink: 0 }} />
                      }
                    </button>

                    {/* Series */}
                    {isOpen && (
                      <div className="pb-3 px-5 space-y-2">
                        {/* Header row */}
                        <div className="flex items-center gap-2 px-2">
                          <div className="w-8" />
                          <span className="flex-1 text-xs" style={{ color: '#4B5563' }}>Serie</span>
                          <span className="w-24 text-xs" style={{ color: '#4B5563' }}>Peso (kg)</span>
                          <span className="w-16 text-xs" style={{ color: '#4B5563' }}>Reps</span>
                        </div>
                        {Array.from({ length: ej.series }, (_, i) => {
                          const k = serieKey(ej.id, i)
                          const done = seriesDone[k]
                          return (
                            <div
                              key={k}
                              className="flex items-center gap-2 rounded-xl px-2 py-2 transition-all"
                              style={{ background: done ? 'rgba(16,185,129,0.08)' : '#1E2130' }}
                            >
                              <button
                                onClick={() => toggleSerie(k)}
                                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0 transition-all"
                                style={{ background: done ? 'rgba(16,185,129,0.2)' : '#2a2d3e' }}
                              >
                                {done
                                  ? <CheckCircle2 style={{ width: 16, height: 16, color: '#10B981' }} />
                                  : <span className="text-xs font-bold" style={{ color: '#6B7280' }}>{i + 1}</span>
                                }
                              </button>
                              <span className="flex-1 text-xs" style={{ color: done ? '#10B981' : '#9CA3AF' }}>
                                Serie {i + 1}
                              </span>
                              <input
                                type="number"
                                placeholder="0"
                                value={pesos[k] ?? ''}
                                onChange={e => setPesos(prev => ({ ...prev, [k]: e.target.value }))}
                                disabled={done}
                                className="w-24 px-2 py-1.5 rounded-lg text-xs text-white outline-none text-center"
                                style={{ background: done ? 'transparent' : '#0D0E13', border: done ? 'none' : '1px solid #2a2d3e', opacity: done ? 0.5 : 1 }}
                              />
                              <input
                                type="number"
                                placeholder="0"
                                value={reps[k] ?? ''}
                                onChange={e => setReps(prev => ({ ...prev, [k]: e.target.value }))}
                                disabled={done}
                                className="w-16 px-2 py-1.5 rounded-lg text-xs text-white outline-none text-center"
                                style={{ background: done ? 'transparent' : '#0D0E13', border: done ? 'none' : '1px solid #2a2d3e', opacity: done ? 0.5 : 1 }}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Finalizar sesión */}
          {allDone && (
            <div className="mx-4 mb-4">
              <button
                onClick={handleFinalizar}
                className="w-full py-3.5 rounded-2xl font-bold text-white cursor-pointer text-sm"
                style={{ background: '#F5611A' }}
              >
                Finalizar sesión ✓
              </button>
            </div>
          )}

          {/* Esta semana */}
          <div className="mx-4 rounded-2xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <h3 className="font-semibold text-white mb-4 text-sm">Esta Semana</h3>
            <div className="flex gap-2 justify-between">
              {DIAS_SEMANA.map((dia, i) => {
                const isToday = i === dayIndex
                const isWorkday = i === 0 || i === 2 || i === 4
                const isDone = isWorkday && i < dayIndex
                return (
                  <div key={dia} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs" style={{ color: '#4B5563' }}>{dia}</span>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: isToday ? '#F5611A' : isDone ? 'rgba(16,185,129,0.2)' : '#1E2130',
                        color: isToday ? 'white' : isDone ? '#10B981' : '#4B5563',
                        border: isToday ? '2px solid #F5611A' : 'none',
                      }}
                    >
                      {isDone ? '✓' : isWorkday ? '●' : '·'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Feedback modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#161820', border: '1px solid #1E2130', maxWidth: 480 }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: '#2a2d3e' }} />
            <h3 className="font-bold text-white text-lg mb-1">¿Cómo fue la sesión?</h3>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Tu entrenador verá tu feedback</p>

            {/* Feeling selector */}
            <p className="text-sm font-medium text-white mb-3">Sensación general</p>
            <div className="flex gap-1.5 mb-6">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setFeeling(n)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all"
                  style={{
                    background: feeling === n ? '#F5611A' : '#1E2130',
                    color: feeling === n ? 'white' : '#6B7280',
                    border: `1px solid ${feeling === n ? '#F5611A' : '#2a2d3e'}`,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Feeling label */}
            <p className="text-center text-sm mb-6" style={{ color: feeling >= 8 ? '#10B981' : feeling >= 5 ? '#F59E0B' : '#EF4444' }}>
              {feeling >= 9 ? '🔥 Excelente' : feeling >= 7 ? '💪 Bien' : feeling >= 5 ? '😐 Regular' : '😓 Duro'}
            </p>

            {/* Note */}
            <p className="text-sm font-medium text-white mb-2">Nota (opcional)</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Aumenté peso en sentadilla, RPE 8..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none mb-5"
              style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
            />

            <button
              onClick={handleSubmitFeedback}
              className="w-full py-3.5 rounded-2xl font-bold text-white cursor-pointer text-sm"
              style={{ background: '#F5611A' }}
            >
              Enviar feedback
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function seriesCompletadas(seriesDone: Record<string, boolean>, ejId: string, i: number): boolean {
  return seriesDone[`${ejId}-${i}`] ?? false
}
