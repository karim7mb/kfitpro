import { Zap, LayoutDashboard, Users, Dumbbell, MessageSquare, LogOut } from 'lucide-react'
import type { AppUser } from '../../lib/supabase'

type AdminPage = 'dashboard' | 'clientes' | 'ejercicios' | 'chat'

interface SidebarProps {
  user: AppUser
  currentPage: AdminPage
  onNavigate: (page: AdminPage) => void
  onLogout: () => void
}

const navItems = [
  { id: 'dashboard' as AdminPage, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clientes' as AdminPage, label: 'Clientes', icon: Users },
  { id: 'ejercicios' as AdminPage, label: 'Ejercicios', icon: Dumbbell },
  { id: 'chat' as AdminPage, label: 'Chat', icon: MessageSquare },
]

export default function Sidebar({ user, currentPage, onNavigate, onLogout }: SidebarProps) {
  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 flex flex-col z-10"
      style={{ background: '#161820', borderRight: '1px solid #1E2130' }}
    >
      {/* Logo */}
      <div className="px-6 py-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F5611A' }}>
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        <span className="text-lg font-bold text-white">KFitPro</span>
      </div>

      {/* User info */}
      <div className="mx-4 mb-6 p-3 rounded-xl" style={{ background: '#1E2130' }}>
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

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer"
              style={{
                background: active ? 'rgba(245,97,26,0.15)' : 'transparent',
                color: active ? '#F5611A' : '#9CA3AF',
              }}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer"
          style={{ color: '#6B7280' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B7280'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <LogOut className="flex-shrink-0" style={{ width: 18, height: 18 }} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
