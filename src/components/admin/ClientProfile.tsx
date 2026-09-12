import { useState, useEffect } from 'react'
import { ArrowLeft, Dumbbell, Weight, Apple, MessageSquare, FileText, Loader2 } from 'lucide-react'
import { demoClients, demoRutina, demoPeso, demoNutricion } from '../../data/demo'
import {
  fetchClienteData, updatePesoObjetivo,
  fetchPerfilNutricional, updatePerfilNutricional,
  fetchPerfilEntrenamiento, updatePerfilEntrenamiento,
  sendMensaje, supabase,
  isDemoMode, type ClienteDisplay, type PerfilNutricional, type PerfilEntrenamiento,
} from '../../lib/supabase'
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

const EMPTY_NUTRI: PerfilNutricional = { alergias: [], aversiones: [], preferencias: [], supermercados: [], tipoDieta: 'omnivoro', presupuesto: 'moderado', habilidadCulinaria: 'intermedio', tiempoCocina: '30min' }
const EMPTY_ENTR: PerfilEntrenamiento = { altura: 170, diasEntreno: 3, tiempoEntrenoSemana: '3-4h', tipoTrabajo: 'sentado', nivel: 'principiante', tiempoIntentando: '1-3meses', entrenadorPrevio: false, lesiones: [] }

function TagInput({ tags, onAdd, onRemove, placeholder, color }: { tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void; placeholder: string; color: string }) {
  const [input, setInput] = useState('')
  const commit = () => {
    const t = input.trim().replace(/,$/, '')
    if (t && !tags.includes(t)) onAdd(t)
    setInput('')
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: color + '20', color }}>
            {t}
            <button onClick={() => onRemove(t)} className="cursor-pointer ml-0.5 opacity-70 hover:opacity-100">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() } }}
          className="flex-1 px-3 py-2 rounded-xl text-xs text-white outline-none"
          style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
        />
        <button onClick={commit} className="px-3 py-2 rounded-xl text-xs font-medium cursor-pointer" style={{ background: '#1E2130', color: '#F5611A', border: '1px solid #2a2d3e' }}>
          Añadir
        </button>
      </div>
    </div>
  )
}

