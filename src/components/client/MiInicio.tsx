import { useEffect, useState } from 'react'
import { ChevronRight, Dumbbell, Apple, Weight, MessageSquare, Calendar, CheckCircle2 } from 'lucide-react'
import {
  fetchRutina4Semanas, fetchPlanNutricional, fetchRegistrosPeso, fetchSesionesLog,
  type Rutina4Semanas, type PlanNutricional, type PesoEntry, type DiaRutina, type SesionLog,
} from '../../lib/supabase'
import { demoPeso, demoNutricion } from '../../data/demo'

interface MiInicioProps {
  userName: string
  userId: string
  onNavigate: (tab: 'rutina' | 'nutricion' | 'progreso' | 'chat' | 'calendario') => void
}

const isDemo = (id: string) => id.startsWith('client-') || id.startsWith('admin-')

const DEMO_PLAN: PlanNutricional = {
  cliente_id: 'demo', entrenador_id: 'demo',
  nombre: 'Plan Demo', calorias_objetivo: demoNutricion.calorias,
  proteinas_g: demoNutricion.proteinas, carbos_g: demoNutricion.carbos, grasas_g: demoNutricion.grasas,
  comidas: [],
}

function getDayOfWeekIndex(): number {
  return (new Date().getDay() + 6) % 7 // 0=Mon, 6=Sun
}

function calcSemanaActual(fechaInicio?: string): number {
  if (!fechaInicio) return 1
  const ms = Date.now() - new Date(fechaInicio).getTime()
  return Math.min(4, Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24 * 7)) + 1))
}

function getTodayDia(rutina: Rutina4Semanas): DiaRutina | null {
  const semana = calcSemanaActual(rutina.fecha_inicio)
  const dias = rutina.semanas?.[semana - 1]?.dias ?? rutina.dias
  if (!dias?.length) return null
  const dayIdx = getDayOfWeekIndex()
  const total = dias.length
  const maxSlot = total <= 5 ? 4 : 6
  const map: Record<number, number> = {}
  for (let i = 0; i < total; i++) {
    map[total === 1 ? 0 : Math.round((i * maxSlot) / (total - 1))] = i
  }
  const idx = map[dayIdx]
  return idx !== undefined ? dias[idx] : null
}

