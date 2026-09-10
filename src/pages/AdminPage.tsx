import { useState } from 'react'
import type { AppUser } from '../lib/supabase'
import Sidebar from '../components/shared/Sidebar'
import Dashboard from '../components/admin/Dashboard'
import ClientList from '../components/admin/ClientList'
import ClientProfile from '../components/admin/ClientProfile'
import EjerciciosLibrary from '../components/admin/EjerciciosLibrary'
import ChatGeneral from '../components/admin/ChatGeneral'

type AdminPage = 'dashboard' | 'clientes' | 'ejercicios' | 'chat'

interface AdminPageProps {
  user: AppUser
  onLogout: () => void
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

export default function AdminPage({ user, onLogout, onToast }: AdminPageProps) {
  const [page, setPage] = useState<AdminPage>('dashboard')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  const handleSelectClient = (id: string) => {
    setSelectedClientId(id)
    setPage('clientes')
  }

  const renderContent = () => {
    if (page === 'dashboard') return <Dashboard onSelectClient={handleSelectClient} />
    if (page === 'clientes') {
      if (selectedClientId) {
        return (
          <ClientProfile
            clientId={selectedClientId}
            onBack={() => setSelectedClientId(null)}
            onToast={onToast}
          />
        )
      }
      return <ClientList onSelectClient={setSelectedClientId} onToast={onToast} />
    }
    if (page === 'ejercicios') return <EjerciciosLibrary onToast={onToast} />
    if (page === 'chat') return <ChatGeneral onToast={onToast} />
    return null
  }

  const handleNavigate = (p: AdminPage) => {
    setPage(p)
    if (p !== 'clientes') setSelectedClientId(null)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0D0E13' }}>
      <Sidebar user={user} currentPage={page} onNavigate={handleNavigate} onLogout={onLogout} />
      <main className="flex-1 ml-64 p-8 overflow-auto">
        {renderContent()}
      </main>
    </div>
  )
}
