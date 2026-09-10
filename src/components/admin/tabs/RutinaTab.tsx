import { useState, useEffect } from 'react'
import { RefreshCw, Plus, Loader2, CheckCircle } from 'lucide-react'
import { demoRutina } from '../../../data/demo'
import { fetchRutina, upsertRutina, supabase, type RutinaData } from '../../../lib/supabase'

interface RutinaTabProps {
  rutina: RutinaData
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
  clientId?: string
}

function RpeColor(rpe: number) {
  if (rpe <= 5) return '#10B981'
  if (rpe <= 7) return '#F59E0B'
  if (rpe <= 8) return '#F97316'
  return '#EF4444'
}

const PLANTILLAS = [
  { nombre: 'Push / Pull / Legs', dias: demoRutina.dias },
]

export default function RutinaTab({ rutina: fallbackRutina, clientId, onToast }: RutinaTabProps) {
  const [realRutina, setRealRutina] = useState<RutinaData | null | 'loading'>('loading')
  const [assigning, setAssigning] = useState(false)
  const [showPlantillas, setShowPlantillas] = useState(false)

  useEffect(() => {
    if (!clientId) { setRealRutina(null); return }
    fetchRutina(clientId).then(r => setRealRutina(r))
  }, [clientId])

  const handleAssign = async (plantilla: typeof PLANTILLAS[0]) => {
    if (!clientId) return
    setAssigning(true)
    setShowPlantillas(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sin sesión')
      await upsertRutina(clientId, user.id, {
        nombre: plantilla.nombre,
        semana_actual: 1,
        activa: true,
        dias: plantilla.dias,
      })
      const updated = await fetchRutina(clientId)
      setRealRutina(updated)
      onToast(`Rutina "${plantilla.nombre}" asignada correctamente`, 'success')
    } catch {
      onToast('Error al asignar la rutina', 'error')
    } finally {
      setAssigning(false)
    }
  }

  const displayRutina: RutinaData | null = clientId
    ? (realRutina === 'loading' ? null : realRutina)
    : fallbackRutina

  if (realRutina === 'loading' && clientId) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#F5611A' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="rounded-xl p-5 mb-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-white text-lg">
              {displayRutina ? displayRutina.nombre : 'Sin rutina asignada'}
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {displayRutina
                ? `Semana ${displayRutina.semana_actual} · ${displayRutina.dias.length} días/semana`
                : 'Asigna una plantilla para comenzar'}
            </p>
          </div>
          {displayRutina && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}
            >
              Activa
            </span>
          )}
        </div>
        <div className="flex gap-2 relative">
          {displayRutina && (
            <button
              onClick={() => setShowPlantillas(s => !s)}
              disabled={assigning}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
              style={{ background: '#1E2130', color: '#9CA3AF' }}
            >
              <RefreshCw style={{ width: 14, height: 14 }} />
              Cambiar
            </button>
          )}
          <button
            onClick={() => setShowPlantillas(s => !s)}
            disabled={assigning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
            style={{ background: '#F5611A', color: 'white', opacity: assigning ? 0.7 : 1 }}
          >
            {assigning
              ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Asignando...</>
              : <><Plus style={{ width: 14, height: 14 }} /> {displayRutina ? 'Nueva' : 'Asignar rutina'}</>
            }
          </button>

          {/* Dropdown plantillas */}
          {showPlantillas && (
            <div
              className="absolute top-full left-0 mt-2 z-10 rounded-xl overflow-hidden shadow-xl"
              style={{ background: '#161820', border: '1px solid #2a2d3e', minWidth: 220 }}
            >
              <p className="px-4 py-2 text-xs font-medium" style={{ color: '#6B7280', borderBottom: '1px solid #1E2130' }}>
                Plantillas disponibles
              </p>
              {PLANTILLAS.map(p => (
                <button
                  key={p.nombre}
                  onClick={() => handleAssign(p)}
                  className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle style={{ width: 14, height: 14, color: '#F5611A' }} />
                  {p.nombre}
                  <span className="ml-auto text-xs" style={{ color: '#6B7280' }}>{p.dias.length} días</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Days */}
      {displayRutina ? (
        <div className="space-y-4">
          {displayRutina.dias.map(dia => (
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
      ) : (
        <div className="rounded-xl p-12 flex flex-col items-center gap-3" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <div className="text-4xl">🏋️</div>
          <p className="font-medium text-white">Sin rutina asignada</p>
          <p className="text-sm" style={{ color: '#6B7280' }}>Usa el botón "Asignar rutina" para asignar una plantilla</p>
        </div>
      )}
    </div>
  )
}
