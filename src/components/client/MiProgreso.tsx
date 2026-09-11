import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid } from 'recharts'
import { Plus, Loader2 } from 'lucide-react'
import { fetchRegistrosPeso, addRegistroPeso, fetchClienteData, type PesoEntry } from '../../lib/supabase'
import { demoPeso } from '../../data/demo'

interface MiProgresoProps {
  userId: string
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const isDemo = (id: string) => id.startsWith('client-') || id.startsWith('admin-')

type ProgresoTab = 'metricas' | 'logros'

interface Logro {
  id: string
  icon: string
  titulo: string
  desc: string
  unlocked: boolean
}

function CircleProgress({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const stroke = circ * (1 - Math.min(pct, 100) / 100)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8} stroke="#1E2130" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8}
        stroke="#F5611A" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={stroke}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text
        x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={size * 0.22} fontWeight="bold"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

export default function MiProgreso({ userId, onToast }: MiProgresoProps) {
  const demo = isDemo(userId)
  const [tab, setTab] = useState<ProgresoTab>('metricas')
  const [pesos, setPesos] = useState<PesoEntry[]>(demo ? demoPeso : [])
  const [pesoInicial, setPesoInicial] = useState<number>(0)
  const [pesoObjetivo, setPesoObjetivo] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(!demo)
  const [newWeight, setNewWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (demo) { setPesoInicial(demoPeso[0]?.peso ?? 0); return }
    Promise.all([
      fetchRegistrosPeso(userId),
      fetchClienteData(userId),
    ]).then(([entries, cliente]) => {
      setPesos(entries)
      setPesoInicial(cliente?.pesoInicial ?? 0)
      setPesoObjetivo(cliente?.pesoObjetivo)
      setLoading(false)
    })
  }, [userId, demo])

  const actual = pesos.length > 0 ? pesos[pesos.length - 1].peso : pesoInicial
  const perdido = pesoInicial > 0 ? pesoInicial - actual : 0
  const totalPorPerder = pesoObjetivo && pesoInicial > 0 ? pesoInicial - pesoObjetivo : 0
  const pct = totalPorPerder > 0 ? Math.max(0, Math.min(100, (perdido / totalPorPerder) * 100)) : 0

