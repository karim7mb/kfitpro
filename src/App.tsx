import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import ClientPage from './pages/ClientPage'
import RegisterPage from './pages/RegisterPage'
import Toast, { useToast } from './components/shared/Toast'

function isRegisterRoute() {
  return window.location.pathname === '/registro' ||
    window.location.hash.includes('type=invite') ||
    window.location.hash.includes('type=recovery')
}

export default function App() {
  const { user, loading, login, loginAsDemo, logout } = useAuth()
  const { toasts, addToast, removeToast } = useToast()
  const [isRegister, setIsRegister] = useState(isRegisterRoute)

  useEffect(() => {
    setIsRegister(isRegisterRoute())
  }, [])

  const handleRegisterComplete = () => {
    setIsRegister(false)
    window.history.pushState({}, '', '/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0E13' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5611A' }}>
            <span className="text-white font-bold text-lg">⚡</span>
          </div>
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#F5611A', borderTopColor: 'transparent' }} />
        </div>
      </div>
    )
  }

  return (
    <>
      {isRegister ? (
        <RegisterPage onToast={addToast} onComplete={handleRegisterComplete} />
      ) : !user ? (
        <LoginPage onLogin={loginAsDemo} onRealLogin={login} />
      ) : user.rol === 'admin' ? (
        <AdminPage user={user} onLogout={logout} onToast={addToast} />
      ) : (
        <ClientPage user={user} onLogout={logout} onToast={addToast} />
      )}
      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  )
}
