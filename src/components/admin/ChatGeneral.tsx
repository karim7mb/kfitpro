import { useState } from 'react'
import { Send } from 'lucide-react'
import { demoClients, demoChat } from '../../data/demo'

interface ChatGeneralProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

interface Message {
  id: string
  remitente: string
  texto: string
  hora: string
  leido: boolean
}

export default function ChatGeneral({ onToast }: ChatGeneralProps) {
  const [selectedClient, setSelectedClient] = useState(demoClients[0].id)
  const [messages, setMessages] = useState<Message[]>(demoChat)
  const [input, setInput] = useState('')

  const client = demoClients.find(c => c.id === selectedClient)!

  const send = () => {
    if (!input.trim()) return
    const now = new Date()
    const hora = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      remitente: 'admin-001',
      texto: input.trim(),
      hora,
      leido: true,
    }])
    setInput('')
    onToast('Mensaje enviado', 'success')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Chat</h1>
      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-96">
        {/* Client list */}
        <div className="w-72 flex-shrink-0 rounded-xl overflow-hidden" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <div className="px-4 py-3 text-sm font-medium" style={{ color: '#6B7280', borderBottom: '1px solid #1E2130' }}>
            Conversaciones
          </div>
          <div className="overflow-y-auto">
            {demoClients.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClient(c.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left cursor-pointer transition-colors"
                style={{
                  background: selectedClient === c.id ? 'rgba(245,97,26,0.1)' : 'transparent',
                  borderBottom: '1px solid #1E2130',
                  borderLeft: selectedClient === c.id ? '3px solid #F5611A' : '3px solid transparent',
                }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: c.color }}>
                  {c.iniciales}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{c.nombre}</div>
                  <div className="text-xs truncate" style={{ color: '#6B7280' }}>
                    {c.id === 'client-001' ? 'Agarre prono doble por ahora...' : 'Sin mensajes recientes'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          {/* Header */}
          <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid #1E2130' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: client.color }}>
              {client.iniciales}
            </div>
            <div>
              <div className="font-medium text-white text-sm">{client.nombre}</div>
              <div className="text-xs" style={{ color: '#10B981' }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: '#10B981' }} />
                En línea
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.map(msg => {
              const isMe = msg.remitente === 'admin-001'
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
                    <div className="text-xs mt-1" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                      {msg.hora}
                    </div>
                  </div>
                </div>
              )
            })}
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
      </div>
    </div>
  )
}
