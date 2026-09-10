import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Save, Loader2 } from 'lucide-react'
import { demoPeso } from '../../data/demo'
import { fetchRegistrosPeso, addRegistroPeso, type PesoEntry } from '../../lib/supabase'

interface MiPesoProps {
  userId: string
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const isDemo = (id: string) => id.startsWith('client-') || id.startsWith('admin-')

export default function MiPeso({ userId, onToast }: MiPesoProps) {
  const demo = isDemo(userId)
  const [pesoData, setPesoData] = useState<PesoEntry[]>(demo ? demoPeso : [])
  const [loading, setLoading] = useState(!demo)
  const [newWeight, setNewWeight] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (demo) return
    fetchRegistrosPeso(userId).then(data => {
      if (data.length > 0) setPesoData(data)
      setLoading(false)
    })
  }, [userId, demo])

  const actual = pesoData.length > 0 ? pesoData[pesoData.length - 1].peso : 0
  const inicial = pesoData.length > 0 ? pesoData[0].peso : 0
  const cambio = actual - inicial

  const handleSave = async () => {
    if (!newWeight) return
    if (!demo) {
      setSaving(true)
      try {
        await addRegistroPeso(userId, Number(newWeight), new Date().toISOString().split('T')[0])
        const updated = await fetchRegistrosPeso(userId)
        setPesoData(updated)
        onToast(`Peso ${newWeight} kg guardado correctamente`, 'success')
      } catch {
        onToast('Error al guardar el peso', 'error')
      } finally {
        setSaving(false)
      }
    } else {
      onToast(`Peso ${newWeight} kg guardado correctamente`, 'success')
    }
    setNewWeight('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#F5611A' }} />
      </div>
    )
  }

  return (
    <div className="pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">Mi Peso</h1>
      </div>

      {pesoData.length === 0 ? (
        <div className="mx-4 rounded-2xl p-10 flex flex-col items-center gap-3 mb-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <div className="text-3xl">⚖️</div>
          <p className="font-medium text-white">Sin registros aún</p>
          <p className="text-sm text-center" style={{ color: '#6B7280' }}>Registra tu primer peso abajo para empezar a ver tu progreso</p>
        </div>
      ) : (
        <>
          {/* Metrics */}
          <div className="px-4 grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl p-4" style={{ background: '#161820', border: '1px solid #1E2130' }}>
              <div className="text-xs mb-1" style={{ color: '#6B7280' }}>Peso Actual</div>
              <div className="text-2xl font-bold text-white">{actual}</div>
              <div className="text-xs" style={{ color: '#6B7280' }}>kg</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#161820', border: '1px solid #1E2130' }}>
              <div className="text-xs mb-1" style={{ color: '#6B7280' }}>Cambio Total</div>
              <div className="text-2xl font-bold" style={{ color: cambio < 0 ? '#10B981' : '#EF4444' }}>
                {cambio > 0 ? '+' : ''}{cambio.toFixed(1)}
              </div>
              <div className="text-xs" style={{ color: '#6B7280' }}>kg desde inicio</div>
            </div>
          </div>

          {/* Chart */}
          <div className="mx-4 rounded-2xl p-5 mb-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <h3 className="font-semibold text-white mb-4">Mi Evolución</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={pesoData}>
                <defs>
                  <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5611A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F5611A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2130" />
                <XAxis dataKey="mes" stroke="#4B5563" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis stroke="#4B5563" tick={{ fontSize: 11, fill: '#6B7280' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#1E2130', border: '1px solid #2a2d3e', borderRadius: 8 }}
                  formatter={(v) => [`${v} kg`, 'Peso']}
                />
                <Area type="monotone" dataKey="peso" stroke="#F5611A" strokeWidth={2.5} fill="url(#pesoGrad)" dot={{ fill: '#F5611A', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Register */}
      <div className="mx-4 rounded-2xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <h3 className="font-semibold text-white mb-4">Registrar Peso de Hoy</h3>
        <div className="flex gap-3">
          <input
            type="number"
            step="0.1"
            placeholder="81.0"
            value={newWeight}
            onChange={e => setNewWeight(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="flex-1 px-4 py-3 rounded-xl text-white outline-none text-lg font-medium"
            style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-3 rounded-xl font-semibold text-white cursor-pointer flex items-center gap-2"
            style={{ background: '#F5611A', opacity: saving ? 0.7 : 1 }}
          >
            {saving
              ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
              : <Save style={{ width: 16, height: 16 }} />
            }
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
