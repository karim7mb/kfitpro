import { useState } from 'react'
import type { AppUser } from '../lib/supabase'
import BottomNav from '../components/client/BottomNav'
import MiRutina from '../components/client/MiRutina'
import MiPeso from '../components/client/MiPeso'
import MiNutricion from '../components/client/MiNutricion'
import MiChat from '../components/client/MiChat'

type ClientTab = 'rutina' | 'peso' | 'nutricion' | 'chat'

interface ClientPageProps {
  user: AppUser
  onLogout: () => void
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

export default function ClientPage({ user, onLogout, onToast }: ClientPageProps) {
  const [tab, setTab] = useState<ClientTab>('rutina')

  return (
    <div className="min-h-screen" style={{ background: '#0D0E13', maxWidth: 480, margin: '0 auto' }}>
      {/* Top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3"
        style={{ background: '#0D0E13', borderBottom: '1px solid #1E2130', maxWidth: 480, margin: '0 auto' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#F5611A' }}>
            <span className="text-white font-bold text-xs">⚡</span>
          </div>
          <span className="font-bold text-white text-sm">KFitPro</span>
        </div>
        <button
          onClick={onLogout}
          className="text-xs cursor-pointer"
          style={{ color: '#6B7280' }}
        >
          Salir
        </button>
      </div>

      {/* Content */}
      <div className="pt-14">
        {tab === 'rutina' && <MiRutina userName={user.nombre} onToast={onToast} />}
        {tab === 'peso' && <MiPeso onToast={onToast} />}
        {tab === 'nutricion' && <MiNutricion onToast={onToast} />}
        {tab === 'chat' && <MiChat userName={user.nombre} onToast={onToast} />}
      </div>

      <BottomNav current={tab} onChange={setTab} />
    </div>
  )
}