  const handleAdd = async () => {
    const val = parseFloat(newWeight.replace(',', '.'))
    if (!val || val < 30 || val > 300) { onToast('Peso inválido', 'error'); return }
    setSaving(true)
    try {
      const fecha = new Date().toISOString().split('T')[0]
      if (!demo) await addRegistroPeso(userId, val, fecha)
      setPesos(prev => [...prev, { mes: new Date().toLocaleDateString('es-ES', { month: 'short' }), peso: val, fecha }])
      setNewWeight('')
      setShowForm(false)
      onToast('Peso registrado', 'success')
    } catch {
      onToast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const logros: Logro[] = [
    { id: 'l1', icon: '📊', titulo: 'Primer registro', desc: 'Registraste tu primer peso', unlocked: pesos.length >= 1 },
    { id: 'l2', icon: '📅', titulo: 'Una semana', desc: 'Llevas 7+ días registrando', unlocked: pesos.length >= 3 },
    { id: 'l3', icon: '⬇️', titulo: 'Primer kilo', desc: 'Perdiste más de 1 kg', unlocked: perdido >= 1 },
    { id: 'l4', icon: '🔥', titulo: '3 kg menos', desc: 'Perdiste más de 3 kg', unlocked: perdido >= 3 },
    { id: 'l5', icon: '💪', titulo: '5 kg menos', desc: 'Perdiste más de 5 kg', unlocked: perdido >= 5 },
    { id: 'l6', icon: '🏆', titulo: '10 kg menos', desc: 'Perdiste más de 10 kg', unlocked: perdido >= 10 },
  ]

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#F5611A' }} />
    </div>
  )

  return (
    <div className="pb-28">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">Progreso</h1>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-5 flex gap-2">
        {(['metricas', 'logros'] as ProgresoTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all"
            style={{
              background: tab === t ? '#F5611A' : '#161820',
              color: tab === t ? 'white' : '#6B7280',
              border: `1px solid ${tab === t ? '#F5611A' : '#1E2130'}`,
            }}
          >
            {t === 'metricas' ? 'Métricas' : 'Logros'}
          </button>
        ))}
      </div>

      {tab === 'metricas' && (
        <>
          {/* Objetivo card */}
          <div className="mx-4 mb-4 rounded-2xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <h3 className="font-semibold text-white mb-4">Objetivo de peso</h3>
            <div className="flex items-center gap-5">
              <CircleProgress pct={pct} size={88} />
              <div className="flex-1 space-y-2">
                {[
                  { label: 'Inicial', val: pesoInicial > 0 ? `${pesoInicial} kg` : '—', color: '#6B7280' },
                  { label: 'Actual', val: actual > 0 ? `${actual} kg` : '—', color: 'white' },
                  { label: 'Objetivo', val: pesoObjetivo ? `${pesoObjetivo} kg` : 'Sin definir', color: '#F5611A' },
                  { label: 'Diferencia', val: perdido !== 0 ? `${perdido > 0 ? '-' : '+'}${Math.abs(perdido).toFixed(1)} kg` : '—', color: perdido > 0 ? '#10B981' : perdido < 0 ? '#EF4444' : '#6B7280' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span style={{ color: '#6B7280' }}>{label}</span>
                    <span className="font-semibold" style={{ color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart */}
          {pesos.length > 1 && (
            <div className="mx-4 mb-4 rounded-2xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
              <h3 className="font-semibold text-white mb-4">Evolución del peso</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={pesos} margin={{ top: 22, right: 16, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2130" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#4B5563', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#4B5563', fontSize: 11 }} axisLine={false} tickLine={false}
                    domain={([min, max]: [number, number]) => [Math.floor(min - 0.5), Math.ceil(max + 0.5)]}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1E2130', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9CA3AF' }}
                    itemStyle={{ color: '#F5611A' }}
                    formatter={(v: number) => [`${v} kg`, 'Peso']}
                  />
                  <Line
                    type="monotone" dataKey="peso" stroke="#F5611A" strokeWidth={2.5}
                    dot={{ fill: '#F5611A', r: 4, strokeWidth: 2, stroke: '#0D0E13' }}
                    activeDot={{ r: 6, fill: '#F5611A' }}
                  >
                    <LabelList
                      dataKey="peso"
                      position="top"
                      style={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 600 }}
                      formatter={(v: number) => `${v}`}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Registrar peso */}
          <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <div className="px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Registros</h3>
              <button
                onClick={() => setShowForm(v => !v)}
                className="flex items-center gap-1 text-xs font-medium cursor-pointer"
                style={{ color: '#F5611A' }}
              >
                <Plus style={{ width: 13, height: 13 }} />
                Añadir
              </button>
            </div>

            {showForm && (
              <div className="px-5 pb-4 flex gap-2">
                <input
                  type="number"
                  placeholder="Ej: 79.5"
                  value={newWeight}
                  onChange={e => setNewWeight(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
                />
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style={{ background: '#F5611A', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? '...' : 'Guardar'}
                </button>
              </div>
            )}

            <div className="divide-y" style={{ borderColor: '#1E2130' }}>
              {[...pesos].reverse().slice(0, 8).map((p, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>
                    {p.fecha ? new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : p.mes}
                  </span>
                  <span className="font-semibold text-white text-sm">{p.peso} kg</span>
                </div>
              ))}
              {pesos.length === 0 && (
                <div className="px-5 py-6 text-center text-sm" style={{ color: '#4B5563' }}>
                  Sin registros aún. ¡Añade tu primer peso!
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'logros' && (
        <div className="mx-4 space-y-3">
          {logros.map(l => (
            <div
              key={l.id}
              className="rounded-2xl p-4 flex items-center gap-4"
              style={{
                background: l.unlocked ? '#161820' : '#0D0E13',
                border: `1px solid ${l.unlocked ? '#F5611A33' : '#1E2130'}`,
                opacity: l.unlocked ? 1 : 0.5,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: l.unlocked ? 'rgba(245,97,26,0.15)' : '#1E2130' }}
              >
                {l.icon}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{l.titulo}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{l.desc}</p>
              </div>
              {l.unlocked && (
                <div className="ml-auto text-xs font-medium px-2 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
