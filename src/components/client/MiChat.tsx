import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { supabase, fetchEntrenadorId, fetchMensajes, sendMensaje, type MensajeDB } from '../../lib/supabase'

interface MiChatProps {
  userName: string
  userId: string
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

function hora(iso: string) {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function MiChat({ userName, userId, onToast }: MiChatProps) {
  const isDemo = userId.startsWith('client-') || userId.startsWith('admin-')
  const [entrenadorId, setEntrenadorId] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<MensajeDB[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingAI, setLoadingAI] = useState(false)
  const [clientInfo, setClientInfo] = useState<{ objetivo: string; rutinaNombre: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollDown = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  const loadMensajes = useCallback(async (uid: string, eid: string) => {
    const data = await fetchMensajes(uid, eid)
    setMensajes(data)
  }, [])

  useEffect(() => {
    if (isDemo) return
    fetchEntrenadorId(userId).then(eid => {
      if (!eid) return
      setEntrenadorId(eid)
      loadMensajes(userId, eid)
    })
    // Fetch client context for AI
    supabase.from('clientes').select('objetivo').eq('usuario_id', userId).single()
      .then(({ data }) => {
        supabase.from('rutinas').select('nombre').eq('cliente_id', userId).eq('activa', true).maybeSingle()
          .then(({ data: r }) => {
            setClientInfo({ objetivo: data?.objetivo ?? '', rutinaNombre: r?.nombre ?? '' })
          })
      })
  }, [userId, isDemo, loadMensajes])

  // Poll every 4 seconds for new messages
  useEffect(() => {
    if (isDemo || !entrenadorId) return
    const interval = setInterval(() => loadMensajes(userId, entrenadorId), 4000)
    return () => clearInterval(interval)
  }, [userId, entrenadorId, isDemo, loadMensajes])

  useEffect(() => { scrollDown() }, [mensajes])

  const send = async () => {
    const texto = input.trim()
    if (!texto || sending || loadingAI) return
    setInput('')

    if (isDemo) {
      onToast('Chat en modo demo', 'info')
      return
    }
    if (!entrenadorId) { onToast('Sin entrenador asignado', 'error'); return }

    setSending(true)
    try {
      await sendMensaje(userId, entrenadorId, texto)
      await loadMensajes(userId, entrenadorId)
    } catch {
      onToast('Error al enviar el mensaje', 'error')
      setSending(false)
      return
    }
    setSending(false)

    // AI response
    setLoadingAI(true)
    try {
      const historial = mensajes.slice(-8).map(m => ({
        esCliente: m.remitente_id === userId,
        texto: m.texto,
      }))
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto,
          clienteNombre: userName,
          objetivo: clientInfo?.objetivo ?? '',
          rutinaNombre: clientInfo?.rutinaNombre ?? '',
          historial,
        }),
      })
      const { reply } = await resp.json()
      if (reply) {
        await sendMensaje(entrenadorId, userId, reply, true)
        await loadMensajes(userId, entrenadorId)
      }
    } catch {
      // AI failed silently — message still sent
    } finally {
      setLoadingAI(false)
    }
  }

  return (
    <div className="flex flex-col pb-20" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: '#F5611A' }}>
          KF
        </div>
        <div>
          <div className="font-semibold text-white">Karim</div>
          <div className="text-xs" style={{ color: '#10B981' }}>En línea</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isDemo ? (
          <div className="text-center py-8 text-sm" style={{ color: '#6B7280' }}>Chat disponible en modo real</div>
        ) : mensajes.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: '#6B7280' }}>Empieza una conversación con tu entrenador 💬</div>
        ) : (
          mensajes.map(msg => {
            const isMe = msg.remitente_id === userId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1 text-xs font-bold text-white" style={{ background: '#F5611A' }}>
                    K
                  </div>
                )}
                <div
                  className="max-w-xs px-4 py-2.5 rounded-2xl text-sm"
                  style={{
                    background: isMe ? '#F5611A' : '#1E2130',
                    color: 'white',
                    borderBottomRightRadius: isMe ? 4 : undefined,
                    borderBottomLeftRadius: !isMe ? 4 : undefined,
                  }}
                >
                  <p style={{ whiteSpace: 'pre-wrap' }}>{msg.texto}</p>
                  <div className="text-xs mt-1" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                    {hora(msg.created_at)}
                  </div>
                </div>
              </div>
            )
          })
        )}
        {loadingAI && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1 text-xs font-bold text-white" style={{ background: '#F5611A' }}>
              K
            </div>
            <div className="px-4 py-3 rounded-2xl" style={{ background: '#1E2130', borderBottomLeftRadius: 4 }}>
              <Loader2 className="animate-spin" style={{ width: 14, height: 14, color: '#F5611A' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="fixed bottom-16 left-0 right-0 px-4 py-3 flex gap-2"
        style={{ background: '#161820', borderTop: '1px solid #1E2130', maxWidth: 480, margin: '0 auto' }}
      >
        <input
          type="text"
          placeholder="Mensaje..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={sending || loadingAI}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: '#1E2130', border: '1px solid #2a2d3e', opacity: (sending || loadingAI) ? 0.7 : 1 }}
        />
        <button
          onClick={send}
          disabled={sending || loadingAI}
          className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
          style={{ background: '#F5611A', opacity: (sending || loadingAI) ? 0.7 : 1 }}
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
