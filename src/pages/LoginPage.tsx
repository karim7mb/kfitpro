import { useState } from 'react'
import { Zap, Shield, User, Eye, EyeOff, Loader2 } from 'lucide-react'

interface LoginPageProps {
  onLogin: (role: 'admin' | 'cliente') => void
  onRealLogin: (email: string, password: string) => Promise<void>
}

export default function LoginPage({ onLogin, onRealLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'real' | 'demo'>('real')
  const [selected, setSelected] = useState<'admin' | 'cliente' | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRealLogin = async () => {
    if (!email || !password) { setError('Introduce email y contraseña'); return }
    setError('')
    setLoading(true)
    try {
      await onRealLogin(email, password)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar sesión'
      setError(msg.includes('Invalid') ? 'Email o contraseña incorrectos' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0D0E13' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#F5611A' }}>
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-3xl font-bold text-white">KFitPro</span>
          </div>
          <p className="text-sm" style={{ color: '#6B7280' }}>Gestión profesional de entrenamiento personal</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: '#161820' }}>
          <button
            onClick={() => setMode('real')}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
            style={{ background: mode === 'real' ? '#F5611A' : 'transparent', color: mode === 'real' ? 'white' : '#6B7280' }}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => setMode('demo')}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
            style={{ background: mode === 'demo' ? '#1E2130' : 'transparent', color: mode === 'demo' ? 'white' : '#6B7280' }}
          >
            Modo demo
          </button>
        </div>

        <div className="rounded-2xl p-7" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          {mode === 'real' ? (
            <>
              <h2 className="text-xl font-bold text-white mb-5">Bienvenido de nuevo</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#9CA3AF' }}>Email</label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRealLogin()}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                    style={{ background: '#1E2130', border: `1px solid ${error ? '#EF4444' : '#2a2d3e'}` }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#9CA3AF' }}>Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRealLogin()}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none pr-10"
                      style={{ background: '#1E2130', border: `1px solid ${error ? '#EF4444' : '#2a2d3e'}` }}
                    />
                    <button
                      onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                      style={{ color: '#6B7280' }}
                    >
                      {showPass ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
                <button
                  onClick={handleRealLogin}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{ background: '#F5611A', opacity: loading ? 0.8 : 1 }}
                >
                  {loading
                    ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Entrando...</>
                    : 'Entrar'
                  }
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white text-center mb-2">Modo Demo</h2>
              <p className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>
                Selecciona tu rol para explorar
              </p>
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setSelected('admin')}
                  className="w-full p-4 rounded-xl text-left transition-all cursor-pointer"
                  style={{
                    background: selected === 'admin' ? 'rgba(245,97,26,0.15)' : '#1E2130',
                    border: `2px solid ${selected === 'admin' ? '#F5611A' : 'transparent'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F5611A' }}>
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">Entrenador (Admin)</div>
                      <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Gestiona clientes, rutinas y reportes</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setSelected('cliente')}
                  className="w-full p-4 rounded-xl text-left transition-all cursor-pointer"
                  style={{
                    background: selected === 'cliente' ? 'rgba(139,92,246,0.15)' : '#1E2130',
                    border: `2px solid ${selected === 'cliente' ? '#8B5CF6' : 'transparent'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#8B5CF6' }}>
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">Carlos Ruiz (Cliente)</div>
                      <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Mis rutinas, peso y nutrición</div>
                    </div>
                  </div>
                </button>
              </div>
              <button
                onClick={() => selected && onLogin(selected)}
                disabled={!selected}
                className="w-full py-3.5 rounded-xl font-semibold transition-all"
                style={{
                  background: selected ? '#F5611A' : '#2a2d3e',
                  color: selected ? 'white' : '#6B7280',
                  cursor: selected ? 'pointer' : 'not-allowed',
                }}
              >
                Entrar como demo
              </button>
            </>
          )}
        </div>

        <p className="text-center mt-5 text-xs" style={{ color: '#4B5563' }}>
          {mode === 'real' ? 'KFitPro · Versión 1.0' : 'Versión demo · Supabase Auth en producción'}
        </p>
      </div>
    </div>
  )
}
