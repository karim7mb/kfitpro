import { useState, useEffect } from 'react'
import { ArrowLeft, Dumbbell, Weight, Apple, MessageSquare, FileText, Loader2 } from 'lucide-react'
import { demoClients, demoRutina, demoPeso, demoNutricion } from '../../data/demo'
import { fetchClienteData, updatePesoObjetivo, fetchPerfilNutricional, updatePerfilNutricional, isDemoMode, type ClienteDisplay, type PerfilNutricional } from '../../lib/supabase'
import RutinaTab from './tabs/RutinaTab'
import PesoTab from './tabs/PesoTab'
import NutricionTab from './tabs/NutricionTab'
import ChatTab from './tabs/ChatTab'
import ReportesTab from './tabs/ReportesTab'

type Tab = 'datos' | 'rutina' | 'peso' | 'nutricion' | 'chat' | 'reportes'

interface ClientProfileProps {
  clientId: string
  onBack: () => void
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }[] = [
  { id: 'datos', label: 'Datos', icon: ({ style }) => <span style={style}>👤</span> },
  { id: 'rutina', label: 'Rutina', icon: Dumbbell },
  { id: 'peso', label: 'Peso', icon: Weight },
  { id: 'nutricion', label: 'Nutrición', icon: Apple },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'reportes', label: 'Reportes', icon: FileText },
]

const isRealId = (id: string) => !id.startsWith('client-') && !id.startsWith('admin-')