function BtnGroup<T extends string>({ options, value, onChange }: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className="flex-1 py-2 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap"
          style={{ background: value === o.v ? '#F5611A' : '#1E2130', color: value === o.v ? 'white' : '#9CA3AF', border: `1px solid ${value === o.v ? '#F5611A' : '#2a2d3e'}` }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium mb-2 block" style={{ color: '#6B7280' }}>{children}</label>
}

export default function ClientProfile({ clientId, onBack, onToast }: ClientProfileProps) {
  const [activeTab, setActiveTab] = useState<Tab>('datos')
  const [realClient, setRealClient] = useState<ClienteDisplay | null>(null)
  const [loadingClient, setLoadingClient] = useState(false)
  const [pesoObj, setPesoObj] = useState('')
  const [savingObj, setSavingObj] = useState(false)
  const [nutri, setNutri] = useState<PerfilNutricional>(EMPTY_NUTRI)
  const [savingNutri, setSavingNutri] = useState(false)
  const [entr, setEntr] = useState<PerfilEntrenamiento>(EMPTY_ENTR)
  const [savingEntr, setSavingEntr] = useState(false)
  const [sendingCheckin, setSendingCheckin] = useState(false)

  const isReal = isRealId(clientId) && !isDemoMode()

  useEffect(() => {
    if (!isReal) return
    setLoadingClient(true)
    fetchClienteData(clientId).then(data => {
      setRealClient(data)
      if (data?.pesoObjetivo) setPesoObj(String(data.pesoObjetivo))
      setLoadingClient(false)
    })
    fetchPerfilNutricional(clientId).then(p => { if (p) setNutri({ ...EMPTY_NUTRI, ...p }) })
    fetchPerfilEntrenamiento(clientId).then(p => { if (p) setEntr({ ...EMPTY_ENTR, ...p }) })
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
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ background: client.color }}>
            {client.iniciales}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{client.nombre}</h1>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {client.objetivo} · {client.edad} años
              {client.email && <span className="ml-2">· {client.email}</span>}
            </p>
          </div>
          <span className="ml-auto text-sm px-3 py-1 rounded-full font-medium" style={{ background: client.activo ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: client.activo ? '#10B981' : '#6B7280' }}>
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
            style={{ background: activeTab === id ? '#F5611A' : '#161820', color: activeTab === id ? 'white' : '#6B7280', border: '1px solid', borderColor: activeTab === id ? '#F5611A' : '#1E2130' }}
          >
            <Icon style={{ width: 14, height: 14 }} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'datos' && (
        <div className="space-y-4">

          {/* Información Personal */}
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

          {/* Peso objetivo */}
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
                    try { await updatePesoObjetivo(clientId, val); onToast('Peso objetivo guardado', 'success') }
                    catch { onToast('Error al guardar', 'error') }
                    finally { setSavingObj(false) }
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

          {/* Perfil Nutricional */}
          {isReal && (
            <div className="rounded-xl p-5 space-y-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">🥗 Perfil Nutricional</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>La IA usará estos datos para personalizar el plan de alimentación</p>
                </div>
                <button
                  onClick={async () => {
                    setSavingNutri(true)
                    try { await updatePerfilNutricional(clientId, nutri); onToast('Perfil nutricional guardado', 'success') }
                    catch { onToast('Error al guardar', 'error') }
                    finally { setSavingNutri(false) }
                  }}
                  disabled={savingNutri}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style={{ background: '#F5611A', opacity: savingNutri ? 0.6 : 1 }}
                >
                  {savingNutri ? '...' : 'Guardar'}
                </button>
              </div>

              <div>
                <SectionLabel>Tipo de dieta</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {(['omnivoro', 'vegetariano', 'vegano', 'pescatariano', 'sin_gluten', 'halal', 'kosher'] as const).map(t => (
                    <button key={t} onClick={() => setNutri(p => ({ ...p, tipoDieta: t }))}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                      style={{ background: nutri.tipoDieta === t ? '#F5611A' : '#1E2130', color: nutri.tipoDieta === t ? 'white' : '#9CA3AF', border: `1px solid ${nutri.tipoDieta === t ? '#F5611A' : '#2a2d3e'}` }}>
                      {{ omnivoro: 'Omnívoro', vegetariano: 'Vegetariano', vegano: 'Vegano', pescatariano: 'Pescatariano', sin_gluten: 'Sin gluten', halal: 'Halal', kosher: 'Kosher' }[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>Presupuesto</SectionLabel>
                <BtnGroup
                  options={[{ v: 'economico', label: '💰 Económico' }, { v: 'moderado', label: '💳 Moderado' }, { v: 'premium', label: '✨ Premium' }]}
                  value={nutri.presupuesto}
                  onChange={v => setNutri(p => ({ ...p, presupuesto: v }))}
                />
              </div>

              <div>
                <SectionLabel>Habilidad culinaria</SectionLabel>
                <BtnGroup
                  options={[{ v: 'principiante', label: '🥄 Principiante' }, { v: 'intermedio', label: '🍳 Intermedio' }, { v: 'avanzado', label: '👨‍🍳 Avanzado' }]}
                  value={nutri.habilidadCulinaria}
                  onChange={v => setNutri(p => ({ ...p, habilidadCulinaria: v }))}
                />
              </div>

              <div>
                <SectionLabel>Tiempo disponible para cocinar al día</SectionLabel>
                <BtnGroup
                  options={[{ v: '15min', label: '⚡ 15 min' }, { v: '30min', label: '🕐 30 min' }, { v: '1hora', label: '🕑 1 hora' }, { v: 'mas1hora', label: '🍽️ +1 hora' }]}
                  value={nutri.tiempoCocina}
                  onChange={v => setNutri(p => ({ ...p, tiempoCocina: v }))}
                />
              </div>

              <div>
                <SectionLabel>Alergias / intolerancias</SectionLabel>
                <TagInput
                  tags={nutri.alergias}
                  onAdd={t => setNutri(p => ({ ...p, alergias: [...p.alergias, t] }))}
                  onRemove={t => setNutri(p => ({ ...p, alergias: p.alergias.filter(x => x !== t) }))}
                  placeholder="Ej: lactosa, gluten, frutos secos…"
                  color="#EF4444"
                />
              </div>

              <div>
                <SectionLabel>Alimentos que no le gustan (aversiones)</SectionLabel>
                <TagInput
                  tags={nutri.aversiones}
                  onAdd={t => setNutri(p => ({ ...p, aversiones: [...p.aversiones, t] }))}
                  onRemove={t => setNutri(p => ({ ...p, aversiones: p.aversiones.filter(x => x !== t) }))}
                  placeholder="Ej: hígado, col, berenjenas…"
                  color="#F97316"
                />
              </div>

              <div>
                <SectionLabel>Alimentos / comidas que le gustan (preferencias)</SectionLabel>
                <TagInput
                  tags={nutri.preferencias ?? []}
                  onAdd={t => setNutri(p => ({ ...p, preferencias: [...(p.preferencias ?? []), t] }))}
                  onRemove={t => setNutri(p => ({ ...p, preferencias: (p.preferencias ?? []).filter(x => x !== t) }))}
                  placeholder="Ej: arroz, pollo, pasta, huevos…"
                  color="#10B981"
                />
              </div>

              <div>
                <SectionLabel>Supermercados habituales</SectionLabel>
                <TagInput
                  tags={nutri.supermercados ?? []}
                  onAdd={t => setNutri(p => ({ ...p, supermercados: [...(p.supermercados ?? []), t] }))}
                  onRemove={t => setNutri(p => ({ ...p, supermercados: (p.supermercados ?? []).filter(x => x !== t) }))}
                  placeholder="Ej: Mercadona, Lidl, Carrefour…"
                  color="#8B5CF6"
                />
              </div>
            </div>
          )}

          {/* Perfil de Entrenamiento */}
          {isReal && (
            <div className="rounded-xl p-5 space-y-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">🏋️ Perfil de Entrenamiento</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Información física y de estilo de vida del cliente</p>
                </div>
                <button
                  onClick={async () => {
                    setSavingEntr(true)
                    try { await updatePerfilEntrenamiento(clientId, entr); onToast('Perfil de entrenamiento guardado', 'success') }
                    catch { onToast('Error al guardar', 'error') }
                    finally { setSavingEntr(false) }
                  }}
                  disabled={savingEntr}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style={{ background: '#F5611A', opacity: savingEntr ? 0.6 : 1 }}
                >
                  {savingEntr ? '...' : 'Guardar'}
                </button>
              </div>

              <div>
                <SectionLabel>Altura (cm)</SectionLabel>
                <input
                  type="number"
                  value={entr.altura || ''}
                  onChange={e => setEntr(p => ({ ...p, altura: parseInt(e.target.value) || 0 }))}
                  placeholder="Ej: 175"
                  className="w-32 px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
                />
              </div>

              <div>
                <SectionLabel>Días disponibles para entrenar a la semana</SectionLabel>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map(d => (
                    <button key={d} onClick={() => setEntr(p => ({ ...p, diasEntreno: d }))}
                      className="w-12 h-10 rounded-lg text-sm font-bold cursor-pointer"
                      style={{ background: entr.diasEntreno === d ? '#F5611A' : '#1E2130', color: entr.diasEntreno === d ? 'white' : '#9CA3AF', border: `1px solid ${entr.diasEntreno === d ? '#F5611A' : '#2a2d3e'}` }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>Tiempo disponible para entrenar a la semana</SectionLabel>
                <BtnGroup
                  options={[{ v: '1-2h', label: '1-2 h' }, { v: '3-4h', label: '3-4 h' }, { v: '5-7h', label: '5-7 h' }, { v: 'mas7h', label: '+7 h' }]}
                  value={entr.tiempoEntrenoSemana}
                  onChange={v => setEntr(p => ({ ...p, tiempoEntrenoSemana: v }))}
                />
              </div>

              <div>
                <SectionLabel>Tipo de trabajo</SectionLabel>
                <BtnGroup
                  options={[{ v: 'sentado', label: '💻 Sentado (oficina)' }, { v: 'mixto', label: '🔄 Mixto' }, { v: 'activo', label: '🏃 Activo (de pie)' }]}
                  value={entr.tipoTrabajo}
                  onChange={v => setEntr(p => ({ ...p, tipoTrabajo: v }))}
                />
              </div>

              <div>
                <SectionLabel>Nivel de entrenamiento</SectionLabel>
                <BtnGroup
                  options={[{ v: 'principiante', label: '🌱 Principiante' }, { v: 'intermedio', label: '💪 Intermedio' }, { v: 'avanzado', label: '🏆 Avanzado' }]}
                  value={entr.nivel}
                  onChange={v => setEntr(p => ({ ...p, nivel: v }))}
                />
              </div>

              <div>
                <SectionLabel>¿Cuánto tiempo lleva intentando el cambio físico?</SectionLabel>
                <BtnGroup
                  options={[{ v: 'menos1mes', label: '< 1 mes' }, { v: '1-3meses', label: '1-3 meses' }, { v: '3-12meses', label: '3-12 meses' }, { v: 'mas1año', label: '+1 año' }]}
                  value={entr.tiempoIntentando}
                  onChange={v => setEntr(p => ({ ...p, tiempoIntentando: v }))}
                />
              </div>

              <div>
                <SectionLabel>¿Ha tenido entrenador personal antes?</SectionLabel>
                <div className="flex gap-2">
                  {[{ v: true, label: '✅ Sí' }, { v: false, label: '❌ No' }].map(o => (
                    <button key={String(o.v)} onClick={() => setEntr(p => ({ ...p, entrenadorPrevio: o.v }))}
                      className="px-6 py-2 rounded-lg text-sm font-medium cursor-pointer"
                      style={{ background: entr.entrenadorPrevio === o.v ? '#F5611A' : '#1E2130', color: entr.entrenadorPrevio === o.v ? 'white' : '#9CA3AF', border: `1px solid ${entr.entrenadorPrevio === o.v ? '#F5611A' : '#2a2d3e'}` }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>Lesiones / limitaciones físicas</SectionLabel>
                <p className="text-xs mb-2" style={{ color: '#6B7280' }}>La IA excluirá ejercicios que puedan agravar estas lesiones</p>
                <TagInput
                  tags={entr.lesiones ?? []}
                  onAdd={t => setEntr(p => ({ ...p, lesiones: [...(p.lesiones ?? []), t] }))}
                  onRemove={t => setEntr(p => ({ ...p, lesiones: (p.lesiones ?? []).filter(x => x !== t) }))}
                  placeholder="Ej: rodilla derecha, lumbar, hombro izquierdo…"
                  color="#EF4444"
                />
              </div>
            </div>
          )}

          {/* Check-in semanal */}
          {isReal && (
            <div className="rounded-xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">📋 Check-in semanal</h3>
                  <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                    Envía 5 preguntas al cliente por chat para hacer seguimiento semanal.<br />
                    El cliente responde y tú ves las respuestas en la pestaña Chat.
                  </p>
                </div>
                <button
                  disabled={sendingCheckin}
                  onClick={async () => {
                    setSendingCheckin(true)
                    try {
                      const { data: { user } } = await supabase.auth.getUser()
                      if (!user) throw new Error('Sin sesión')
                      const msg = `📋 *CHECK-IN SEMANAL*\n\nHola ${client.nombre}, responde brevemente estas preguntas:\n\n1️⃣ Del 1 al 10, ¿cómo has seguido el plan de alimentación esta semana?\n2️⃣ Del 1 al 10, ¿cómo te has sentido de energía y rendimiento?\n3️⃣ ¿Cuántas horas de sueño has dormido de media?\n4️⃣ ¿Cuántos entrenamientos has completado esta semana?\n5️⃣ ¿Cuál es tu peso actual? (kg)\n\n¡Gracias! 💪`
                      await sendMensaje(user.id, clientId, msg)
                      onToast('Check-in enviado al cliente ✓', 'success')
                    } catch {
                      onToast('Error al enviar el check-in', 'error')
                    } finally {
                      setSendingCheckin(false)
                    }
                  }}
                  className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style={{ background: '#F5611A', opacity: sendingCheckin ? 0.6 : 1 }}
                >
                  {sendingCheckin ? '...' : 'Enviar check-in'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rutina' && <RutinaTab rutina={demoRutina} clientId={isReal ? clientId : undefined} onToast={onToast} />}
      {activeTab === 'peso' && <PesoTab pesoData={demoPeso} clientId={isReal ? clientId : undefined} onToast={onToast} />}
      {activeTab === 'nutricion' && <NutricionTab clientId={clientId} onToast={onToast} />}
      {activeTab === 'chat' && (
        <ChatTab clientId={clientId} clienteNombre={client.nombre} clienteColor={client.color} clienteIniciales={client.iniciales} onToast={onToast} />
      )}
      {activeTab === 'reportes' && (
        <ReportesTab
          client={{ nombre: client.nombre, cumplimiento: client.cumplimiento, semanas: client.semanas, pesoInicial: client.pesoInicial }}
          pesoData={demoPeso} nutricion={demoNutricion} onToast={onToast}
        />
      )}
    </div>
  )
}
