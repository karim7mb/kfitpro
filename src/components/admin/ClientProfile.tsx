import { useState } from 'react'
import { ArrowLeft, Dumbbell, Weight, Apple, MessageSquare, FileText } from 'lucide-react'
import { demoClients, demoRutina, demoPeso, demoNutricion, demoChat } from '../../data/demo'
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

export default function ClientProfile({ clientId, onBack, onToast }: ClientProfileProps) {
  const [activeTab, setActiveTab] = useState<Tab>('datos')
  const client = demoClients.find(c => c.id === clientId) || demoClients[0]

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
            <p className="text-sm" style={{ color: '#6B7280' }}>{client.objetivo} · {client.edad} años</p>
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
        <div className="rounded-xl p-6" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <h3 className="font-semibold text-white mb-4">Información Personal</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Nombre', value: client.nombre },
              { label: 'Edad', value: `${client.edad} años` },
              { label: 'Objetivo', value: client.objetivo },
              { label: 'Estado', value: client.activo ? 'Activo' : 'Inactivo' },
              { label: 'Peso Inicial', value: `${client.pesoInicial} kg` },
              { label: 'Semanas Activo', value: `${client.semanas} semanas` },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-lg" style={{ background: '#1E2130' }}>
                <div className="text-xs mb-1" style={{ color: '#6B7280' }}>{label}</div>
                <div className="font-medium text-white text-sm">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'rutina' && <RutinaTab rutina={demoRutina} onToast={onToast} />}
      {activeTab === 'peso' && <PesoTab pesoData={demoPeso} onToast={onToast} />}
      {activeTab === 'nutricion' && <NutricionTab nutricion={demoNutricion} />}
      {activeTab === 'chat' && <ChatTab messages={demoChat} currentUserId="admin-001" onToast={onToast} />}
      {activeTab === 'reportes' && <ReportesTab client={client} pesoData={demoPeso} nutricion={demoNutricion} onToast={onToast} />}
    </div>
  )
}
