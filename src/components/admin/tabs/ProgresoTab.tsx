import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Trophy, Star, Plus, X } from 'lucide-react'
import {
  fetchProgresoDiario, upsertProgresoDiario, fetchRegistrosPeso, addRegistroPeso,
  isDemoMode,
  type ProgresoDiario,
} from '../../../lib/supabase'

interface ProgresoTabProps {
  clienteId: string
  isDemo?: boolean
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function ProgresoTab({ clienteId, isDemo, onToast }: ProgresoTabProps) {
  const [progresos, setProgresos] = useState<ProgresoDiario[]>([])
  const [pesos, setPesos] = useState<{ mes: string; peso: number; fecha: string }[]>([])
  const [loading, setLoading] = useState(true)

  // Today's entry
  const [newPeso, setNewPeso] = useState<number | ''>('')
  const [newVictoria, setNewVictoria] = useState('')
  const [newPrEj, setNewPrEj] = useState('')
  const [newPrPeso, setNewPrPeso] = useState<number | ''>('')
  const [newPrReps, setNewPrReps] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)

  // Check-in semanal
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [ciEnergia, setCiEnergia] = useState(5)
  const [ciSueno, setCiSueno] = useState(5)
  const [ciEstres, setCiEstres] = useState(5)
  const [ciAdherencia, setCiAdherencia] = useState(5)
  const [ciNotas, setCiNotas] = useState('')
  const [ciLoading, setCiLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemo) return
      const [prog, ps] = await Promise.all([
        fetchProgresoDiario(clienteId, 30),
        fetchRegistrosPeso(clienteId),
      ])
      setProgresos(prog)
      setPesos(ps)
    } finally {
      setLoading(false)
    }
  }, [clienteId, isDemo])

  useEffect(() => { load() }, [load])

  // Aggregate PRs from all progreso entries
  const allPRs: Record<string, { peso: number; reps: number; fecha: string }> = {}
  progresos.forEach(p => {
    if (p.prs) {
      Object.entries(p.prs).forEach(([ej, val]) => {
        if (!allPRs[ej] || val.peso > allPRs[ej].peso) {
          allPRs[ej] = val
        }
      })
    }
  })

  const allVictorias = progresos
    .filter(p => p.victorias?.length)
    .flatMap(p => (p.victorias ?? []).map(v => ({ v, fecha: p.fecha })))
    .slice(-10)
    .reverse()

  const isSunday = new Date().getDay() === 0

  async function saveToday() {
    if (isDemo) return
    setSaving(true)
    try {
      const existing = progresos.find(p => p.fecha === today())
      const merged: ProgresoDiario = {
        id: existing?.id,
        cliente_id: clienteId,
        fecha: today(),
        prs: { ...(existing?.prs ?? {}), ...(allPRs) },
        victorias: existing?.victorias ?? [],
      }

      if (newPeso !== '') {
        await addRegistroPeso(clienteId, Number(newPeso), today())
        merged.peso_corporal = Number(newPeso)
      }

      if (newVictoria.trim()) {
        merged.victorias = [...(merged.victorias ?? []), newVictoria.trim()]
        setNewVictoria('')
      }

      if (newPrEj.trim() && newPrPeso !== '') {
        merged.prs = {
          ...(merged.prs ?? {}),
          [newPrEj.trim()]: { peso: Number(newPrPeso), reps: Number(newPrReps) || 1, fecha: today() },
        }
        setNewPrEj('')
        setNewPrPeso('')
        setNewPrReps('')
      }

      await upsertProgresoDiario(merged)
      onToast('Progreso guardado', 'success')
      setNewPeso('')
      load()
    } catch {
      onToast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function submitCheckIn() {
    if (isDemo) return
    setCiLoading(true)
    try {
      const existing = progresos.find(p => p.fecha === today())
      const revisionData = {
        energia: ciEnergia,
        sueno: ciSueno,
        estres: ciEstres,
        adherencia: ciAdherencia,
        notas: ciNotas,
      }
      await upsertProgresoDiario({
        id: existing?.id,
        cliente_id: clienteId,
        fecha: today(),
        revision_semanal: revisionData,
      })
      onToast('Check-in semanal guardado ✓', 'success')
      setCheckInOpen(false)
      load()
    } catch {
      onToast('Error', 'error')
    } finally {
      setCiLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Cargando progreso…</div>
  }

  const pesoData = pesos.slice(-12)
  const pesoMin = pesoData.length ? Math.min(...pesoData.map(p => p.peso)) - 2 : 50
  const pesoMax = pesoData.length ? Math.max(...pesoData.map(p => p.peso)) + 2 : 100

  return (
    <div className="space-y-4 pb-6">

      {/* Peso corporal */}
      <Section title="Peso corporal" icon={<TrendingUp size={14} style={{ color: '#F5611A' }} />}>
        {pesoData.length > 0 ? (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${Math.max(300, pesoData.length * 40)} 120`} className="w-full" style={{ minWidth: 300 }}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5611A" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#F5611A" stopOpacity="0" />
                </linearGradient>
              </defs>
              {pesoData.map((p, i) => {
                const x = 20 + i * ((Math.max(300, pesoData.length * 40) - 40) / Math.max(1, pesoData.length - 1))
                const y = 100 - ((p.peso - pesoMin) / (pesoMax - pesoMin)) * 80
                const next = pesoData[i + 1]
                const nx = next ? 20 + (i + 1) * ((Math.max(300, pesoData.length * 40) - 40) / Math.max(1, pesoData.length - 1)) : x
                const ny = next ? 100 - ((next.peso - pesoMin) / (pesoMax - pesoMin)) * 80 : y
                return (
                  <g key={p.fecha}>
                    {next && <line x1={x} y1={y} x2={nx} y2={ny} stroke="#F5611A" strokeWidth="2" />}
                    <circle cx={x} cy={y} r="4" fill="#F5611A" />
                    <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fill="#9ca3af">{p.peso}</text>
                    <text x={x} y={114} textAnchor="middle" fontSize="8" fill="#6b7280">{p.mes}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        ) : (
          <p className="text-gray-500 text-xs text-center py-4">Sin registros de peso aún</p>
        )}

        <div className="flex gap-2 items-center">
          <input
            type="number"
            step={0.1}
            placeholder="Tu peso hoy (kg)"
            value={newPeso}
            onChange={e => setNewPeso(e.target.value === '' ? '' : Number(e.target.value))}
            className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none"
            style={{ background: '#262940', border: '1px solid #2a2d3e' }}
          />
          <button
            onClick={saveToday}
            disabled={saving || newPeso === ''}
            className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-40"
            style={{ background: '#F5611A', color: 'white' }}
          >
            <Plus size={16} />
          </button>
        </div>
      </Section>

      {/* PRs */}
      <Section title="Récords personales" icon={<Trophy size={14} style={{ color: '#F59E0B' }} />}>
        {Object.entries(allPRs).length > 0 && (
          <div className="space-y-2 mb-3">
            {Object.entries(allPRs).map(([ej, val]) => (
              <div key={ej} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: '#262940' }}>
                <span className="text-gray-300 text-sm">{ej}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold" style={{ color: '#F59E0B' }}>{val.peso} kg × {val.reps} reps</span>
                  <span className="text-gray-500">{fmtDate(val.fecha)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <p className="text-gray-500 text-xs">Añadir nuevo récord</p>
          <input
            type="text"
            placeholder="Ejercicio (ej: Press banca)"
            value={newPrEj}
            onChange={e => setNewPrEj(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
            style={{ background: '#262940', border: '1px solid #2a2d3e' }}
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Peso (kg)"
              value={newPrPeso}
              onChange={e => setNewPrPeso(e.target.value === '' ? '' : Number(e.target.value))}
              className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none"
              style={{ background: '#262940', border: '1px solid #2a2d3e' }}
            />
            <input
              type="number"
              placeholder="Reps"
              value={newPrReps}
              onChange={e => setNewPrReps(e.target.value === '' ? '' : Number(e.target.value))}
              className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none"
              style={{ background: '#262940', border: '1px solid #2a2d3e' }}
            />
            <button
              onClick={saveToday}
              disabled={saving || !newPrEj.trim() || newPrPeso === ''}
              className="px-4 py-2 rounded-xl text-sm cursor-pointer disabled:opacity-40"
              style={{ background: '#F59E0B', color: 'white' }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </Section>

      {/* Victorias */}
      <Section title="Victorias" icon={<Star size={14} style={{ color: '#8B5CF6' }} />}>
        {allVictorias.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {allVictorias.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span style={{ color: '#8B5CF6' }}>★</span>
                <span className="text-gray-300 flex-1">{item.v}</span>
                <span className="text-gray-500 text-xs">{fmtDate(item.fecha)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ej: Completé todas las series sin fallo"
            value={newVictoria}
            onChange={e => setNewVictoria(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveToday() }}
            className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none"
            style={{ background: '#262940', border: '1px solid #2a2d3e' }}
          />
          <button
            onClick={saveToday}
            disabled={saving || !newVictoria.trim()}
            className="px-4 py-2 rounded-xl text-sm cursor-pointer disabled:opacity-40"
            style={{ background: '#8B5CF6', color: 'white' }}
          >
            <Plus size={16} />
          </button>
        </div>
      </Section>

      {/* Check-in semanal */}
      {(isSunday || true) && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #8B5CF633' }}>
          <button
            className="w-full flex items-center justify-between p-4 cursor-pointer"
            style={{ background: '#8B5CF610' }}
            onClick={() => setCheckInOpen(!checkInOpen)}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <div className="text-left">
                <p className="text-white text-sm font-semibold">Check-in semanal</p>
                <p className="text-gray-400 text-xs">{isSunday ? 'Es domingo — ¡momento de revisar!' : 'Revisión de la semana'}</p>
              </div>
            </div>
            <span className="text-gray-400">{checkInOpen ? '▲' : '▼'}</span>
          </button>

          {checkInOpen && (
            <div className="p-4 space-y-4" style={{ background: '#1A1D2E' }}>
              {[
                { label: 'Energía general', val: ciEnergia, set: setCiEnergia },
                { label: 'Calidad del sueño', val: ciSueno, set: setCiSueno },
                { label: 'Nivel de estrés', val: ciEstres, set: setCiEstres },
                { label: 'Adherencia al plan', val: ciAdherencia, set: setCiAdherencia },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400 text-xs">{label}</span>
                    <span className="text-xs font-mono text-white">{val}/10</span>
                  </div>
                  <input type="range" min={1} max={10} value={val} onChange={e => set(Number(e.target.value))} className="w-full accent-violet-500" />
                </div>
              ))}
              <textarea
                placeholder="¿Cómo ha ido la semana? ¿Algo a mejorar?"
                value={ciNotas}
                onChange={e => setCiNotas(e.target.value)}
                rows={3}
                className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none resize-none"
                style={{ background: '#262940', border: '1px solid #2a2d3e' }}
              />
              <button
                onClick={submitCheckIn}
                disabled={ciLoading || isDemo}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
                style={{ background: '#8B5CF6' }}
              >
                {ciLoading ? 'Guardando…' : 'Enviar check-in'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1A1D2E', border: '1px solid #2a2d3e' }}>
      <p className="text-white text-sm font-semibold flex items-center gap-2">{icon} {title}</p>
      {children}
    </div>
  )
}
