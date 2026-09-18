import { useState } from 'react'
import { Menu, X, Zap, LayoutDashboard, Users, Dumbbell, MessageSquare, LogOut } from 'lucide-react'
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

const navItems = [
  { id: 'dashboard' as AdminPage, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clientes' as AdminPage, label: 'Clientes', icon: Users },
  { id: 'ejercicios' as AdminPage, label: 'Ejercicios', icon: Dumbbell },
  { id: 'chat' as AdminPage, label: 'Chat', icon: MessageSquare },
]

export default function AdminPage({ user, onLogout, onToast }: AdminPageProps) {
  const [page, setPage] = useState<AdminPage>('dashboard')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

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
    setDrawerOpen(false)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0D0E13' }}>
      {/* Desktop sidebar */}
      <Sidebar user={user} currentPage={page} onNavigate={handleNavigate} onLogout={onLogout} />

      {/* Mobile top bar */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3"
        style={{ background: '#161820', borderBottom: '1px solid #1E2130' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F5611A' }}>
            <Zap className="text-white fill-white" style={{ width: 14, height: 14 }} />
          </div>
          <span className="font-bold text-white">KFitPro</span>
          <span className="text-xs ml-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,97,26,0.15)', color: '#F5611A' }}>Admin</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-1.5 rounded-lg cursor-pointer"
          style={{ color: '#9CA3AF' }}
        >
          <Menu style={{ width: 22, height: 22 }} />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-30"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="h-full w-64 flex flex-col"
            style={{ background: '#161820', borderRight: '1px solid #1E2130' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1E2130' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#F5611A' }}>
                  <Zap className="text-white fill-white" style={{ width: 14, height: 14 }} />
                </div>
                <span className="font-bold text-white">KFitPro</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1 cursor-pointer" style={{ color: '#6B7280' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* User info */}
            <div className="mx-4 mt-4 mb-5 p-3 rounded-xl" style={{ background: '#1E2130' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: '#F5611A' }}
                >
                  {user.nombre.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{user.nombre}</div>
                  <div className="text-xs" style={{ color: '#F5611A' }}>Admin</div>
                </div>
              </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 space-y-1">
              {navItems.map(({ id, label, icon: Icon }) => {
                const active = page === id
                return (
                  <button
                    key={id}
                    onClick={() => handleNavigate(id)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all"
                    style={{
                      background: active ? 'rgba(245,97,26,0.15)' : 'transparent',
                      color: active ? '#F5611A' : '#9CA3AF',
                    }}
                  >
                    <Icon style={{ width: 18, height: 18 }} />
                    {label}
                  </button>
                )
              })}
            </nav>

            {/* Logout */}
            <div className="p-3 pb-6">
              <button
                onClick={() => { setDrawerOpen(false); onLogout() }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium cursor-pointer"
                style={{ color: '#6B7280' }}
              >
                <LogOut style={{ width: 18, height: 18 }} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8 overflow-auto min-w-0">
        {renderContent()}
      </main>
    </div>
  )
}
