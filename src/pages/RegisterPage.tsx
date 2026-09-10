import { useState } from 'react'
import { Zap, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react'
import { completeClientProfile } from '../lib/supabase'

interface RegisterPageProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
  onComplete: () => void
}

export default function RegisterPage({ onToast, onComplete }: RegisterPageProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const strength = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)

  const handleSubmit = async () => {
    if (password.length < 8) { onToast('La contraseña debe tener al menos 8 caracteres', 'error'); return }
    if (password !== confirm) { onToast('Las contraseñas no coinciden', 'error'); return }
    setLoading(true)
    try {
      await completeClientProfile(password)
      setDone(true)
      onToast('¡Cuenta activada correctamente!', 'success')
      setTimeout(onComplete, 2000)
    } catch {
      onToast('Error al activar la cuenta. El enlace puede haber expirado.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0E13' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <CheckCircle style={{ width: 40, height: 40, color: '#10B981' }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">¡Bienvenido a KFitPro!</h2>
          <p style={{ color: '#6B7280' }}>Redirigiendo a tu panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0D0E13' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5611A' }}>
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-2xl font-bold text-white">KFitPro</span>
          </div>
          <p className="text-sm" style={{ color: '#6B7280' }}>Tu entrenador te ha invitado a KFitPro</p>
        </div>

        <div className="rounded-2xl p-7" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <h2 className="text-xl font-bold text-white mb-1">Crea tu contraseña</h2>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
            Elige una contraseña segura para acceder a tu panel de entrenamiento.
          </p>

          {/* Password field */}
          <div className="mb-4">
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#9CA3AF' }}>
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none pr-10"
                style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
              />
              <button
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ color: '#6B7280' }}
              >
                {show ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
              </button>
            </div>
            {/* Strength indicators */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                {[
                  { ok: password.length >= 8, label: 'Mínimo 8 caracteres' },
                  { ok: /[A-Z]/.test(password), label: 'Al menos una mayúscula' },
                  { ok: /[0-9]/.test(password), label: 'Al menos un número' },
                ].map(({ ok, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ background: ok ? '#10B981' : '#2a2d3e' }}>
                      {ok && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs" style={{ color: ok ? '#10B981' : '#6B7280' }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm field */}
          <div className="mb-6">
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#9CA3AF' }}>
              Confirmar contraseña
            </label>
            <input
              type={show ? 'text' : 'password'}
              placeholder="Repite la contraseña"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
              style={{
                background: '#1E2130',
                border: `1px solid ${confirm && confirm !== password ? '#EF4444' : '#2a2d3e'}`,
              }}
            />
            {confirm && confirm !== password && (
              <p className="text-xs mt-1" style={{ color: '#EF4444' }}>Las contraseñas no coinciden</p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !strength || password !== confirm}
            className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all"
            style={{
              background: strength && password === confirm ? '#F5611A' : '#2a2d3e',
              color: strength && password === confirm ? 'white' : '#6B7280',
              cursor: strength && password === confirm ? 'pointer' : 'not-allowed',
            }}
          >
            {loading
              ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Activando cuenta...</>
              : 'Activar mi cuenta'
            }
          </button>
        </div>

        <p className="text-center mt-5 text-xs" style={{ color: '#4B5563' }}>
          ¿Problemas? Pide a tu entrenador que reenvíe la invitación.
        </p>
      </div>
    </div>
  )
}
