import { Plus } from 'lucide-react'
import { demoNutricion } from '../../data/demo'

interface MiNutricionProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const comidas = [
  { nombre: 'Desayuno', hora: '08:00', kcal: 650, proteinas: 45, carbos: 80, grasas: 20 },
  { nombre: 'Almuerzo', hora: '13:00', kcal: 900, proteinas: 70, carbos: 120, grasas: 25 },
  { nombre: 'Merienda', hora: '17:00', kcal: 350, proteinas: 30, carbos: 40, grasas: 10 },
]

const caloriasHoy = comidas.reduce((sum, c) => sum + c.kcal, 0)

export default function MiNutricion({ onToast }: MiNutricionProps) {
  const pctCal = Math.min((caloriasHoy / demoNutricion.calorias) * 100, 100)

  const macros = [
    {
      label: 'Proteína',
      consumido: comidas.reduce((s, c) => s + c.proteinas, 0),
      objetivo: demoNutricion.proteinas,
      color: '#8B5CF6',
    },
    {
      label: 'Carbohidratos',
      consumido: comidas.reduce((s, c) => s + c.carbos, 0),
      objetivo: demoNutricion.carbos,
      color: '#3B82F6',
    },
    {
      label: 'Grasas',
      consumido: comidas.reduce((s, c) => s + c.grasas, 0),
      objetivo: demoNutricion.grasas,
      color: '#F59E0B',
    },
  ]

  return (
    <div className="pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">Nutrición</h1>
      </div>

      {/* Calorías */}
      <div className="mx-4 rounded-2xl p-5 mb-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <div className="text-sm mb-1" style={{ color: '#6B7280' }}>Calorías de Hoy</div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-bold text-white">{caloriasHoy}</span>
          <span className="text-sm" style={{ color: '#6B7280' }}>/ {demoNutricion.calorias} kcal</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden mb-1" style={{ background: '#1E2130' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pctCal}%`, background: pctCal >= 100 ? '#EF4444' : '#F5611A' }}
          />
        </div>
        <div className="text-xs text-right" style={{ color: '#6B7280' }}>
          {demoNutricion.calorias - caloriasHoy} kcal restantes
        </div>
      </div>

      {/* Macros */}
      <div className="mx-4 rounded-2xl p-5 mb-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <h3 className="font-semibold text-white mb-4">Macros</h3>
        <div className="space-y-4">
          {macros.map(({ label, consumido, objetivo, color }) => {
            const pct = Math.min((consumido / objetivo) * 100, 100)
            return (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span style={{ color: '#9CA3AF' }}>{label}</span>
                  <span className="font-medium" style={{ color }}>
                    {consumido}g / {objetivo}g
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#1E2130' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Comidas */}
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #1E2130' }}>
          <h3 className="font-semibold text-white">Comidas de Hoy</h3>
          <button
            onClick={() => onToast('Funcionalidad en desarrollo', 'info')}
            className="flex items-center gap-1 text-xs cursor-pointer font-medium"
            style={{ color: '#F5611A' }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Agregar
          </button>
        </div>
        {comidas.map(comida => (
          <div key={comida.nombre} className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #1E2130' }}>
            <div className="flex-1">
              <div className="font-medium text-white text-sm">{comida.nombre}</div>
              <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                {comida.hora} · {comida.proteinas}g prot · {comida.carbos}g carbs · {comida.grasas}g grasas
              </div>
            </div>
            <span className="font-bold text-sm" style={{ color: '#F5611A' }}>{comida.kcal} kcal</span>
          </div>
        ))}
      </div>
    </div>
  )
}
