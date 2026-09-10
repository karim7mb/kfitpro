import { Search, Plus, ChevronRight, X, Loader2, Mail } from 'lucide-react'
import { useState, useEffect } from 'react'
import { demoClients } from '../../data/demo'
import { inviteClient, fetchMisClientes, isDemoMode, type ClienteDisplay } from '../../lib/supabase'

interface ClientListProps {
  onSelectClient: (clientId: string) => void
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

interface NewClientForm {
  nombre: string
  email: string
  objetivo: string
  edad: string
  pesoInicial: string
  password: string
}

const OBJETIVOS = [
  'Definición muscular',
  'Pérdida de peso',
  'Ganancia muscular',
  'Resistencia cardiovascular',
  'Mantenimiento',
  'Rehabilitación',
]

export default function ClientList({ onSelectClient, onToast }: ClientListProps) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [clients, setClients] = useState<ClienteDisplay[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [form, setForm] = useState<NewClientForm>({
    nombre: '',
    email: '',
    objetivo: OBJETIVOS[0],
    edad: '',
    pesoInicial: '',
    password: '',
  })
  const [errors, setErrors] = useState<Partial<NewClientForm>>({})

  const loadClients = async () => {
    if (isDemoMode()) {
      setClients(demoClients.map(c => ({ ...c, email: '', id: c.id })))
      setLoadingClients(false)
      return
    }
    const data = await fetchMisClientes()
    setClients(data)
    setLoadingClients(false)
  }

  useEffect(() => { loadClients() }, [])

  const filtered = clients.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.objetivo.toLowerCase().includes(search.toLowerCase())
  )

  const validate = () => {
    const e: Partial<NewClientForm> = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email válido requerido'
    if (!form.edad || isNaN(Number(form.edad)) || Number(form.edad) < 10) e.edad = 'Edad válida requerida'
    if (!form.password || form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    return e
  }

  const handleSend = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    try {
      await inviteClient({
        email: form.email,
        nombre: form.nombre,
        objetivo: form.objetivo,
        edad: Number(form.edad),
        pesoInicial: Number(form.pesoInicial) || 0,
        password: form.password,
      })
      setSent(true)
      onToast(`Cliente ${form.nombre} creado correctamente`, 'success')
      loadClients()
    } catch {
      onToast('Error al crear el cliente. Verifica las credenciales de Supabase.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setShowModal(false)
    setSent(false)
    setForm({ nombre: '', email: '', objetivo: OBJETIVOS[0], edad: '', pesoInicial: '', password: '' })
    setErrors({})
  }

  const field = (key: keyof NewClientForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            {loadingClients ? 'Cargando...' : `${clients.length} clientes en total`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white cursor-pointer"
          style={{ background: '#F5611A' }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          Nuevo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ width: 16, height: 16, color: '#6B7280' }} />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: '#161820', border: '1px solid #1E2130' }}
        />
      </div>

      {/* List */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        {loadingClients ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#F5611A' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="text-3xl">👥</div>
            <p className="font-medium text-white">Sin clientes aún</p>
            <p className="text-sm" style={{ color: '#6B7280' }}>Crea tu primer cliente con el botón de arriba</p>
          </div>
        ) : (
          filtered.map((client, i) => (
            <button
              key={client.id}
              onClick={() => onSelectClient(client.id)}
              className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left cursor-pointer"
              style={{ borderBottom: i < filtered.length - 1 ? '1px solid #1E2130' : 'none' }}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: client.color }}
              >
                {client.iniciales}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white">{client.nombre}</div>
                <div className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
                  {client.objetivo} · {client.edad} años
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    background: client.activo ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                    color: client.activo ? '#10B981' : '#6B7280',
                  }}
                >
                  {client.activo ? 'Activo' : 'Inactivo'}
                </span>
                <ChevronRight style={{ width: 16, height: 16, color: '#4B5563' }} />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-md rounded-2xl" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid #1E2130' }}>
              <div>
                <h3 className="font-bold text-white text-lg">Nuevo Cliente</h3>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                  Crea acceso para tu cliente
                </p>
              </div>
              <button onClick={handleClose} className="cursor-pointer" style={{ color: '#6B7280' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {sent ? (
              <div className="px-6 py-8 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(16,185,129,0.15)' }}>
                  <Mail style={{ width: 26, height: 26, color: '#10B981' }} />
                </div>
                <h4 className="font-bold text-white text-lg mb-1">¡Cliente creado!</h4>
                <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
                  Comparte estas credenciales con <span className="text-white font-medium">{form.nombre}</span>
                </p>
                <div className="w-full rounded-xl p-4 text-left space-y-2 mb-4" style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: '#6B7280' }}>Web</p>
                    <p className="text-sm font-medium text-white">kfitpro.vercel.app</p>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: '#6B7280' }}>Email</p>
                    <p className="text-sm font-medium text-white">{form.email}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: '#6B7280' }}>Contraseña temporal</p>
                    <p className="text-sm font-mono font-bold" style={{ color: '#F5611A' }}>{form.password}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="px-8 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style={{ background: '#F5611A' }}
                >
                  Entendido
                </button>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#9CA3AF' }}>
                    Nombre completo <span style={{ color: '#F5611A' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Carlos Ruiz"
                    {...field('nombre')}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: '#1E2130', border: `1px solid ${errors.nombre ? '#EF4444' : '#2a2d3e'}` }}
                  />
                  {errors.nombre && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.nombre}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#9CA3AF' }}>
                    Email <span style={{ color: '#F5611A' }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="carlos@email.com"
                    {...field('email')}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: '#1E2130', border: `1px solid ${errors.email ? '#EF4444' : '#2a2d3e'}` }}
                  />
                  {errors.email && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.email}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: '#9CA3AF' }}>
                      Edad <span style={{ color: '#F5611A' }}>*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="28"
                      {...field('edad')}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                      style={{ background: '#1E2130', border: `1px solid ${errors.edad ? '#EF4444' : '#2a2d3e'}` }}
                    />
                    {errors.edad && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.edad}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: '#9CA3AF' }}>
                      Peso inicial (kg)
                    </label>
                    <input
                      type="number"
                      placeholder="80"
                      {...field('pesoInicial')}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                      style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#9CA3AF' }}>Objetivo</label>
                  <select
                    {...field('objetivo')}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none cursor-pointer"
                    style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
                  >
                    {OBJETIVOS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#9CA3AF' }}>
                    Contraseña temporal <span style={{ color: '#F5611A' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Mín. 8 caracteres"
                    {...field('password')}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none font-mono"
                    style={{ background: '#1E2130', border: `1px solid ${errors.password ? '#EF4444' : '#2a2d3e'}` }}
                  />
                  {errors.password && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.password}</p>}
                </div>

                <div className="flex gap-2.5 p-3 rounded-xl" style={{ background: 'rgba(245,97,26,0.08)', border: '1px solid rgba(245,97,26,0.2)' }}>
                  <Mail style={{ width: 15, height: 15, color: '#F5611A', flexShrink: 0, marginTop: 1 }} />
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    Comparte esta contraseña con el cliente. Podrá cambiarla desde su perfil.
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                    style={{ background: '#1E2130', color: '#9CA3AF' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer flex items-center justify-center gap-2"
                    style={{ background: loading ? '#7a3010' : '#F5611A', opacity: loading ? 0.8 : 1 }}
                  >
                    {loading
                      ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Creando...</>
                      : <><Mail style={{ width: 15, height: 15 }} /> Crear cliente</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
