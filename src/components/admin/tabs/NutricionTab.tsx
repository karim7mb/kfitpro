import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp, Save, Image } from 'lucide-react'
import { supabase, fetchPlanNutricional, upsertPlanNutricional, type PlanNutricional, type ComidaPlan, type Alimento } from '../../../lib/supabase'

const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined

const MEAL_EN: Record<string, string> = {
  desayuno: 'breakfast', almuerzo: 'lunch', comida: 'lunch',
  merienda: 'healthy snack', cena: 'dinner', preentrenamiento: 'pre workout meal',
  postentrenamiento: 'post workout meal',
}

async function buscarFotoUnsplash(comida: ComidaPlan): Promise<string | null> {
  if (!UNSPLASH_KEY) return null
  const nombreEn = MEAL_EN[comida.nombre.toLowerCase().trim()] ?? comida.nombre
  const mainIngredient = comida.alimentos[0]?.nombre ?? ''
  const query = encodeURIComponent(`${nombreEn} ${mainIngredient} food plate`)
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&per_page=6&orientation=landscape&client_id=${UNSPLASH_KEY}`
  )
  if (!res.ok) return null
  const data = await res.json()
  const results: { urls: { regular: string } }[] = data.results ?? []
  if (results.length === 0) return null
  const idx = Math.floor(Math.random() * Math.min(results.length, 4))
  return results[idx].urls.regular
}

interface NutricionTabProps {
  clientId: string
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const isDemo = (id: string) => id.startsWith('client-') || id.startsWith('admin-')

function uid() { return Math.random().toString(36).slice(2) }

const COMIDAS_DEFAULT = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena']

const EMPTY_PLAN = (clienteId: string, entrenadorId: string): PlanNutricional => ({
  cliente_id: clienteId,
  entrenador_id: entrenadorId,
  nombre: 'Plan Nutricional',
  calorias_objetivo: 2000,
  proteinas_g: 150,
  carbos_g: 220,
  grasas_g: 70,
  comidas: COMIDAS_DEFAULT.map((nombre, i) => ({
    id: uid(),
    nombre,
    hora: ['08:00', '13:00', '17:00', '21:00'][i],
    alimentos: [],
  })),
})

export default function NutricionTab({ clientId, onToast }: NutricionTabProps) {
  const demo = isDemo(clientId)
  const [plan, setPlan] = useState<PlanNutricional | null>(null)
  const [loading, setLoading] = useState(!demo)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newFood, setNewFood] = useState({ nombre: '', gramos: '', calorias: '', proteinas: '', carbos: '', grasas: '' })
  const [searchingFoto, setSearchingFoto] = useState<string | null>(null)

  useEffect(() => {
    if (demo) return
    fetchPlanNutricional(clientId).then(p => {
      setPlan(p)
      setLoading(false)
    })
  }, [clientId, demo])

  const initPlan = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setPlan(EMPTY_PLAN(clientId, user.id))
  }

  const save = async () => {
    if (!plan) return
    setSaving(true)
    try {
      await upsertPlanNutricional(plan)
      onToast('Plan guardado', 'success')
    } catch {
      onToast('Error al guardar el plan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateMacro = (field: keyof PlanNutricional, value: number) => {
    setPlan(p => p ? { ...p, [field]: value } : p)
  }

  const addComida = () => {
    setPlan(p => p ? { ...p, comidas: [...p.comidas, { id: uid(), nombre: 'Nueva comida', hora: '00:00', alimentos: [] }] } : p)
  }

  const removeComida = (cId: string) => {
    setPlan(p => p ? { ...p, comidas: p.comidas.filter(c => c.id !== cId) } : p)
  }

  const updateComida = (cId: string, field: keyof ComidaPlan, value: string) => {
    setPlan(p => p ? { ...p, comidas: p.comidas.map(c => c.id === cId ? { ...c, [field]: value } : c) } : p)
  }

  const handleBuscarFoto = async (comida: ComidaPlan) => {
    setSearchingFoto(comida.id)
    try {
      const url = await buscarFotoUnsplash(comida)
      if (url) updateComida(comida.id, 'foto_url', url)
      else onToast('No se encontró foto. Añade VITE_UNSPLASH_ACCESS_KEY al .env', 'error')
    } catch {
      onToast('Error al buscar foto', 'error')
    } finally {
      setSearchingFoto(null)
    }
  }

  const addAlimento = (cId: string) => {
    const a: Alimento = {
      id: uid(),
      nombre: newFood.nombre || 'Alimento',
      gramos: Number(newFood.gramos) || 0,
      calorias: Number(newFood.calorias) || 0,
      proteinas: Number(newFood.proteinas) || 0,
      carbos: Number(newFood.carbos) || 0,
      grasas: Number(newFood.grasas) || 0,
    }
    setPlan(p => p ? { ...p, comidas: p.comidas.map(c => c.id === cId ? { ...c, alimentos: [...c.alimentos, a] } : c) } : p)
    setNewFood({ nombre: '', gramos: '', calorias: '', proteinas: '', carbos: '', grasas: '' })
    setAddingTo(null)
  }

  const removeAlimento = (cId: string, aId: string) => {
    setPlan(p => p ? { ...p, comidas: p.comidas.map(c => c.id === cId ? { ...c, alimentos: c.alimentos.filter(a => a.id !== aId) } : c) } : p)
  }

  const totalCal = plan?.comidas.reduce((s, c) => s + c.alimentos.reduce((ss, a) => ss + a.calorias, 0), 0) ?? 0
  const totalProt = plan?.comidas.reduce((s, c) => s + c.alimentos.reduce((ss, a) => ss + a.proteinas, 0), 0) ?? 0
  const totalCarbs = plan?.comidas.reduce((s, c) => s + c.alimentos.reduce((ss, a) => ss + a.carbos, 0), 0) ?? 0
  const totalGrasas = plan?.comidas.reduce((s, c) => s + c.alimentos.reduce((ss, a) => ss + a.grasas, 0), 0) ?? 0

  if (demo) return (
    <div className="rounded-xl p-8 text-center" style={{ background: '#161820', border: '1px solid #1E2130' }}>
      <p className="text-white font-medium">Plan nutricional</p>
      <p className="text-sm mt-1" style={{ color: '#6B7280' }}>No disponible en modo demo</p>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#F5611A' }} />
    </div>
  )

  if (!plan) return (
    <div className="rounded-xl p-10 flex flex-col items-center gap-4 text-center" style={{ background: '#161820', border: '1px solid #1E2130' }}>
      <div className="text-4xl">🥗</div>
      <div>
        <p className="font-bold text-white">Sin plan nutricional</p>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Crea el plan de alimentación personalizado para este cliente</p>
      </div>
      <button onClick={initPlan} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: '#F5611A' }}>
        Crear plan nutricional
      </button>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <input
            value={plan.nombre}
            onChange={e => setPlan(p => p ? { ...p, nombre: e.target.value } : p)}
            className="font-bold text-white text-lg bg-transparent outline-none border-b border-transparent focus:border-orange-500"
          />
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            Calorías totales del plan: <span className="text-white font-medium">{totalCal} kcal</span>
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
          style={{ background: '#F5611A', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Save style={{ width: 14, height: 14 }} />}
          Guardar
        </button>
      </div>

      {/* Objetivos macro */}
      <div className="rounded-xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <h3 className="font-semibold text-white mb-4">Objetivos diarios</h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Calorías', field: 'calorias_objetivo' as const, unit: 'kcal', color: '#F5611A', val: plan.calorias_objetivo, real: totalCal },
            { label: 'Proteínas', field: 'proteinas_g' as const, unit: 'g', color: '#8B5CF6', val: plan.proteinas_g, real: totalProt },
            { label: 'Carbohidratos', field: 'carbos_g' as const, unit: 'g', color: '#3B82F6', val: plan.carbos_g, real: totalCarbs },
            { label: 'Grasas', field: 'grasas_g' as const, unit: 'g', color: '#F59E0B', val: plan.grasas_g, real: totalGrasas },
          ].map(({ label, field, unit, color, val, real }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: '#1E2130' }}>
              <div className="text-xs mb-1" style={{ color: '#6B7280' }}>{label}</div>
              <div className="flex items-center gap-1 mb-1">
                <input
                  type="number"
                  value={val}
                  onChange={e => updateMacro(field, Number(e.target.value))}
                  className="w-16 text-lg font-bold bg-transparent outline-none"
                  style={{ color }}
                />
                <span className="text-xs" style={{ color: '#4B5563' }}>{unit}</span>
              </div>
              <div className="text-xs" style={{ color: '#4B5563' }}>Plan: {real} {unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Comidas */}
      <div className="space-y-3">
        {plan.comidas.map(comida => {
          const calComida = comida.alimentos.reduce((s, a) => s + a.calorias, 0)
          const isOpen = expanded[comida.id] ?? true
          return (
            <div key={comida.id} className="rounded-xl overflow-hidden" style={{ background: '#161820', border: '1px solid #1E2130' }}>
              <div className="px-4 py-3 flex items-center gap-3">
                <button onClick={() => setExpanded(p => ({ ...p, [comida.id]: !isOpen }))} className="cursor-pointer">
                  {isOpen ? <ChevronUp style={{ width: 16, height: 16, color: '#6B7280' }} /> : <ChevronDown style={{ width: 16, height: 16, color: '#6B7280' }} />}
                </button>
                <input
                  value={comida.nombre}
                  onChange={e => updateComida(comida.id, 'nombre', e.target.value)}
                  className="flex-1 font-semibold text-white bg-transparent outline-none text-sm"
                />
                <input
                  value={comida.hora}
                  onChange={e => updateComida(comida.id, 'hora', e.target.value)}
                  className="w-14 text-xs text-center bg-transparent outline-none rounded px-1 py-0.5"
                  style={{ color: '#6B7280', border: '1px solid #2a2d3e' }}
                />
                <span className="text-xs font-medium" style={{ color: '#F5611A' }}>{calComida} kcal</span>
                {UNSPLASH_KEY && (
                  <button
                    onClick={() => handleBuscarFoto(comida)}
                    disabled={searchingFoto === comida.id}
                    className="cursor-pointer"
                    title="Buscar foto automática"
                    style={{ color: comida.foto_url ? '#10B981' : '#4B5563' }}
                  >
                    {searchingFoto === comida.id
                      ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                      : <Image style={{ width: 14, height: 14 }} />}
                  </button>
                )}
                <button onClick={() => removeComida(comida.id)} className="cursor-pointer" style={{ color: '#4B5563' }}>
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>
              {comida.foto_url && isOpen && (
                <div className="px-4 pb-3">
                  <div className="relative rounded-xl overflow-hidden" style={{ height: 120 }}>
                    <img src={comida.foto_url} alt={comida.nombre} className="w-full h-full object-cover" />
                    <button
                      onClick={() => updateComida(comida.id, 'foto_url', '')}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer font-bold"
                      style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
                    >×</button>
                    <button
                      onClick={() => handleBuscarFoto(comida)}
                      className="absolute bottom-2 right-2 px-2 py-1 rounded-lg text-xs cursor-pointer font-medium"
                      style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
                    >Cambiar</button>
                  </div>
                </div>
              )}

              {isOpen && (
                <div className="px-4 pb-3">
                  {/* Alimentos */}
                  {comida.alimentos.length > 0 && (
                    <div className="mb-2">
                      <div className="grid text-xs mb-1 px-2" style={{ gridTemplateColumns: '1fr 60px 60px 50px 50px 50px 28px', color: '#4B5563' }}>
                        <span>Alimento</span><span className="text-center">g</span><span className="text-center">kcal</span>
                        <span className="text-center">prot</span><span className="text-center">carbs</span><span className="text-center">grasas</span><span />
                      </div>
                      {comida.alimentos.map(a => (
                        <div key={a.id} className="grid items-center text-xs py-1.5 px-2 rounded-lg mb-1" style={{ gridTemplateColumns: '1fr 60px 60px 50px 50px 50px 28px', background: '#1E2130' }}>
                          <span className="text-white truncate">{a.nombre}</span>
                          <span className="text-center" style={{ color: '#9CA3AF' }}>{a.gramos}</span>
                          <span className="text-center font-medium" style={{ color: '#F5611A' }}>{a.calorias}</span>
                          <span className="text-center" style={{ color: '#8B5CF6' }}>{a.proteinas}g</span>
                          <span className="text-center" style={{ color: '#3B82F6' }}>{a.carbos}g</span>
                          <span className="text-center" style={{ color: '#F59E0B' }}>{a.grasas}g</span>
                          <button onClick={() => removeAlimento(comida.id, a.id)} className="cursor-pointer flex justify-center" style={{ color: '#4B5563' }}>
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add food form */}
                  {addingTo === comida.id ? (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}>
                      <input
                        placeholder="Nombre del alimento"
                        value={newFood.nombre}
                        onChange={e => setNewFood(p => ({ ...p, nombre: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                        style={{ background: '#0D0E13', border: '1px solid #2a2d3e' }}
                      />
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { key: 'gramos', label: 'g' },
                          { key: 'calorias', label: 'kcal' },
                          { key: 'proteinas', label: 'prot' },
                          { key: 'carbos', label: 'carbs' },
                          { key: 'grasas', label: 'grasas' },
                        ].map(({ key, label }) => (
                          <input
                            key={key}
                            type="number"
                            placeholder={label}
                            value={newFood[key as keyof typeof newFood]}
                            onChange={e => setNewFood(p => ({ ...p, [key]: e.target.value }))}
                            className="px-2 py-1.5 rounded-lg text-xs text-white outline-none text-center"
                            style={{ background: '#0D0E13', border: '1px solid #2a2d3e' }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => addAlimento(comida.id)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer" style={{ background: '#F5611A' }}>
                          Añadir
                        </button>
                        <button onClick={() => setAddingTo(null)} className="px-3 py-1.5 rounded-lg text-xs cursor-pointer" style={{ background: '#2a2d3e', color: '#9CA3AF' }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTo(comida.id)}
                      className="flex items-center gap-1.5 text-xs cursor-pointer font-medium mt-1"
                      style={{ color: '#F5611A' }}
                    >
                      <Plus style={{ width: 13, height: 13 }} />
                      Añadir alimento
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <button
          onClick={addComida}
          className="w-full py-3 rounded-xl text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
          style={{ background: '#161820', border: '1px dashed #2a2d3e', color: '#6B7280' }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Añadir comida
        </button>
      </div>
    </div>
  )
}
