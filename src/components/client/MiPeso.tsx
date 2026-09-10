import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Save } from 'lucide-react'
import { demoPeso } from '../../data/demo'

interface MiPesoProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

export default function MiPeso({ onToast }: MiPesoProps) {
  const [pesoData] = useState(demoPeso)
  const [newWeight, setNewWeight] = useState('')

  const actual = pesoData[pesoData.length - 1].peso
  const inicial = pesoData[0].peso
  const cambio = actual - inicial

  const handleSave = () => {
    if (!newWeight) return
    onToast(`Peso ${newWeight} kg guardado correctamente 💾`, 'success')
    setNewWeight('')
  }

  return (
    <div className="pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">Mi Peso</h1>
      </div>

      {/* Metrics */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl p-4 col-span-1" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <div className="text-xs mb-1" style={{ color: '#6B7280' }}>Peso Actual</div>
          <div className="text-2xl font-bold text-white">{actual}</div>
          <div className="text-xs" style={{ color: '#6B7280' }}>kg</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <div className="text-xs mb-1" style={{ color: '#6B7280' }}>Cambio Total</div>
          <div className="text-2xl font-bold" style={{ color: cambio < 0 ? '#10B981' : '#EF4444' }}>
            {cambio > 0 ? '+' : ''}{cambio}
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
              formatter={(v: number) => [`${v} kg`, 'Peso']}
            />
            <Area type="monotone" dataKey="peso" stroke="#F5611A" strokeWidth={2.5} fill="url(#pesoGrad)" dot={{ fill: '#F5611A', r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

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
            className="flex-1 px-4 py-3 rounded-xl text-white outline-none text-lg font-medium"
            style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
          />
          <button
            onClick={handleSave}
            className="px-5 py-3 rounded-xl font-semibold text-white cursor-pointer flex items-center gap-2"
            style={{ background: '#F5611A' }}
          >
            <Save style={{ width: 16, height: 16 }} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
