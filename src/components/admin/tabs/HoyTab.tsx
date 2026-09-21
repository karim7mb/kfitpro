import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Save, Dumbbell, Droplets, Moon, Footprints, Activity } from 'lucide-react'
import {
  fetchRutina4Semanas, fetchSesionesLog, upsertSesionLog, fetchProgresoHoy,
  type Rutina4Semanas, type DiaRutina, type SesionLog, type SerieLog, type ProgresoDiario,
} from '../../../lib/supabase'

interface HoyTabProps {
  clienteId: string
  isDemo?: boolean
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDayOfWeekIndex(): number {
  return (new Date().getDay() + 6) % 7
}

function calcSemanaActual(fechaInicio?: string): number {
  if (!fechaInicio) return 1
  const ms = Date.now() - new Date(fechaInicio).getTime()
  return Math.min(4, Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24 * 7)) + 1))
}

function weekdaySlot(i: number, total: number): number {
  const maxSlot = total <= 5 ? 4 : 6
  return total === 1 ? 0 : Math.round((i * maxSlot) / (total - 1))
}

function getTodayDia(rutina: Rutina4Semanas): DiaRutina | null {
  const semana = calcSemanaActual(rutina.fecha_inicio)
  const dias = rutina.semanas?.[semana - 1]?.dias ?? rutina.dias
  if (!dias?.length) return null
  const dayIdx = getDayOfWeekIndex()
  const map: Record<number, number> = {}
  for (let i = 0; i < dias.length; i++) map[weekdaySlot(i, dias.length)] = i
  const diaIdx = map[dayIdx]
  return diaIdx !== undefined ? dias[diaIdx] : null
}

interface EjercicioLogState {
  series: SerieLog[]
}

