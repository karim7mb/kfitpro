import { RefreshCw, Plus } from 'lucide-react'

interface Ejercicio {
  id: string
  nombre: string
  series: number
  repsMin: number
  repsMax: number
  peso: number
  rpe: number
}

interface DiaRutina {
  id: string
  nombre: string
  titulo: string
  ejercicios: Ejercicio[]
}

interface Rutina {
  nombre: string
  semanaActual: number
  diasSemana: number
  activa: boolean
  dias: DiaRutina[]
}

interface RutinaTabProps {
  rutina: Rutina
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

function RpeColor(rpe: number) {
  if (rpe <= 5) return '#10B981'
  if (rpe <= 7) return '#F59E0B'
  if (rpe <= 8) return '#F97316'
  return '#EF4444'
}

export default function RutinaTab({ rutina }: RutinaTabProps) {
  return (
    <div>
      {/* Header */}
      <div className="rounded-xl p-5 mb-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-white text-lg">{rutina.nombre}</h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Semana {rutina.semanaActual} · {rutina.diasSemana} días/semana
            </p>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}
          >
            Activa
          </span>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
            style={{ background: '#1E2130', color: '#9CA3AF' }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
            Cambiar
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
            style={{ background: '#F5611A', color: 'white' }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Nueva
          </button>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-4">
        {rutina.dias.map(dia => (
          <div key={dia.id} className="rounded-xl overflow-hidden" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#1E2130' }}>
              <div>
                <span className="font-semibold text-white">{dia.nombre}</span>
                <span className="text-sm ml-2" style={{ color: '#6B7280' }}>{dia.titulo}</span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(245,97,26,0.2)', color: '#F5611A' }}
              >
                {dia.ejercicios.length} ejercicios
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: '#1E2130' }}>
              {dia.ejercicios.map(ej => (
                <div key={ej.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white">{ej.nombre}</span>
                    <span className="text-sm ml-2" style={{ color: '#9CA3AF' }}>
                      {ej.series}×{ej.repsMin}-{ej.repsMax}
                      {ej.peso > 0 && ` · ${ej.peso} kg`}
                    </span>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: `${RpeColor(ej.rpe)}20`, color: RpeColor(ej.rpe) }}
                  >
                    RPE {ej.rpe}/10
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
