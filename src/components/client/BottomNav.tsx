import { Dumbbell, Weight, Apple, MessageSquare } from 'lucide-react'

type ClientTab = 'rutina' | 'peso' | 'nutricion' | 'chat'

interface BottomNavProps {
  current: ClientTab
  onChange: (tab: ClientTab) => void
}

const tabs = [
  { id: 'rutina' as ClientTab, label: 'Mi Rutina', icon: Dumbbell },
  { id: 'peso' as ClientTab, label: 'Mi Peso', icon: Weight },
  { id: 'nutricion' as ClientTab, label: 'Nutrición', icon: Apple },
  { id: 'chat' as ClientTab, label: 'Chat', icon: MessageSquare },
]

export default function BottomNav({ current, onChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 flex"
      style={{ background: '#161820', borderTop: '1px solid #1E2130' }}
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = current === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex-1 flex flex-col items-center py-3 gap-1 cursor-pointer transition-all"
            style={{ color: active ? '#F5611A' : '#4B5563' }}
          >
            <Icon style={{ width: 20, height: 20 }} />
            <span className="text-xs font-medium">{label}</span>
            {active && (
              <span className="absolute -top-px h-0.5 w-12 rounded-full" style={{ background: '#F5611A' }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