export default function HoyTab({ clienteId, isDemo, onToast }: HoyTabProps) {
  const [rutina, setRutina] = useState<Rutina4Semanas | null>(null)
  const [sesion, setSesion] = useState<SesionLog | null>(null)
  const [ejLog, setEjLog] = useState<Record<string, EjercicioLogState>>({})
  const [expandedEj, setExpandedEj] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [todayDia, setTodayDia] = useState<DiaRutina | null>(null)
  const [semanaActual, setSemanaActual] = useState(1)
  const [recuperacion, setRecuperacion] = useState<ProgresoDiario | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, logs, rec] = await Promise.all([
        isDemo ? null : fetchRutina4Semanas(clienteId),
        isDemo ? [] : fetchSesionesLog(clienteId),
        isDemo ? null : fetchProgresoHoy(clienteId),
      ])
      setRecuperacion(rec)

      setRutina(r)
      const semana = r ? calcSemanaActual(r.fecha_inicio) : 1
      setSemanaActual(semana)

      if (r) {
        const dia = getTodayDia(r)
        setTodayDia(dia)

        if (dia) {
          const existing = logs.find(l => l.fecha === today() && l.dia_id === dia.id)
          if (existing) {
            setSesion(existing)
            const initialLog: Record<string, EjercicioLogState> = {}
            dia.ejercicios.forEach(ej => {
              initialLog[ej.id] = {
                series: existing.series_completadas?.[ej.id] ?? buildEmptySeries(ej.series),
              }
            })
            setEjLog(initialLog)
          } else {
            const initialLog: Record<string, EjercicioLogState> = {}
            dia.ejercicios.forEach(ej => {
              initialLog[ej.id] = { series: buildEmptySeries(ej.series) }
            })
            setEjLog(initialLog)
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }, [clienteId, isDemo])

  useEffect(() => { load() }, [load])

  function buildEmptySeries(n: number): SerieLog[] {
    return Array.from({ length: n }, (_, i) => ({ serie: i + 1, completada: false }))
  }

  function toggleSerie(ejId: string, serieIdx: number) {
    setEjLog(prev => {
      const series = [...(prev[ejId]?.series ?? [])]
      series[serieIdx] = { ...series[serieIdx], completada: !series[serieIdx].completada }
      return { ...prev, [ejId]: { series } }
    })
  }

  function updateSerieField(ejId: string, serieIdx: number, field: 'reps' | 'peso', value: number) {
    setEjLog(prev => {
      const series = [...(prev[ejId]?.series ?? [])]
      series[serieIdx] = { ...series[serieIdx], [field]: value }
      return { ...prev, [ejId]: { series } }
    })
  }

  const seriesCompletadas: Record<string, SerieLog[]> = {}
  Object.entries(ejLog).forEach(([id, state]) => { seriesCompletadas[id] = state.series })

  const totalSeries = Object.values(ejLog).reduce((s, e) => s + e.series.length, 0)
  const completadas = Object.values(ejLog).reduce((s, e) => s + e.series.filter(x => x.completada).length, 0)
  const pct = totalSeries > 0 ? Math.round((completadas / totalSeries) * 100) : 0

  async function saveSession() {
    if (!todayDia || isDemo) return
    setSaving(true)
    try {
      await upsertSesionLog({
        id: sesion?.id,
        cliente_id: clienteId,
        rutina_id: rutina?.id,
        semana_num: semanaActual,
        dia_id: todayDia.id,
        fecha: today(),
        completada: pct === 100,
        sensacion: sesion?.sensacion,
        notas: sesion?.notas,
        series_completadas: seriesCompletadas,
      })
      onToast('Sesión guardada', 'success')
      load()
    } catch {
      onToast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Cargando entrenamiento de hoy…
      </div>
    )
  }

  if (!rutina || !rutina.semanas?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <Dumbbell size={36} className="text-gray-500" />
        <p className="text-gray-400 text-sm">No hay plan de 4 semanas activo.</p>
        <p className="text-gray-500 text-xs">Genera un plan desde la pestaña Rutina.</p>
      </div>
    )
  }

  const semanaInfo = rutina.semanas[semanaActual - 1]

  if (!todayDia) {
    return (
      <div className="space-y-4">
        <SemanaHeader semana={semanaActual} descripcion={semanaInfo?.descripcion ?? ''} />
        <div className="rounded-2xl p-6 text-center" style={{ background: '#1A1D2E', border: '1px solid #2a2d3e' }}>
          <span className="text-4xl">🛌</span>
          <p className="text-white font-semibold mt-3">Día de descanso</p>
          <p className="text-gray-400 text-sm mt-1">Hoy no hay entrenamiento programado.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <SemanaHeader semana={semanaActual} descripcion={semanaInfo?.descripcion ?? ''} />

      {/* Progress bar */}
      <div className="rounded-2xl p-4" style={{ background: '#1A1D2E', border: '1px solid #2a2d3e' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-white font-semibold text-sm">{todayDia.titulo}</span>
          <span className="text-xs font-mono" style={{ color: '#F5611A' }}>{pct}%</span>
        </div>
        <div className="w-full rounded-full h-2" style={{ background: '#2a2d3e' }}>
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : '#F5611A' }}
          />
        </div>
        <p className="text-gray-500 text-xs mt-2">{completadas} / {totalSeries} series completadas</p>

        {sesion?.sensacion && (
          <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
            Sensación del cliente:{' '}
            <span style={{ color: sesion.sensacion === 'facil' ? '#10B981' : sesion.sensacion === 'justo' ? '#F59E0B' : '#EF4444' }}>
              {sesion.sensacion === 'facil' ? '😊 Fácil' : sesion.sensacion === 'justo' ? '😅 Justo' : '💀 Brutal'}
            </span>
          </p>
        )}
        {sesion?.notas && (
          <p className="text-xs mt-1 italic" style={{ color: '#6b7280' }}>"{sesion.notas}"</p>
        )}
      </div>

      {/* Exercises */}
      {todayDia.ejercicios.map(ej => {
        const state = ejLog[ej.id] ?? { series: buildEmptySeries(ej.series) }
        const done = state.series.filter(s => s.completada).length
        const isOpen = expandedEj === ej.id

        return (
          <div key={ej.id} className="rounded-2xl overflow-hidden" style={{ background: '#1A1D2E', border: '1px solid #2a2d3e' }}>
            <button
              className="w-full flex items-center justify-between p-4 cursor-pointer"
              onClick={() => setExpandedEj(isOpen ? null : ej.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: done === ej.series ? '#10B98120' : '#F5611A20', color: done === ej.series ? '#10B981' : '#F5611A' }}
                >
                  {done === ej.series ? '✓' : `${done}/${ej.series}`}
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">{ej.nombre}</p>
                  <p className="text-gray-400 text-xs">{ej.series} series · {ej.repsMin}-{ej.repsMax} reps · RPE {ej.rpe}</p>
                </div>
              </div>
              {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-2">
                <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 px-1">
                  <span>Serie</span><span className="text-center">Hecho</span><span className="text-center">Reps</span><span className="text-center">Peso (kg)</span>
                </div>
                {state.series.map((serie, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                    <span className="text-gray-400 text-xs pl-1">S{serie.serie}</span>
                    <div className="flex justify-center">
                      <button onClick={() => toggleSerie(ej.id, idx)} className="cursor-pointer">
                        {serie.completada
                          ? <CheckCircle2 size={20} style={{ color: '#10B981' }} />
                          : <Circle size={20} className="text-gray-600" />}
                      </button>
                    </div>
                    <input
                      type="number"
                      min={1}
                      placeholder={String(ej.repsMin)}
                      value={serie.reps ?? ''}
                      onChange={e => updateSerieField(ej.id, idx, 'reps', Number(e.target.value))}
                      className="text-center rounded-lg py-1.5 text-sm text-white outline-none"
                      style={{ background: '#262940', border: '1px solid #2a2d3e' }}
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="0"
                      value={serie.peso ?? ''}
                      onChange={e => updateSerieField(ej.id, idx, 'peso', Number(e.target.value))}
                      className="text-center rounded-lg py-1.5 text-sm text-white outline-none"
                      style={{ background: '#262940', border: '1px solid #2a2d3e' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <button
        onClick={saveSession}
        disabled={saving || isDemo}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white cursor-pointer disabled:opacity-50 transition-all"
        style={{ background: pct === 100 ? '#10B981' : '#F5611A' }}
      >
        <Save size={18} />
        {saving ? 'Guardando…' : 'Guardar sesión'}
      </button>

      {/* Recovery data logged by client */}
      {recuperacion && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1A1D2E', border: '1px solid #2a2d3e' }}>
          <p className="text-white font-semibold text-sm flex items-center gap-2">
            <Activity size={14} style={{ color: '#F5611A' }} /> Recuperación del cliente
          </p>
          <div className="grid grid-cols-2 gap-3">
            {recuperacion.hidratacion != null && (
              <div className="rounded-xl p-3" style={{ background: '#262940' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Droplets size={12} style={{ color: '#3B82F6' }} />
                  <span className="text-xs" style={{ color: '#6B7280' }}>Hidratación</span>
                </div>
                <p className="text-white font-bold text-sm">{recuperacion.hidratacion} vasos</p>
                {recuperacion.litros != null && <p className="text-xs" style={{ color: '#4B5563' }}>{recuperacion.litros} L</p>}
              </div>
            )}
            {recuperacion.pasos != null && recuperacion.pasos > 0 && (
              <div className="rounded-xl p-3" style={{ background: '#262940' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Footprints size={12} style={{ color: '#10B981' }} />
                  <span className="text-xs" style={{ color: '#6B7280' }}>Pasos</span>
                </div>
                <p className="text-white font-bold text-sm">{recuperacion.pasos.toLocaleString('es-ES')}</p>
                <p className="text-xs" style={{ color: recuperacion.pasos >= 10000 ? '#10B981' : recuperacion.pasos >= 5000 ? '#F59E0B' : '#4B5563' }}>
                  {recuperacion.pasos >= 10000 ? 'Objetivo ✓' : recuperacion.pasos >= 5000 ? 'Bien' : 'Bajo'}
                </p>
              </div>
            )}
            {recuperacion.horas_sueno != null && (
              <div className="rounded-xl p-3" style={{ background: '#262940' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Moon size={12} style={{ color: '#8B5CF6' }} />
                  <span className="text-xs" style={{ color: '#6B7280' }}>Sueño</span>
                </div>
                <p className="text-white font-bold text-sm">{recuperacion.horas_sueno}h</p>
              </div>
            )}
            {recuperacion.dolor_corporal != null && (
              <div className="rounded-xl p-3" style={{ background: '#262940' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity size={12} style={{ color: recuperacion.dolor_corporal > 7 ? '#EF4444' : recuperacion.dolor_corporal > 4 ? '#F59E0B' : '#10B981' }} />
                  <span className="text-xs" style={{ color: '#6B7280' }}>Dolor muscular</span>
                </div>
                <p className="font-bold text-sm" style={{ color: recuperacion.dolor_corporal > 7 ? '#EF4444' : recuperacion.dolor_corporal > 4 ? '#F59E0B' : '#10B981' }}>
                  {recuperacion.dolor_corporal}/10
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SemanaHeader({ semana, descripcion }: { semana: number; descripcion: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #F5611A22 0%, #8B5CF622 100%)', border: '1px solid #F5611A33' }}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#F5611A', color: 'white' }}>
          Semana {semana}/4
        </span>
        <p className="text-white text-sm font-semibold truncate">{descripcion}</p>
      </div>
      <p className="text-gray-400 text-xs mt-1">
        {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
    </div>
  )
}
