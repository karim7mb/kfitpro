import { useState, useEffect } from 'react'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { demoRutina } from '../../data/demo'
import { fetchRutina, type RutinaData } from '../../lib/supabase'

interface MiRutinaProps {
  userName: string
  userId: string
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const isDemo = (id: string) => id.startsWith('client-') || id.startsWith('admin-')

export default function MiRutina({ userName, userId, onToast }: MiRutinaProps) {
  const demo = isDemo(userId)
  const [rutina, setRutina] = useState<RutinaData | null>(demo ? demoRutina : null)
  const [loading, setLoading] = useState(!demo)
  const [completados, setCompletados] = useState<Record<string, boolean>>({})
  const [pesos, setPesos] = useState<Record<string, string>>({})

  useEffect(() => {
    if (demo) return
    fetchRutina(userId).then(r => {
      setRutina(r ?? demoRutina)
      setLoading(false)
    })
  }, [userId, demo])

  const today = new Date()
  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1
  const dateStr = today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  const todayWorkout = rutina?.dias[0] ?? null

  const toggleCompleto = (id: string) => {
    setCompletados(prev => {
      const next = { ...prev, [id]: !prev[id] }
      if (next[id]) onToast('¡Ejercicio completado! 💪', 'success')
      return next
    })
  }

  const totalCompletados = Object.values(completados).filter(Boolean).length
  const total = todayWorkout?.ejercicios.length ?? 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#F5611A' }} />
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">
          Hola, {userName.split(' ')[0]}! 👋
        </h1>
        <p className="text-sm mt-1 capitalize" style={{ color: '#6B7280' }}>{dateStr}</p>
      </div>

      {!rutina || !todayWorkout ? (
        <div className="mx-4 mb-5 rounded-2xl p-10 flex flex-col items-center gap-3" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <div className="text-4xl">🏋️</div>
          <p className="font-medium text-white">Sin rutina asignada</p>
          <p className="text-sm text-center" style={{ color: '#6B7280' }}>Tu entrenador te asignará una rutina pronto</p>
        </div>
      ) : (
        <>
          {/* Today's workout */}
          <div className="mx-4 mb-5 rounded-2xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-white">Entrenamiento de Hoy</h2>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                  {rutina.nombre} · Semana {rutina.semana_actual}
                </p>
              </div>
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ background: 'rgba(245,97,26,0.2)', color: '#F5611A' }}
              >
                {totalCompletados}/{total}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: '#1E2130' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: total > 0 ? `${(totalCompletados / total) * 100}%` : '0%', background: '#F5611A' }}
              />
            </div>

            {/* Ejercicios */}
            <div className="space-y-3">
              {todayWorkout.ejercicios.map(ej => {
                const done = completados[ej.id]
                return (
                  <div
                    key={ej.id}
                    className="rounded-xl p-4"
                    style={{ background: '#1E2130', opacity: done ? 0.6 : 1 }}
                  >
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleCompleto(ej.id)} className="mt-0.5 cursor-pointer flex-shrink-0">
                        {done
                          ? <CheckCircle style={{ width: 20, height: 20, color: '#10B981' }} />
                          : <Circle style={{ width: 20, height: 20, color: '#4B5563' }} />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm" style={{ color: 'white', textDecoration: done ? 'line-through' : 'none' }}>
                          {ej.nombre}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                          {ej.series} series · {ej.repsMin}-{ej.repsMax} reps
                          {ej.peso > 0 && ` · Ref: ${ej.peso} kg`}
                        </p>
                        {!done && (
                          <div className="flex gap-2 mt-3">
                            <input
                              type="number"
                              placeholder="Peso usado (kg)"
                              value={pesos[ej.id] || ''}
                              onChange={e => setPesos(prev => ({ ...prev, [ej.id]: e.target.value }))}
                              className="flex-1 px-3 py-1.5 rounded-lg text-xs text-white outline-none"
                              style={{ background: '#0D0E13', border: '1px solid #2a2d3e' }}
                            />
                            <input
                              type="number"
                              placeholder="Reps"
                              className="w-20 px-3 py-1.5 rounded-lg text-xs text-white outline-none"
                              style={{ background: '#0D0E13', border: '1px solid #2a2d3e' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* This week */}
          <div className="mx-4 rounded-2xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <h3 className="font-semibold text-white mb-4">Esta Semana</h3>
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
    </div>
  )
}