export default function MiInicio({ userName, userId, onNavigate }: MiInicioProps) {
  const demo = isDemo(userId)
  const [rutina, setRutina] = useState<Rutina4Semanas | null>(null)
  const [plan, setPlan] = useState<PlanNutricional | null>(null)
  const [pesos, setPesos] = useState<PesoEntry[]>([])
  const [todaySesion, setTodaySesion] = useState<SesionLog | null>(null)

  const today = new Date()
  const dateStr = today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const hour = today.getHours()
  const greeting = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'

  useEffect(() => {
    if (demo) {
      setPlan(DEMO_PLAN)
      setPesos(demoPeso)
      return
    }
    fetchRutina4Semanas(userId).then(r => {
      setRutina(r)
      if (r) {
        fetchSesionesLog(userId).then(logs => {
          const todayStr = new Date().toISOString().split('T')[0]
          const dia = getTodayDia(r)
          if (dia) {
            const s = logs.find(l => l.fecha === todayStr && l.dia_id === dia.id)
            setTodaySesion(s ?? null)
          }
        })
      }
    })
    fetchPlanNutricional(userId).then(p => setPlan(p))
    fetchRegistrosPeso(userId).then(p => setPesos(p))
  }, [userId, demo])

  const todayWorkout = rutina ? getTodayDia(rutina) : null
  const totalEjercicios = todayWorkout?.ejercicios.length ?? 0
  const totalSeries = todayWorkout?.ejercicios.reduce((s, e) => s + e.series, 0) ?? 0
  const semanaActual = rutina ? calcSemanaActual(rutina.fecha_inicio) : 1

  const totalCal = plan?.comidas.reduce((s, c) => s + c.alimentos.reduce((ss, a) => ss + a.calorias, 0), 0) ?? 0
  const calObj = plan?.calorias_objetivo ?? 0
  const pctCal = calObj > 0 ? Math.min((totalCal / calObj) * 100, 100) : 0

  const pesoActual = pesos.length > 0 ? pesos[pesos.length - 1].peso : null
  const pesoAnterior = pesos.length > 1 ? pesos[pesos.length - 2].peso : null
  const pesoDiff = pesoActual && pesoAnterior ? (pesoActual - pesoAnterior) : null

  // Build week display from real routine days
  const weekDots = (() => {
    const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
    const dayIndex = getDayOfWeekIndex()
    const trainingSlots = new Set<number>()
    if (rutina) {
      const dias = rutina.semanas?.[semanaActual - 1]?.dias ?? rutina.dias ?? []
      const total = dias.length
      const maxSlot = total <= 5 ? 4 : 6
      dias.forEach((_, i) => {
        trainingSlots.add(total === 1 ? 0 : Math.round((i * maxSlot) / (total - 1)))
      })
    }
    return labels.map((d, i) => ({
      label: d,
      isToday: i === dayIndex,
      isTraining: trainingSlots.has(i),
      isDone: trainingSlots.has(i) && i < dayIndex,
    }))
  })()

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-5 pt-6 pb-5">
        <p className="text-sm capitalize" style={{ color: '#6B7280' }}>{dateStr}</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">
          {greeting}, {userName.split(' ')[0]} 👋
        </h1>
      </div>

      {/* Entrenamiento de hoy */}
      <button
        onClick={() => onNavigate('rutina')}
        className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-2xl p-5 text-left cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #F5611A 0%, #d94e12 100%)', border: 'none' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Dumbbell style={{ width: 16, height: 16, color: 'white' }} />
            </div>
            <span className="font-semibold text-white text-sm">Entrenamiento de hoy</span>
          </div>
          <ChevronRight style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.6)' }} />
        </div>
        {todayWorkout ? (
          <>
            <p className="font-bold text-white text-lg leading-tight">{todayWorkout.titulo || todayWorkout.nombre}</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {rutina?.nombre} · Semana {semanaActual} · {totalEjercicios} ejercicios · {totalSeries} series
            </p>
            {todaySesion ? (
              <div className="mt-2 flex items-center gap-2">
                {todaySesion.completada ? (
                  <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.25)', color: '#10B981' }}>
                    <CheckCircle2 size={11} /> Completada
                  </span>
                ) : (() => {
                  const seriesLogs = Object.values(todaySesion.series_completadas ?? {}).flat()
                  const done = seriesLogs.filter(s => s.completada).length
                  const total = seriesLogs.length
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,97,26,0.25)', color: 'white' }}>
                      En progreso · {pct}%
                    </span>
                  )
                })()}
              </div>
            ) : null}
          </>
        ) : rutina ? (
          <p className="text-white opacity-70 text-sm">🛌 Hoy es día de descanso</p>
        ) : (
          <p className="text-white opacity-70 text-sm">Sin rutina asignada</p>
        )}
      </button>

      {/* Nutrición */}
      <button
        onClick={() => onNavigate('nutricion')}
        className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-2xl p-5 text-left cursor-pointer"
        style={{ background: '#161820', border: '1px solid #1E2130' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
              <Apple style={{ width: 16, height: 16, color: '#10B981' }} />
            </div>
            <span className="font-semibold text-white text-sm">Nutrición</span>
          </div>
          <ChevronRight style={{ width: 16, height: 16, color: '#4B5563' }} />
        </div>
        {plan ? (
          <>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-2xl font-bold text-white">{totalCal}</span>
              <span className="text-sm" style={{ color: '#6B7280' }}>/ {calObj} kcal</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1E2130' }}>
              <div className="h-full rounded-full" style={{ width: `${pctCal}%`, background: '#10B981' }} />
            </div>
            <p className="text-xs mt-1.5" style={{ color: '#6B7280' }}>
              {calObj - totalCal > 0 ? `${calObj - totalCal} kcal restantes` : 'Objetivo alcanzado'}
            </p>
          </>
        ) : (
          <p className="text-sm" style={{ color: '#6B7280' }}>Sin plan nutricional asignado</p>
        )}
      </button>

      {/* Grid: Peso + Calendario */}
      <div className="mx-4 grid grid-cols-2 gap-3 mb-4">
        {/* Progreso/Peso */}
        <button
          onClick={() => onNavigate('progreso')}
          className="rounded-2xl p-4 text-left cursor-pointer"
          style={{ background: '#161820', border: '1px solid #1E2130' }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <Weight style={{ width: 16, height: 16, color: '#3B82F6' }} />
          </div>
          <div className="font-bold text-white text-xl">
            {pesoActual ? `${pesoActual} kg` : '—'}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Último peso</div>
          {pesoDiff !== null && (
            <div className="text-xs mt-1 font-medium" style={{ color: pesoDiff <= 0 ? '#10B981' : '#EF4444' }}>
              {pesoDiff > 0 ? '+' : ''}{pesoDiff.toFixed(1)} kg
            </div>
          )}
        </button>

        {/* Calendario */}
        <button
          onClick={() => onNavigate('calendario')}
          className="rounded-2xl p-4 text-left cursor-pointer"
          style={{ background: '#161820', border: '1px solid #1E2130' }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <Calendar style={{ width: 16, height: 16, color: '#8B5CF6' }} />
          </div>
          <div className="font-bold text-white text-xl">
            {rutina ? `S${semanaActual}/4` : '—'}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Plan 4 semanas</div>
          {rutina && (
            <div className="text-xs mt-1 font-medium" style={{ color: '#8B5CF6' }}>
              Ver calendario
            </div>
          )}
        </button>
      </div>

      {/* Chat */}
      <button
        onClick={() => onNavigate('chat')}
        className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-2xl p-4 text-left cursor-pointer flex items-center gap-3"
        style={{ background: '#161820', border: '1px solid #1E2130' }}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,97,26,0.15)' }}>
          <MessageSquare style={{ width: 16, height: 16, color: '#F5611A' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm">Tu entrenador</div>
          <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Escribe a Karim</div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
          <span className="text-xs font-medium" style={{ color: '#10B981' }}>En línea</span>
        </div>
      </button>

      {/* Esta semana */}
      <div className="mx-4 rounded-2xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <h3 className="font-semibold text-white mb-4 text-sm">Esta semana</h3>
        <div className="flex gap-1.5 justify-between">
          {weekDots.map(({ label, isToday, isTraining, isDone }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs" style={{ color: '#4B5563' }}>{label}</span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: isToday ? '#F5611A' : isDone ? 'rgba(16,185,129,0.2)' : isTraining ? 'rgba(245,97,26,0.1)' : '#1E2130',
                  color: isToday ? 'white' : isDone ? '#10B981' : isTraining ? '#F5611A' : '#4B5563',
                  border: isToday ? '2px solid #F5611A' : 'none',
                }}
              >
                {isDone ? '✓' : isTraining ? '●' : '·'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
