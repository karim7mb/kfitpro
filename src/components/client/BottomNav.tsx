import { Home, Dumbbell, Apple, TrendingUp, MessageSquare } from 'lucide-react'

type ClientTab = 'inicio' | 'rutina' | 'nutricion' | 'progreso' | 'chat'

interface BottomNavProps {
  current: ClientTab
  onChange: (tab: ClientTab) => void
}

const tabs = [
  { id: 'inicio' as ClientTab, label: 'Inicio', icon: Home },
  { id: 'rutina' as ClientTab, label: 'Rutina', icon: Dumbbell },
  { id: 'nutricion' as ClientTab, label: 'Nutrición', icon: Apple },
  { id: 'progreso' as ClientTab, label: 'Progreso', icon: TrendingUp },
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
            className="flex-1 flex flex-col items-center py-2.5 gap-0.5 cursor-pointer transition-all relative"
            style={{ color: active ? '#F5611A' : '#4B5563' }}
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full" style={{ background: '#F5611A' }} />
            )}
            <Icon style={{ width: 19, height: 19 }} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
