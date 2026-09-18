import { useState } from 'react'
import { Settings, X, Loader2 } from 'lucide-react'
import type { AppUser } from '../lib/supabase'
import { changePassword } from '../lib/supabase'
import BottomNav from '../components/client/BottomNav'
import MiInicio from '../components/client/MiInicio'
import MiRutina from '../components/client/MiRutina'
import MiNutricion from '../components/client/MiNutricion'
import MiProgreso from '../components/client/MiProgreso'
import MiChat from '../components/client/MiChat'
import MiCalendario from '../components/client/MiCalendario'

type ClientTab = 'inicio' | 'rutina' | 'nutricion' | 'progreso' | 'chat' | 'calendario'

interface ClientPageProps {
  user: AppUser
  onLogout: () => void
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

export default function ClientPage({ user, onLogout, onToast }: ClientPageProps) {
  const [tab, setTab] = useState<ClientTab>('inicio')
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState('')

  const closePwdModal = () => {
    setShowPwdModal(false)
    setNewPwd('')
    setConfirmPwd('')
    setPwdError('')
  }

  const handleChangePwd = async () => {
    if (newPwd.length < 6) { setPwdError('Mínimo 6 caracteres'); return }
    if (newPwd !== confirmPwd) { setPwdError('Las contraseñas no coinciden'); return }
    setPwdError('')
    setPwdLoading(true)
    try {
      await changePassword(newPwd)
      onToast('Contraseña cambiada correctamente', 'success')
      closePwdModal()
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : 'Error al cambiar contraseña')
    } finally {
      setPwdLoading(false)
    }
  }

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPwdModal(true)}
            className="cursor-pointer"
            style={{ color: '#6B7280' }}
            title="Cambiar contraseña"
          >
            <Settings style={{ width: 17, height: 17 }} />
          </button>
          <button
            onClick={onLogout}
            className="text-xs cursor-pointer"
            style={{ color: '#6B7280' }}
          >
            Salir
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pt-14">
        {tab === 'inicio' && <MiInicio userName={user.nombre} userId={user.id} onNavigate={setTab} />}
        {tab === 'rutina' && <MiRutina userName={user.nombre} userId={user.id} onToast={onToast} />}
        {tab === 'nutricion' && <MiNutricion userId={user.id} onToast={onToast} />}
        {tab === 'progreso' && <MiProgreso userId={user.id} onToast={onToast} />}
        {tab === 'chat' && <MiChat userName={user.nombre} userId={user.id} onToast={onToast} />}
        {tab === 'calendario' && <MiCalendario userId={user.id} />}
      </div>

      <BottomNav current={tab} onChange={setTab} />

      {/* Password change modal */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-xs rounded-2xl" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1E2130' }}>
              <h3 className="font-bold text-white">Cambiar contraseña</h3>
              <button onClick={closePwdModal} className="cursor-pointer" style={{ color: '#6B7280' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div className="px-5 py-5 space-y-3">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: '#9CA3AF' }}>Nueva contraseña</label>
                <input
                  type="password"
                  placeholder="Mín. 6 caracteres"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChangePwd()}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: '#1E2130', border: `1px solid ${pwdError ? '#EF4444' : '#2a2d3e'}` }}
                />
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: '#9CA3AF' }}>Confirmar contraseña</label>
                <input
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChangePwd()}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: '#1E2130', border: `1px solid ${pwdError ? '#EF4444' : '#2a2d3e'}` }}
                />
              </div>
              {pwdError && <p className="text-xs" style={{ color: '#EF4444' }}>{pwdError}</p>}
              <button
                onClick={handleChangePwd}
                disabled={pwdLoading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer flex items-center justify-center gap-2"
                style={{ background: '#F5611A', opacity: pwdLoading ? 0.8 : 1 }}
              >
                {pwdLoading
                  ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Guardando...</>
                  : 'Cambiar contraseña'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
