import { Home, Dumbbell, Apple, MessageSquare } from 'lucide-react'

type ClientTab = 'inicio' | 'rutina' | 'nutricion' | 'chat'

interface BottomNavProps {
  current: ClientTab
  onChange: (tab: ClientTab) => void
}

const tabs = [
  { id: 'inicio' as ClientTab, label: 'Inicio', icon: Home },
  { id: 'rutina' as ClientTab, label: 'Rutina', icon: Dumbbell },
  { id: 'nutricion' as ClientTab, label: 'Nutrición', icon: Apple },
  { id: 'chat' as ClientTab, label: 'Chat', icon: MessageSquare },
]

export default function BottomNav({ current, onChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 flex"
      style={{ background: '#161820', borderTop: '1px solid #1E2130', maxWidth: 480, margin: '0 auto' }}
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = current === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex-1 flex flex-col items-center py-3 gap-1 cursor-pointer transition-all relative"
            style={{ color: active ? '#F5611A' : '#4B5563' }}
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full" style={{ background: '#F5611A' }} />
            )}
            <Icon style={{ width: 20, height: 20 }} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
