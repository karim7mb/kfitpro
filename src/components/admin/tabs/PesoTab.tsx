import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingDown, Scale, Loader2 } from 'lucide-react'
import { fetchRegistrosPeso, addRegistroPeso, type PesoEntry } from '../../../lib/supabase'

interface PesoTabProps {
  pesoData: PesoEntry[]
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
  clientId?: string
}

export default function PesoTab({ pesoData, onToast, clientId }: PesoTabProps) {
  const [newWeight, setNewWeight] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [realPeso, setRealPeso] = useState<PesoEntry[] | null>(null)
  const [loadingPeso, setLoadingPeso] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!clientId) return
    setLoadingPeso(true)
    fetchRegistrosPeso(clientId).then(data => {
      setRealPeso(data.length > 0 ? data : [])
      setLoadingPeso(false)
    })
  }, [clientId])

  const data = clientId ? (realPeso ?? []) : pesoData
  const hasPeso = data.length > 0

  const current = hasPeso ? data[data.length - 1].peso : 0
  const initial = hasPeso ? data[0].peso : 0
  const change = Math.round((current - initial) * 10) / 10
  const weeks = Math.max(1, data.length * 4)
  const rhythm = (change / weeks).toFixed(2)

  const handleRegister = async () => {
    if (!newWeight) return
    if (clientId) {
      setSaving(true)
      try {
        await addRegistroPeso(clientId, Number(newWeight), newDate)
        const updated = await fetchRegistrosPeso(clientId)
        setRealPeso(updated)
        onToast(`Peso ${newWeight} kg registrado`, 'success')
      } catch {
        onToast('Error al registrar el peso', 'error')
      } finally {
        setSaving(false)
      }
    } else {
      onToast(`Peso ${newWeight} kg registrado correctamente`, 'success')
    }
    setNewWeight('')
  }

  if (loadingPeso) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#F5611A' }} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Metrics */}
      {hasPeso ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Peso Actual', value: `${current} kg`, color: '#F5611A' },
            { label: 'Peso Inicial', value: `${initial} kg`, color: '#6B7280' },
            { label: 'Cambio Total', value: `${change > 0 ? '+' : ''}${change} kg`, color: change < 0 ? '#10B981' : '#EF4444' },
            { label: 'Ritmo', value: `${rhythm} kg/sem`, color: '#3B82F6' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4" style={{ background: '#161820', border: '1px solid #1E2130' }}>
              <div className="text-xs mb-2" style={{ color: '#6B7280' }}>{label}</div>
              <div className="text-xl font-bold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl p-8 flex flex-col items-center gap-2" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <Scale style={{ width: 32, height: 32, color: '#4B5563' }} />
          <p className="font-medium text-white">Sin registros de peso aún</p>
          <p className="text-sm" style={{ color: '#6B7280' }}>Registra el primer peso abajo</p>
        </div>
      )}

      {/* Chart */}
      {hasPeso && (
        <div className="rounded-xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <h3 className="font-semibold text-white mb-4">Evolución de Peso</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2130" />
              <XAxis dataKey="mes" stroke="#4B5563" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis stroke="#4B5563" tick={{ fontSize: 12, fill: '#6B7280' }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#1E2130', border: '1px solid #2a2d3e', borderRadius: 8 }}
                labelStyle={{ color: '#9CA3AF' }}
                itemStyle={{ color: '#F5611A' }}
                formatter={(v) => [`${v} kg`, 'Peso']}
              />
              <Line type="monotone" dataKey="peso" stroke="#F5611A" strokeWidth={2.5} dot={{ fill: '#F5611A', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* History table */}
        {hasPeso && (
          <div className="xl:col-span-2 rounded-xl overflow-hidden" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid #1E2130' }}>
              <h3 className="font-semibold text-white">Historial</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2130' }}>
                  {['Mes', 'Peso', 'Cambio'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: '#6B7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((entry, i) => {
                  const delta = i > 0 ? entry.peso - data[i - 1].peso : 0
                  return (
                    <tr key={`${entry.mes}-${i}`} style={{ borderBottom: i < data.length - 1 ? '1px solid #1E2130' : 'none' }}>
                      <td className="px-5 py-3 text-sm text-white">{entry.mes}</td>
                      <td className="px-5 py-3 text-sm text-white">{entry.peso} kg</td>
                      <td className="px-5 py-3 text-sm font-medium" style={{ color: delta < 0 ? '#10B981' : delta > 0 ? '#EF4444' : '#6B7280' }}>
                        {i > 0 ? (delta > 0 ? '+' : '') + delta.toFixed(1) + ' kg' : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Register form */}
        <div className={`rounded-xl p-5 ${!hasPeso ? 'xl:col-span-3' : ''}`} style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <h3 className="font-semibold text-white mb-4">Registrar Peso</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6B7280' }}>Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                placeholder="81.5"
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6B7280' }}>Fecha</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                style={{ background: '#1E2130', border: '1px solid #2a2d3e', colorScheme: 'dark' }}
              />
            </div>
            <button
              onClick={handleRegister}
              disabled={saving}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer flex items-center justify-center gap-2"
              style={{ background: '#F5611A', opacity: saving ? 0.7 : 1 }}
            >
              {saving
                ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Guardando...</>
                : <><TrendingDown style={{ width: 14, height: 14 }} /> Registrar</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
