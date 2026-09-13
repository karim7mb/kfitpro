import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Save, Dumbbell, Moon, Droplets, Zap } from 'lucide-react'
import {
  fetchRutina4Semanas, fetchSesionesLog, upsertSesionLog, upsertProgresoDiario, fetchProgresoDiario,
  type Rutina4Semanas, type DiaRutina, type SesionLog, type SerieLog, type ProgresoDiario,
} from '../../../lib/supabase'

interface HoyTabProps {
  clienteId: string
  isDemo?: boolean
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const SENSACIONES = [
  { id: 'facil', label: 'Fácil', emoji: '😊', color: '#10B981' },
  { id: 'justo', label: 'Justo', emoji: '😅', color: '#F59E0B' },
  { id: 'brutal', label: 'Brutal', emoji: '💀', color: '#EF4444' },
] as const

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDayOfWeekIndex(): number {
  return (new Date().getDay() + 6) % 7 // 0=Mon, 6=Sun
}

function calcSemanaActual(fechaInicio?: string): number {
  if (!fechaInicio) return 1
  const ms = Date.now() - new Date(fechaInicio).getTime()
  const weeks = Math.floor(ms / (1000 * 60 * 60 * 24 * 7))
  return Math.min(4, Math.max(1, weeks + 1))
}

function getTodayDia(rutina: Rutina4Semanas): DiaRutina | null {
  const semana = calcSemanaActual(rutina.fecha_inicio)
  const dias = rutina.semanas?.[semana - 1]?.dias ?? rutina.dias
  if (!dias?.length) return null
  // Distribute training days across week evenly
  const dayIdx = getDayOfWeekIndex()
  const totalDias = dias.length
  const map: Record<number, number> = {}
  for (let i = 0; i < totalDias; i++) {
    const slot = Math.round((i * 7) / totalDias)
    map[slot] = i
  }
  const diaIdx = map[dayIdx]
  return diaIdx !== undefined ? dias[diaIdx] : null
}

interface EjercicioLogState {
  series: SerieLog[]
}

export default function HoyTab({ clienteId, isDemo, onToast }: HoyTabProps) {
  const [rutina, setRutina] = useState<Rutina4Semanas | null>(null)
  const [sesion, setSesion] = useState<SesionLog | null>(null)
  const [progreso, setProgreso] = useState<ProgresoDiario | null>(null)
  const [ejLog, setEjLog] = useState<Record<string, EjercicioLogState>>({})
  const [sensacion, setSensacion] = useState<'facil' | 'justo' | 'brutal' | null>(null)
  const [notas, setNotas] = useState('')
  const [expandedEj, setExpandedEj] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hidratacion, setHidratacion] = useState(0)
  const [horas_sueno, setHorasSueno] = useState<number | ''>('')
  const [dolor, setDolor] = useState<number>(5)
  const [todayDia, setTodayDia] = useState<DiaRutina | null>(null)
  const [semanaActual, setSemanaActual] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, logs, progresos] = await Promise.all([
        isDemo ? null : fetchRutina4Semanas(clienteId),
        isDemo ? [] : fetchSesionesLog(clienteId),
        isDemo ? [] : fetchProgresoDiario(clienteId, 7),
      ])

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
            setSensacion(existing.sensacion ?? null)
            setNotas(existing.notas ?? '')
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

      const todayProg = progresos.find(p => p.fecha === today())
      if (todayProg) {
        setProgreso(todayProg)
        setHidratacion(todayProg.hidratacion ?? 0)
        setHorasSueno(todayProg.horas_sueno ?? '')
        setDolor(todayProg.dolor_corporal ?? 5)
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
  Object.entries(ejLog).forEach(([id, state]) => {
    seriesCompletadas[id] = state.series
  })

  const totalSeries = Object.values(ejLog).reduce((s, e) => s + e.series.length, 0)
  const completadas = Object.values(ejLog).reduce((s, e) => s + e.series.filter(x => x.completada).length, 0)
  const pct = totalSeries > 0 ? Math.round((completadas / totalSeries) * 100) : 0

  async function saveSession() {
    if (!todayDia || isDemo) return
    setSaving(true)
    try {
      const s: SesionLog = {
        id: sesion?.id,
        cliente_id: clienteId,
        rutina_id: rutina?.id,
        semana_num: semanaActual,
        dia_id: todayDia.id,
        fecha: today(),
        completada: pct === 100,
        sensacion: sensacion ?? undefined,
        notas: notas || undefined,
        series_completadas: seriesCompletadas,
      }
      await upsertSesionLog(s)

      const p: ProgresoDiario = {
        id: progreso?.id,
        cliente_id: clienteId,
        fecha: today(),
        hidratacion,
        horas_sueno: horas_sueno !== '' ? Number(horas_sueno) : undefined,
        dolor_corporal: dolor,
      }
      await upsertProgresoDiario(p)

      onToast(pct === 100 ? '¡Sesión completada! 💪' : 'Sesión guardada', 'success')
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
          <p className="text-gray-400 text-sm mt-1">Hoy no hay entrenamiento programado. ¡Recupera!</p>
        </div>
        <RecuperacionBlock
          hidratacion={hidratacion} setHidratacion={setHidratacion}
          horas_sueno={horas_sueno} setHorasSueno={setHorasSueno}
          dolor={dolor} setDolor={setDolor}
          onSave={async () => {
            if (isDemo) return
            try {
              await upsertProgresoDiario({ cliente_id: clienteId, fecha: today(), hidratacion, horas_sueno: horas_sueno !== '' ? Number(horas_sueno) : undefined, dolor_corporal: dolor })
              onToast('Recuperación guardada', 'success')
            } catch { onToast('Error', 'error') }
          }}
          saving={saving}
        />
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
                  style={{ background: done === ej.series ? '#10B981' + '20' : '#F5611A20', color: done === ej.series ? '#10B981' : '#F5611A' }}
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

      {/* Sensación */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1A1D2E', border: '1px solid #2a2d3e' }}>
        <p className="text-white text-sm font-semibold">¿Cómo ha ido el entrenamiento?</p>
        <div className="flex gap-2">
          {SENSACIONES.map(s => (
            <button
              key={s.id}
              onClick={() => setSensacion(sensacion === s.id ? null : s.id)}
              className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl cursor-pointer transition-all"
              style={{
                background: sensacion === s.id ? s.color + '25' : '#262940',
                border: `1px solid ${sensacion === s.id ? s.color : '#2a2d3e'}`,
              }}
            >
              <span className="text-xl">{s.emoji}</span>
              <span className="text-xs font-medium" style={{ color: sensacion === s.id ? s.color : '#9ca3af' }}>{s.label}</span>
            </button>
          ))}
        </div>
        <textarea
          placeholder="Notas opcionales sobre la sesión…"
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={2}
          className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none resize-none"
          style={{ background: '#262940', border: '1px solid #2a2d3e' }}
        />
      </div>

      <RecuperacionBlock
        hidratacion={hidratacion} setHidratacion={setHidratacion}
        horas_sueno={horas_sueno} setHorasSueno={setHorasSueno}
        dolor={dolor} setDolor={setDolor}
        onSave={() => Promise.resolve()}
        saving={false}
        inline
      />

      <button
        onClick={saveSession}
        disabled={saving || isDemo}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white cursor-pointer disabled:opacity-50 transition-all"
        style={{ background: pct === 100 ? '#10B981' : '#F5611A' }}
      >
        <Save size={18} />
        {saving ? 'Guardando…' : pct === 100 ? '¡Sesión completada! Guardar' : 'Guardar progreso'}
      </button>
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

interface RecuperacionBlockProps {
  hidratacion: number
  setHidratacion: (n: number) => void
  horas_sueno: number | ''
  setHorasSueno: (n: number | '') => void
  dolor: number
  setDolor: (n: number) => void
  onSave: () => Promise<void>
  saving: boolean
  inline?: boolean
}

function RecuperacionBlock({ hidratacion, setHidratacion, horas_sueno, setHorasSueno, dolor, setDolor, onSave, saving, inline }: RecuperacionBlockProps) {
  return (
    <div className="rounded-2xl p-4 space-y-4" style={{ background: '#1A1D2E', border: '1px solid #2a2d3e' }}>
      <p className="text-white text-sm font-semibold flex items-center gap-2"><Zap size={14} style={{ color: '#F5611A' }} /> Recuperación</p>

      {/* Hydration */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-xs flex items-center gap-1"><Droplets size={12} /> Hidratación</span>
          <span className="text-xs font-mono text-white">{hidratacion} vasos</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 8 }, (_, i) => (
            <button
              key={i}
              onClick={() => setHidratacion(hidratacion === i + 1 ? i : i + 1)}
              className="w-8 h-8 rounded-full text-xs cursor-pointer transition-all"
              style={{ background: i < hidratacion ? '#3B82F6' : '#262940', color: i < hidratacion ? 'white' : '#9ca3af' }}
            >
              💧
            </button>
          ))}
        </div>
      </div>

      {/* Sleep */}
      <div>
        <span className="text-gray-400 text-xs flex items-center gap-1 mb-2"><Moon size={12} /> Horas de sueño</span>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={0}
            max={14}
            step={0.5}
            placeholder="7.5"
            value={horas_sueno}
            onChange={e => setHorasSueno(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-20 rounded-xl px-3 py-1.5 text-sm text-white outline-none text-center"
            style={{ background: '#262940', border: '1px solid #2a2d3e' }}
          />
          <span className="text-gray-400 text-xs">horas</span>
        </div>
      </div>

      {/* Soreness */}
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-400 text-xs">Dolor muscular</span>
          <span className="text-xs font-mono" style={{ color: dolor > 7 ? '#EF4444' : dolor > 4 ? '#F59E0B' : '#10B981' }}>{dolor}/10</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={dolor}
          onChange={e => setDolor(Number(e.target.value))}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Sin dolor</span><span>Muy intenso</span>
        </div>
      </div>

      {!inline && (
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50"
          style={{ background: '#262940', color: '#F5611A', border: '1px solid #F5611A33' }}
        >
          {saving ? 'Guardando…' : 'Guardar recuperación'}
        </button>
      )}
    </div>
  )
}
