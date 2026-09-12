import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { fetchPlanNutricional, type PlanNutricional, type ComidaPlan } from '../../lib/supabase'

interface MiNutricionProps {
  userId: string
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const isDemo = (id: string) => id.startsWith('client-') || id.startsWith('admin-')

const DEMO_PLAN: PlanNutricional = {
  cliente_id: 'demo',
  entrenador_id: 'demo',
  nombre: 'Plan Nutricional Demo',
  calorias_objetivo: 2200,
  proteinas_g: 160,
  carbos_g: 250,
  grasas_g: 70,
  comidas: [
    {
      id: '1',
      nombre: 'Desayuno',
      hora: '08:00',
      alimentos: [
        { id: 'a1', nombre: 'Avena', gramos: 80, calorias: 304, proteinas: 10, carbos: 55, grasas: 5 },
        { id: 'a2', nombre: 'Claras de huevo', gramos: 150, calorias: 78, proteinas: 16, carbos: 1, grasas: 0 },
        { id: 'a3', nombre: 'Plátano', gramos: 100, calorias: 89, proteinas: 1, carbos: 23, grasas: 0 },
      ],
    },
    {
      id: '2',
      nombre: 'Almuerzo',
      hora: '13:00',
      alimentos: [
        { id: 'a4', nombre: 'Pechuga de pollo', gramos: 200, calorias: 220, proteinas: 46, carbos: 0, grasas: 4 },
        { id: 'a5', nombre: 'Arroz integral', gramos: 150, calorias: 195, proteinas: 4, carbos: 43, grasas: 1 },
        { id: 'a6', nombre: 'Brócoli', gramos: 100, calorias: 34, proteinas: 3, carbos: 7, grasas: 0 },
      ],
    },
    {
      id: '3',
      nombre: 'Merienda',
      hora: '17:00',
      alimentos: [
        { id: 'a7', nombre: 'Yogur griego', gramos: 150, calorias: 132, proteinas: 18, carbos: 6, grasas: 4 },
        { id: 'a8', nombre: 'Nueces', gramos: 30, calorias: 196, proteinas: 4, carbos: 4, grasas: 20 },
      ],
    },
    {
      id: '4',
      nombre: 'Cena',
      hora: '21:00',
      alimentos: [
        { id: 'a9', nombre: 'Salmón', gramos: 180, calorias: 357, proteinas: 36, carbos: 0, grasas: 22 },
        { id: 'a10', nombre: 'Patata dulce', gramos: 120, calorias: 103, proteinas: 2, carbos: 24, grasas: 0 },
        { id: 'a11', nombre: 'Ensalada', gramos: 80, calorias: 20, proteinas: 1, carbos: 4, grasas: 0 },
      ],
    },
  ],
}

export default function MiNutricion({ userId }: MiNutricionProps) {
  const demo = isDemo(userId)
  const [plan, setPlan] = useState<PlanNutricional | null>(null)
  const [loading, setLoading] = useState(!demo)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (demo) { setPlan(DEMO_PLAN); return }
    fetchPlanNutricional(userId).then(p => {
      setPlan(p)
      setLoading(false)
    })
  }, [userId, demo])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#F5611A' }} />
    </div>
  )

  if (!plan) return (
    <div className="pb-24 px-4 pt-6">
      <h1 className="text-2xl font-bold text-white mb-6">Nutrición</h1>
      <div className="rounded-2xl p-10 flex flex-col items-center gap-3" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <div className="text-4xl">🥗</div>
        <p className="font-medium text-white">Sin plan nutricional</p>
        <p className="text-sm text-center" style={{ color: '#6B7280' }}>Tu entrenador te asignará un plan de alimentación pronto</p>
      </div>
    </div>
  )

  const ahoraStr = new Date().toTimeString().slice(0, 5) // "HH:MM"

  const comidaPasada = (hora: string) => hora <= ahoraStr
  const proximaComida = plan.comidas.find(c => c.hora > ahoraStr)

  const consumidoCal = plan.comidas.filter(c => comidaPasada(c.hora)).reduce((s, c) => s + c.alimentos.reduce((ss, a) => ss + a.calorias, 0), 0)
  const consumidoProt = plan.comidas.filter(c => comidaPasada(c.hora)).reduce((s, c) => s + c.alimentos.reduce((ss, a) => ss + a.proteinas, 0), 0)
  const consumidoCarbs = plan.comidas.filter(c => comidaPasada(c.hora)).reduce((s, c) => s + c.alimentos.reduce((ss, a) => ss + a.carbos, 0), 0)
  const consumidoGrasas = plan.comidas.filter(c => comidaPasada(c.hora)).reduce((s, c) => s + c.alimentos.reduce((ss, a) => ss + a.grasas, 0), 0)

  const pctCal = Math.min((consumidoCal / plan.calorias_objetivo) * 100, 100)

  const macros = [
    { label: 'Proteína', val: consumidoProt, obj: plan.proteinas_g, color: '#8B5CF6' },
    { label: 'Carbohidratos', val: consumidoCarbs, obj: plan.carbos_g, color: '#3B82F6' },
    { label: 'Grasas', val: consumidoGrasas, obj: plan.grasas_g, color: '#F59E0B' },
  ]

  return (
    <div className="pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">Nutrición</h1>
        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{plan.nombre}</p>
      </div>

      {/* Calorías */}
      <div className="mx-4 rounded-2xl p-5 mb-4" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <div className="text-sm mb-1" style={{ color: '#6B7280' }}>Calorías consumidas hoy</div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-bold text-white">{consumidoCal}</span>
          <span className="text-sm" style={{ color: '#6B7280' }}>/ {plan.calorias_objetivo} kcal</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden mb-1" style={{ background: '#1E2130' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pctCal}%`, background: pctCal >= 100 ? '#EF4444' : '#F5611A' }}
          />
        </div>
        <div className="text-xs text-right" style={{ color: '#6B7280' }}>
          {plan.calorias_objetivo - consumidoCal > 0 ? `${plan.calorias_objetivo - consumidoCal} kcal restantes` : 'Objetivo alcanzado'}
        </div>
      </div>

      {/* Macros */}
      <div className="mx-4 rounded-2xl p-5 mb-4" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <h3 className="font-semibold text-white mb-4">Macros del plan</h3>
        <div className="space-y-4">
          {macros.map(({ label, val, obj, color }) => {
            const pct = Math.min((val / obj) * 100, 100)
            return (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span style={{ color: '#9CA3AF' }}>{label}</span>
                  <span className="font-medium" style={{ color }}>{val}g / {obj}g</span>
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
      <div className="mx-4 space-y-3">
        <h3 className="font-semibold text-white">Plan de comidas</h3>
        {plan.comidas.map((comida: ComidaPlan) => {
          const cal = comida.alimentos.reduce((s, a) => s + a.calorias, 0)
          const prot = comida.alimentos.reduce((s, a) => s + a.proteinas, 0)
          const isOpen = expanded[comida.id] ?? false
          const pasada = comidaPasada(comida.hora)
          const esProxima = proximaComida?.id === comida.id

          return (
            <div key={comida.id} className="rounded-2xl overflow-hidden" style={{
              background: '#161820',
              border: `1px solid ${esProxima ? '#F5611A55' : pasada ? '#10B98133' : '#1E2130'}`,
              opacity: !pasada && !esProxima ? 0.6 : 1,
            }}>
              <button
                onClick={() => setExpanded(p => ({ ...p, [comida.id]: !isOpen }))}
                className="w-full flex items-center gap-3 px-5 py-4 cursor-pointer text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{comida.nombre}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1E2130', color: '#6B7280' }}>{comida.hora}</span>
                    {pasada && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>✓</span>}
                    {esProxima && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(245,97,26,0.15)', color: '#F5611A' }}>Próxima</span>}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                    {comida.alimentos.length} alimentos · {prot}g prot
                  </div>
                </div>
                <div className="text-right mr-2">
                  <div className="font-bold text-sm" style={{ color: '#F5611A' }}>{cal}</div>
                  <div className="text-xs" style={{ color: '#4B5563' }}>kcal</div>
                </div>
                {isOpen
                  ? <ChevronUp style={{ width: 16, height: 16, color: '#4B5563', flexShrink: 0 }} />
                  : <ChevronDown style={{ width: 16, height: 16, color: '#4B5563', flexShrink: 0 }} />
                }
              </button>

              {isOpen && comida.alimentos.length > 0 && (
                <div className="px-5 pb-4">
                  <div className="grid text-xs mb-2 px-2" style={{ gridTemplateColumns: '1fr 50px 50px 40px 40px 40px', color: '#4B5563' }}>
                    <span>Alimento</span>
                    <span className="text-center">g</span>
                    <span className="text-center">kcal</span>
                    <span className="text-center">P</span>
                    <span className="text-center">C</span>
                    <span className="text-center">G</span>
                  </div>
                  {comida.alimentos.map(a => (
                    <div key={a.id} className="grid items-center text-xs py-2 px-2 rounded-lg mb-1" style={{ gridTemplateColumns: '1fr 50px 50px 40px 40px 40px', background: '#1E2130' }}>
                      <span className="text-white truncate">{a.nombre}</span>
                      <span className="text-center" style={{ color: '#9CA3AF' }}>{a.gramos}</span>
                      <span className="text-center font-medium" style={{ color: '#F5611A' }}>{a.calorias}</span>
                      <span className="text-center" style={{ color: '#8B5CF6' }}>{a.proteinas}</span>
                      <span className="text-center" style={{ color: '#3B82F6' }}>{a.carbos}</span>
                      <span className="text-center" style={{ color: '#F59E0B' }}>{a.grasas}</span>
                    </div>
                  ))}
                </div>
              )}

              {isOpen && comida.alimentos.length === 0 && (
                <div className="px-5 pb-4 text-sm" style={{ color: '#4B5563' }}>Sin alimentos añadidos</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