export default function ClientProfile({ clientId, onBack, onToast }: ClientProfileProps) {
  const [activeTab, setActiveTab] = useState<Tab>('datos')
  const [realClient, setRealClient] = useState<ClienteDisplay | null>(null)
  const [loadingClient, setLoadingClient] = useState(false)
  const [pesoObj, setPesoObj] = useState('')
  const [savingObj, setSavingObj] = useState(false)
  const [perfil, setPerfil] = useState<PerfilNutricional>({ alergias: [], aversiones: [], preferencias: [], tipoDieta: 'omnivoro', presupuesto: 'moderado', habilidadCulinaria: 'intermedio' })
  const [savingPerfil, setSavingPerfil] = useState(false)
  const [alergiasInput, setAlergiasInput] = useState('')
  const [aversionesInput, setAversionesInput] = useState('')
  const [preferenciasInput, setPreferenciasInput] = useState('')

  const isReal = isRealId(clientId) && !isDemoMode()

  useEffect(() => {
    if (!isReal) return
    setLoadingClient(true)
    fetchClienteData(clientId).then(data => {
      setRealClient(data)
      if (data?.pesoObjetivo) setPesoObj(String(data.pesoObjetivo))
      setLoadingClient(false)
    })
    fetchPerfilNutricional(clientId).then(p => {
      if (p) setPerfil(p)
    })
  }, [clientId, isReal])

  const demoClient = demoClients.find(c => c.id === clientId) || demoClients[0]
  const client: ClienteDisplay = isReal
    ? (realClient ?? { id: clientId, nombre: '...', email: '', objetivo: '', edad: 0, pesoInicial: 0, activo: true, iniciales: '..', color: '#F5611A', semanas: 0, cumplimiento: 0 })
    : { ...demoClient, email: '' }

  if (loadingClient) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin" style={{ width: 28, height: 28, color: '#F5611A' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm mb-4 cursor-pointer transition-colors"
          style={{ color: '#6B7280' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#F5611A')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Volver a Clientes
        </button>
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white"
            style={{ background: client.color }}
          >
            {client.iniciales}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{client.nombre}</h1>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {client.objetivo} · {client.edad} años
              {client.email && <span className="ml-2">· {client.email}</span>}
            </p>
          </div>
          <span
            className="ml-auto text-sm px-3 py-1 rounded-full font-medium"
            style={{
              background: client.activo ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
              color: client.activo ? '#10B981' : '#6B7280',
            }}
          >
            {client.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer"
            style={{
              background: activeTab === id ? '#F5611A' : '#161820',
              color: activeTab === id ? 'white' : '#6B7280',
              border: '1px solid',
              borderColor: activeTab === id ? '#F5611A' : '#1E2130',
            }}
          >
            <Icon style={{ width: 14, height: 14 }} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'datos' && (
        <div className="space-y-4">
          <div className="rounded-xl p-6" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <h3 className="font-semibold text-white mb-4">Información Personal</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Nombre', value: client.nombre },
                { label: 'Edad', value: `${client.edad} años` },
                { label: 'Objetivo', value: client.objetivo || '—' },
                { label: 'Estado', value: client.activo ? 'Activo' : 'Inactivo' },
                { label: 'Peso Inicial', value: client.pesoInicial ? `${client.pesoInicial} kg` : '—' },
                { label: 'Semanas Activo', value: `${client.semanas} semanas` },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-lg" style={{ background: '#1E2130' }}>
                  <div className="text-xs mb-1" style={{ color: '#6B7280' }}>{label}</div>
                  <div className="font-medium text-white text-sm">{value}</div>
                </div>
              ))}
            </div>
          </div>
          {isReal && (
            <div className="rounded-xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
              <h3 className="font-semibold text-white mb-3">Peso objetivo</h3>
              <p className="text-xs mb-3" style={{ color: '#6B7280' }}>El cliente verá su progreso hacia este objetivo en la app</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Ej: 75"
                  value={pesoObj}
                  onChange={e => setPesoObj(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
                />
                <span className="flex items-center text-sm" style={{ color: '#6B7280' }}>kg</span>
                <button
                  onClick={async () => {
                    const val = parseFloat(pesoObj)
                    if (!val) return
                    setSavingObj(true)
                    try {
                      await updatePesoObjetivo(clientId, val)
                      onToast('Peso objetivo guardado', 'success')
                    } catch {
                      onToast('Error al guardar', 'error')
                    } finally { setSavingObj(false) }
                  }}
                  disabled={savingObj || !pesoObj}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style={{ background: '#F5611A', opacity: savingObj || !pesoObj ? 0.6 : 1 }}
                >
                  {savingObj ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}
          {isReal && (
            <div className="rounded-xl p-5 space-y-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Perfil Nutricional</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>La IA usará estos datos para personalizar el plan de alimentación</p>
                </div>
                <button
                  onClick={async () => {
                    setSavingPerfil(true)
                    try {
                      await updatePerfilNutricional(clientId, perfil)
                      onToast('Perfil nutricional guardado', 'success')
                    } catch {
                      onToast('Error al guardar', 'error')
                    } finally { setSavingPerfil(false) }
                  }}
                  disabled={savingPerfil}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style={{ background: '#F5611A', opacity: savingPerfil ? 0.6 : 1 }}
                >
                  {savingPerfil ? '...' : 'Guardar'}
                </button>
              </div>

              {/* Tipo de dieta */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#6B7280' }}>Tipo de dieta</label>
                <div className="flex flex-wrap gap-2">
                  {(['omnivoro', 'vegetariano', 'vegano', 'pescatariano', 'sin_gluten', 'halal', 'kosher'] as const).map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => setPerfil(p => ({ ...p, tipoDieta: tipo }))}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
                      style={{
                        background: perfil.tipoDieta === tipo ? '#F5611A' : '#1E2130',
                        color: perfil.tipoDieta === tipo ? 'white' : '#9CA3AF',
                        border: `1px solid ${perfil.tipoDieta === tipo ? '#F5611A' : '#2a2d3e'}`,
                      }}
                    >
                      {{ omnivoro: 'Omnívoro', vegetariano: 'Vegetariano', vegano: 'Vegano', pescatariano: 'Pescatariano', sin_gluten: 'Sin gluten', halal: 'Halal', kosher: 'Kosher' }[tipo]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Presupuesto */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#6B7280' }}>Presupuesto</label>
                <div className="flex gap-2">
                  {(['economico', 'moderado', 'premium'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPerfil(prev => ({ ...prev, presupuesto: p }))}
                      className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all"
                      style={{
                        background: perfil.presupuesto === p ? '#F5611A' : '#1E2130',
                        color: perfil.presupuesto === p ? 'white' : '#9CA3AF',
                        border: `1px solid ${perfil.presupuesto === p ? '#F5611A' : '#2a2d3e'}`,
                      }}
                    >
                      {{ economico: '💰 Económico', moderado: '💳 Moderado', premium: '✨ Premium' }[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Habilidad culinaria */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#6B7280' }}>Habilidad culinaria</label>
                <div className="flex gap-2">
                  {(['principiante', 'intermedio', 'avanzado'] as const).map(h => (
                    <button
                      key={h}
                      onClick={() => setPerfil(prev => ({ ...prev, habilidadCulinaria: h }))}
                      className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all"
                      style={{
                        background: perfil.habilidadCulinaria === h ? '#F5611A' : '#1E2130',
                        color: perfil.habilidadCulinaria === h ? 'white' : '#9CA3AF',
                        border: `1px solid ${perfil.habilidadCulinaria === h ? '#F5611A' : '#2a2d3e'}`,
                      }}
                    >
                      {{ principiante: '🥄 Principiante', intermedio: '🍳 Intermedio', avanzado: '👨‍🍳 Avanzado' }[h]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alergias */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#6B7280' }}>Alergias / intolerancias</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {perfil.alergias.map(a => (
                    <span key={a} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171' }}>
                      {a}
                      <button onClick={() => setPerfil(p => ({ ...p, alergias: p.alergias.filter(x => x !== a) }))} className="cursor-pointer ml-0.5 opacity-70 hover:opacity-100">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: lactosa, gluten, frutos secos…"
                    value={alergiasInput}
                    onChange={e => setAlergiasInput(e.target.value)}
                    onKeyDown={e => {
                      if ((e.key === 'Enter' || e.key === ',') && alergiasInput.trim()) {
                        e.preventDefault()
                        const tag = alergiasInput.trim().replace(/,$/, '')
                        if (tag && !perfil.alergias.includes(tag)) setPerfil(p => ({ ...p, alergias: [...p.alergias, tag] }))
                        setAlergiasInput('')
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl text-xs text-white outline-none"
                    style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
                  />
                  <button
                    onClick={() => {
                      const tag = alergiasInput.trim()
                      if (tag && !perfil.alergias.includes(tag)) setPerfil(p => ({ ...p, alergias: [...p.alergias, tag] }))
                      setAlergiasInput('')
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                    style={{ background: '#1E2130', color: '#F5611A', border: '1px solid #2a2d3e' }}
                  >
                    Añadir
                  </button>
                </div>
              </div>

              {/* Aversiones */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#6B7280' }}>Aversiones (alimentos que no le gustan)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {perfil.aversiones.map(a => (
                    <span key={a} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(245,97,26,0.12)', color: '#F97316' }}>
                      {a}
                      <button onClick={() => setPerfil(p => ({ ...p, aversiones: p.aversiones.filter(x => x !== a) }))} className="cursor-pointer ml-0.5 opacity-70 hover:opacity-100">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: hígado, col, berenjenas…"
                    value={aversionesInput}
                    onChange={e => setAversionesInput(e.target.value)}
                    onKeyDown={e => {
                      if ((e.key === 'Enter' || e.key === ',') && aversionesInput.trim()) {
                        e.preventDefault()
                        const tag = aversionesInput.trim().replace(/,$/, '')
                        if (tag && !perfil.aversiones.includes(tag)) setPerfil(p => ({ ...p, aversiones: [...p.aversiones, tag] }))
                        setAversionesInput('')
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl text-xs text-white outline-none"
                    style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
                  />
                  <button
                    onClick={() => {
                      const tag = aversionesInput.trim()
                      if (tag && !perfil.aversiones.includes(tag)) setPerfil(p => ({ ...p, aversiones: [...p.aversiones, tag] }))
                      setAversionesInput('')
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                    style={{ background: '#1E2130', color: '#F5611A', border: '1px solid #2a2d3e' }}
                  >
                    Añadir
                  </button>
                </div>
              </div>

              {/* Preferencias */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#6B7280' }}>Preferencias (alimentos/comidas que le gustan)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(perfil.preferencias ?? []).map(a => (
                    <span key={a} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                      {a}
                      <button onClick={() => setPerfil(p => ({ ...p, preferencias: (p.preferencias ?? []).filter(x => x !== a) }))} className="cursor-pointer ml-0.5 opacity-70 hover:opacity-100">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: arroz, pollo, pasta, huevos…"
                    value={preferenciasInput}
                    onChange={e => setPreferenciasInput(e.target.value)}
                    onKeyDown={e => {
                      if ((e.key === 'Enter' || e.key === ',') && preferenciasInput.trim()) {
                        e.preventDefault()
                        const tag = preferenciasInput.trim().replace(/,$/, '')
                        if (tag && !(perfil.preferencias ?? []).includes(tag)) setPerfil(p => ({ ...p, preferencias: [...(p.preferencias ?? []), tag] }))
                        setPreferenciasInput('')
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl text-xs text-white outline-none"
                    style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
                  />
                  <button
                    onClick={() => {
                      const tag = preferenciasInput.trim()
                      if (tag && !(perfil.preferencias ?? []).includes(tag)) setPerfil(p => ({ ...p, preferencias: [...(p.preferencias ?? []), tag] }))
                      setPreferenciasInput('')
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                    style={{ background: '#1E2130', color: '#F5611A', border: '1px solid #2a2d3e' }}
                  >
                    Añadir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'rutina' && (
        <RutinaTab
          rutina={demoRutina}
          clientId={isReal ? clientId : undefined}
          onToast={onToast}
        />
      )}
      {activeTab === 'peso' && (
        <PesoTab
          pesoData={demoPeso}
          clientId={isReal ? clientId : undefined}
          onToast={onToast}
        />
      )}
      {activeTab === 'nutricion' && <NutricionTab clientId={clientId} onToast={onToast} />}
      {activeTab === 'chat' && (
        <ChatTab
          clientId={clientId}
          clienteNombre={client.nombre}
          clienteColor={client.color}
          clienteIniciales={client.iniciales}
          onToast={onToast}
        />
      )}
      {activeTab === 'reportes' && (
        <ReportesTab
          client={{ nombre: client.nombre, cumplimiento: client.cumplimiento, semanas: client.semanas, pesoInicial: client.pesoInicial }}
          pesoData={demoPeso}
          nutricion={demoNutricion}
          onToast={onToast}
        />
      )}
    </div>
  )
}
