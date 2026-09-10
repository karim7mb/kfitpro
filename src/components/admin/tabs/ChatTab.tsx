import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

interface Message {
  id: string
  remitente: string
  texto: string
  hora: string
  leido: boolean
}

interface ChatTabProps {
  messages: Message[]
  currentUserId: string
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

export default function ChatTab({ messages: initialMessages, currentUserId, onToast }: ChatTabProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    if (!input.trim()) return
    const now = new Date()
    const hora = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      remitente: currentUserId,
      texto: input.trim(),
      hora,
      leido: true,
    }])
    setInput('')
    onToast('Mensaje enviado', 'success')
  }

  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: '#161820', border: '1px solid #1E2130', height: 480 }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid #1E2130' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#F5611A', color: 'white' }}>
          CR
        </div>
        <div>
          <div className="font-medium text-white text-sm">Carlos Ruiz</div>
          <div className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#10B981' }} />
            En línea
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map(msg => {
          const isMe = msg.remitente === currentUserId
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
                <p>{msg.texto}</p>
                <div className="text-xs mt-1 text-right" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                  {msg.hora}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid #1E2130' }}>
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
        />
        <button
          onClick={send}
          className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
          style={{ background: '#F5611A' }}
        >
          <Send style={{ width: 16, height: 16, color: 'white' }} />
        </button>
      </div>
    </div>
  )
}
