import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { supabase, fetchMensajes, sendMensaje, type MensajeDB } from '../../../lib/supabase'

interface ChatTabProps {
  clientId: string
  clienteNombre: string
  clienteColor: string
  clienteIniciales: string
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

function hora(iso: string) {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function ChatTab({ clientId, clienteNombre, clienteColor, clienteIniciales, onToast }: ChatTabProps) {
  const isDemo = clientId.startsWith('client-') || clientId.startsWith('admin-')
  const [adminId, setAdminId] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<MensajeDB[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollDown = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  const loadMensajes = useCallback(async (aid: string) => {
    const data = await fetchMensajes(aid, clientId)
    setMensajes(data)
  }, [clientId])

  useEffect(() => {
    if (isDemo) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setAdminId(user.id)
      loadMensajes(user.id)
    })
  }, [clientId, isDemo, loadMensajes])

  // Poll every 4 seconds
  useEffect(() => {
    if (isDemo || !adminId) return
    const interval = setInterval(() => loadMensajes(adminId), 4000)
    return () => clearInterval(interval)
  }, [adminId, isDemo, loadMensajes])

  useEffect(() => { scrollDown() }, [mensajes])

  const send = async () => {
    const texto = input.trim()
    if (!texto || sending || !adminId) return
    setInput('')
    setSending(true)
    try {
      await sendMensaje(adminId, clientId, texto)
      await loadMensajes(adminId)
    } catch {
      onToast('Error al enviar el mensaje', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: '#161820', border: '1px solid #1E2130', height: 480 }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid #1E2130' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: clienteColor }}>
          {clienteIniciales}
        </div>
        <div>
          <div className="font-medium text-white text-sm">{clienteNombre}</div>
          <div className="text-xs" style={{ color: '#6B7280' }}>
            {isDemo ? 'Demo' : 'Chat con cliente'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {isDemo ? (
          <div className="text-center py-8 text-sm" style={{ color: '#6B7280' }}>Chat en modo demo</div>
        ) : mensajes.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: '#6B7280' }}>No hay mensajes aún. El cliente iniciará la conversación.</div>
        ) : (
          mensajes.map(msg => {
            const isMe = msg.remitente_id === adminId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm"
                  style={{
                    background: isMe ? '#F5611A' : '#1E2130',
                    color: 'white',
                    borderBottomRightRadius: isMe ? 4 : undefined,
                    borderBottomLeftRadius: !isMe ? 4 : undefined,
                  }}
                >
                  <p style={{ whiteSpace: 'pre-wrap' }}>{msg.texto}</p>
                  <div className="text-xs mt-1 text-right" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                    {hora(msg.created_at)}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid #1E2130' }}>
        <input
          type="text"
          placeholder={isDemo ? 'Chat demo' : 'Responder al cliente...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={isDemo || sending}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: '#1E2130', border: '1px solid #2a2d3e', opacity: isDemo ? 0.5 : 1 }}
        />
        <button
          onClick={send}
          disabled={isDemo || sending}
          className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
          style={{ background: '#F5611A', opacity: (isDemo || sending) ? 0.5 : 1 }}
        >
          {sending
            ? <Loader2 className="animate-spin" style={{ width: 16, height: 16, color: 'white' }} />
            : <Send style={{ width: 16, height: 16, color: 'white' }} />
          }
        </button>
      </div>
    </div>
  )
}
