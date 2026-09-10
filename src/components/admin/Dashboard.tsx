import { useEffect, useState } from 'react'
import { Users, Calendar, MessageSquare, TrendingUp, ChevronRight, Loader2 } from 'lucide-react'
import { demoClients } from '../../data/demo'
import { fetchMisClientes, isDemoMode, type ClienteDisplay } from '../../lib/supabase'

interface DashboardProps {
  onSelectClient: (clientId: string) => void
}

const stats = [
  { label: 'Sesiones Esta Semana', value: '—', icon: Calendar, color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  { label: 'Mensajes Sin Leer', value: '—', icon: MessageSquare, color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  { label: 'Cumplimiento Promedio', value: '—', icon: TrendingUp, color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
]

export default function Dashboard({ onSelectClient }: DashboardProps) {
  const [clients, setClients] = useState<ClienteDisplay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode()) {
      setClients(demoClients.map(c => ({ ...c, email: '', id: c.id })))
      setLoading(false)
      return
    }
    fetchMisClientes().then(data => {
      setClients(data)
      setLoading(false)
    })
  }, [])

  const activeCount = clients.filter(c => c.activo).length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Resumen general de tu actividad</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl p-4" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: '#6B7280' }}>Clientes Activos</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,97,26,0.15)' }}>
              <Users style={{ width: 16, height: 16, color: '#F5611A' }} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? <Loader2 className="animate-spin" style={{ width: 20, height: 20, color: '#F5611A' }} /> : activeCount}
          </div>
        </div>
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: '#6B7280' }}>{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon style={{ width: 16, height: 16, color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Recent clients */}
      <div className="rounded-xl" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1E2130' }}>
          <h2 className="font-semibold text-white">Clientes Recientes</h2>
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#1E2130', color: '#9CA3AF' }}>
            {loading ? '...' : `${clients.length} total`}
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#F5611A' }} />
          </div>
        ) : clients.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2">
            <p className="font-medium text-white">Sin clientes aún</p>
            <p className="text-sm" style={{ color: '#6B7280' }}>Ve a la sección Clientes para añadir el primero</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#1E2130' }}>
            {clients.slice(0, 5).map(client => (
              <button
                key={client.id}
                onClick={() => onSelectClient(client.id)}
                className="w-full px-5 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: client.color }}
                >
                  {client.iniciales}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm">{client.nombre}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{client.objetivo}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
