import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface NutricionData {
  calorias: number
  proteinas: number
  carbos: number
  grasas: number
  cumplimientoSemanal: { dia: string; valor: number }[]
}

interface NutricionTabProps {
  nutricion: NutricionData
}

export default function NutricionTab({ nutricion }: NutricionTabProps) {
  const macros = [
    { label: 'Proteína', value: nutricion.proteinas, unit: 'g', pct: 40, color: '#8B5CF6' },
    { label: 'Carbohidratos', value: nutricion.carbos, unit: 'g', pct: 45, color: '#3B82F6' },
    { label: 'Grasas', value: nutricion.grasas, unit: 'g', pct: 27, color: '#F59E0B' },
  ]

  return (
    <div className="space-y-5">
      {/* Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Calorías', value: `${nutricion.calorias}`, sub: 'kcal objetivo', color: '#F5611A' },
          { label: 'Proteína', value: `${nutricion.proteinas}g`, sub: '40% macros', color: '#8B5CF6' },
          { label: 'Carbohidratos', value: `${nutricion.carbos}g`, sub: '45% macros', color: '#3B82F6' },
          { label: 'Grasas', value: `${nutricion.grasas}g`, sub: '27% macros', color: '#F59E0B' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <div className="text-xs mb-2" style={{ color: '#6B7280' }}>{label}</div>
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs mt-1" style={{ color: '#4B5563' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Macro bars */}
      <div className="rounded-xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <h3 className="font-semibold text-white mb-4">Distribución de Macros</h3>
        <div className="space-y-4">
          {macros.map(({ label, value, pct, color }) => (
            <div key={label}>
              <div className="flex justify-between text-sm mb-1.5">
                <span style={{ color: '#9CA3AF' }}>{label}</span>
                <span className="font-medium text-white">{value}g · <span style={{ color }}>{pct}%</span></span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1E2130' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly chart */}
      <div className="rounded-xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <h3 className="font-semibold text-white mb-4">Cumplimiento Nutricional Semanal</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={nutricion.cumplimientoSemanal}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2130" />
            <XAxis dataKey="dia" stroke="#4B5563" tick={{ fontSize: 12, fill: '#6B7280' }} />
            <YAxis stroke="#4B5563" tick={{ fontSize: 12, fill: '#6B7280' }} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{ background: '#1E2130', border: '1px solid #2a2d3e', borderRadius: 8 }}
              labelStyle={{ color: '#9CA3AF' }}
              formatter={(v: number) => [`${v}%`, 'Cumplimiento']}
            />
            <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
              {nutricion.cumplimientoSemanal.map((entry) => (
                <Cell
                  key={entry.dia}
                  fill={entry.valor >= 90 ? '#10B981' : entry.valor >= 70 ? '#F59E0B' : '#EF4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
