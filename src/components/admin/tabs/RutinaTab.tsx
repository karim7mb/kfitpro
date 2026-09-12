import { useState, useEffect } from 'react'
import { RefreshCw, Plus, Loader2, CheckCircle, X, ExternalLink, Play } from 'lucide-react'
import { demoRutina } from '../../../data/demo'
import { fetchRutina, upsertRutina, fetchPerfilEntrenamiento, supabase, type RutinaData, type DiaRutina } from '../../../lib/supabase'

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

// ── MuscleWiki video mapping ─────────────────────────────────────────────────

type VideoEntry = { keywords: string[]; video: string; slug: string }

const MUSCLEWIKI_VIDEOS: VideoEntry[] = [
  // Pecho
  { keywords: ['press banca plano', 'press de banca', 'press banca barra', 'bench press'], video: 'male-barbell-bench-press-front.mp4', slug: 'barbell-bench-press' },
  { keywords: ['press inclinado mancuernas', 'press mancuernas inclinado'], video: 'male-Dumbbells-dumbbell-incline-bench-press-front.mp4', slug: 'dumbbell-incline-bench-press' },
  { keywords: ['press inclinado barra', 'press banca inclinado'], video: 'male-Barbell-barbell-incline-bench-press-front.mp4', slug: 'barbell-incline-bench-press' },
  { keywords: ['flexiones', 'push-up', 'push up', 'lagartijas'], video: 'male-Bodyweight-push-up-front.mp4', slug: 'push-up' },
  { keywords: ['aperturas maquina', 'pec fly maquina', 'contractor pectoral'], video: 'male-Machine-machine-pec-fly-front.mp4', slug: 'machine-pec-fly' },
  { keywords: ['aperturas inclinado', 'aperturas mancuernas inclinado', 'flies inclinado'], video: 'male-dumbbell-incline-chest-flys-front.mp4', slug: 'dumbbell-incline-chest-flys' },
  { keywords: ['aperturas polea', 'cable fly', 'cruces polea'], video: 'male-cable-pec-fly-front.mp4', slug: 'cable-pec-fly' },
  { keywords: ['press polea pecho', 'press pecho polea', 'cable chest press'], video: 'male-cable-chestpress-front.mp4', slug: 'cable-chestpress' },
  { keywords: ['press agarre estrecho', 'press banca agarre cerrado', 'agarre estrecho'], video: 'male-Barbell-barbell-close-grip-bench-press-front.mp4', slug: 'barbell-close-grip-bench-press' },
  // Hombros
  { keywords: ['press militar', 'press hombros barra', 'overhead press barra', 'press por encima cabeza'], video: 'male-Barbell-barbell-overhead-press-front.mp4', slug: 'barbell-overhead-press' },
  { keywords: ['press hombro mancuernas', 'press arnold', 'press sentado mancuernas', 'press hombros mancuernas'], video: 'male-dumbbell-seated-overhead-press-front.mp4', slug: 'dumbbell-seated-overhead-press' },
  { keywords: ['elevaciones laterales polea', 'lateral raise polea', 'elevacion lateral cable'], video: 'male-Cables-cable-lateral-raise-front.mp4', slug: 'cable-lateral-raise' },
  { keywords: ['remo al menton', 'remo menton barra', 'upright row'], video: 'male-Barbell-barbell-upright-row-front.mp4', slug: 'barbell-upright-row' },
  // Espalda
  { keywords: ['dominadas', 'chin-up', 'chin up', 'pullup', 'pull-up', 'jalones peso corporal'], video: 'male-bodyweight-chinup-front.mp4', slug: 'chinup' },
  { keywords: ['remo mancuerna', 'remo un brazo', 'single arm row', 'remo a una mano'], video: 'male-Dumbbells-dumbbell-single-arm-row-front.mp4', slug: 'dumbbell-single-arm-row' },
  { keywords: ['pullover mancuerna', 'pullover mancuernas'], video: 'male-Dumbbells-dumbbell-pullover-front.mp4', slug: 'dumbbell-pullover' },
  { keywords: ['pullover maquina'], video: 'male-Machine-machine-pullover-front.mp4', slug: 'machine-pullover' },
  // Biceps
  { keywords: ['curl barra', 'curl con barra', 'curl biceps barra'], video: 'male-Barbell-barbell-curl-front.mp4', slug: 'barbell-curl' },
  { keywords: ['curl predicador', 'curl scott', 'curl banco predicador'], video: 'male-Dumbbells-dumbbell-preacher-curl-front.mp4', slug: 'dumbbell-preacher-curl' },
  { keywords: ['curl inclinado mancuernas', 'curl inclinado', 'curl banco inclinado'], video: 'male-Dumbbells-dumbbell-incline-curl-front.mp4', slug: 'dumbbell-incline-curl' },
  // Triceps
  { keywords: ['extension triceps polea', 'polea triceps', 'pushdown', 'jalones triceps', 'press down triceps'], video: 'male-Cables-cable-push-down-front.mp4', slug: 'cable-push-down' },
  { keywords: ['press frances', 'skull crusher', 'rompe craneo', 'skullcrusher'], video: 'male-Dumbbells-dumbbell-skullcrusher-front.mp4', slug: 'dumbbell-skullcrusher' },
  { keywords: ['fondos banco', 'fondos en banco', 'bench dips', 'dips banco'], video: 'male-Bodyweight-bench-dips-front.mp4', slug: 'bench-dips' },
  // Piernas
  { keywords: ['sentadilla con barra', 'squat barra', 'sentadilla barra', 'sentadilla trasera'], video: 'male-Barbell-barbell-squat-front.mp4', slug: 'barbell-squat' },
  { keywords: ['sentadilla goblet', 'goblet squat', 'sentadilla con mancuerna'], video: 'male-dumbbell-goblet-squat-front.mp4', slug: 'dumbbell-goblet-squat' },
  { keywords: ['sentadilla sin peso', 'sentadilla libre', 'sentadilla bodyweight', 'air squat'], video: 'male-Bodyweight-bodyweight-squat-front.mp4', slug: 'bodyweight-squat' },
  { keywords: ['prensa piernas', 'leg press', 'prensa de piernas'], video: 'male-Machine-machine-leg-press-front.mp4', slug: 'machine-leg-press' },
  { keywords: ['zancadas', 'lunges', 'estocadas', 'desdoblamientos'], video: 'male-Bodyweight-forward-lunges-front.mp4', slug: 'forward-lunges' },
  { keywords: ['step up', 'subida a banco', 'subida al cajon'], video: 'male-barbell-step-up-front.mp4', slug: 'barbell-step-up' },
  { keywords: ['peso muerto piernas rigidas', 'stiff leg', 'deadlift piernas rigidas'], video: 'male-barbell-stiff-leg-deadlift-front.mp4', slug: 'barbell-stiff-leg-deadlift' },
  { keywords: ['peso muerto rumano', 'rdl', 'romanian deadlift'], video: 'male-Dumbbells-dumbbell-romanian-deadlift-front.mp4', slug: 'dumbbell-romanian-deadlift' },
  { keywords: ['peso muerto', 'deadlift', 'levantamiento de peso'], video: 'male-Barbell-barbell-deadlift-front.mp4', slug: 'barbell-deadlift' },
  { keywords: ['curl femoral', 'curl isquiotibial', 'leg curl', 'femoral maquina'], video: 'male-machine-hamstring-curl-front.mp4', slug: 'machine-hamstring-curl' },
  { keywords: ['glute ham raise', 'ghr'], video: 'male-machine-glute-ham-raise-front.mp4', slug: 'machine-glute-ham-raise' },
  { keywords: ['curl nordico', 'nordic curl', 'nordico isquiotibial'], video: 'male-Bodyweight-nordic-hamstring-curl-front.mp4', slug: 'nordic-hamstring-curl' },
  { keywords: ['buenos dias barra', 'good morning barra', 'good mornings'], video: 'male-Barbell-barbell-low-bar-good-morning-front.mp4', slug: 'barbell-low-bar-good-morning' },
  { keywords: ['hip thrust', 'empuje de cadera', 'puente de gluteos barra'], video: 'male-Barbell-barbell-hip-thrust-front.mp4', slug: 'barbell-hip-thrust' },
  // Gemelos
  { keywords: ['gemelos maquina de pie', 'gemelos maquina', 'pantorrillas maquina de pie'], video: 'male-machine-standing-calf-raises-front.mp4', slug: 'machine-standing-calf-raises' },
  { keywords: ['gemelos sentado maquina', 'gemelos sentado', 'seated calf raise'], video: 'male-machine-seated-calf-raise-front.mp4', slug: 'machine-seated-calf-raise' },
  { keywords: ['gemelos con barra', 'pantorrillas barra'], video: 'male-Barbell-barbell-calf-raises-front.mp4', slug: 'barbell-calf-raises' },
  { keywords: ['gemelos', 'pantorrillas', 'calf raises', 'elevaciones gemelos'], video: 'male-Bodyweight-calf-raises-front.mp4', slug: 'calf-raises' },
  // Otros
  { keywords: ['swing kettlebell', 'kettlebell swing', 'swing pesa rusa'], video: 'male-Kettlebells-kettlebell-swing-front.mp4', slug: 'kettlebell-swing' },
]

function normalizeText(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findMusclewikiVideo(exerciseName: string): { video: string; slug: string } | null {
  const norm = normalizeText(exerciseName)
  // Direct keyword match
  for (const entry of MUSCLEWIKI_VIDEOS) {
    for (const kw of entry.keywords) {
      if (norm.includes(normalizeText(kw))) return { video: entry.video, slug: entry.slug }
    }
  }
  // Word-overlap scoring
  const words = norm.split(' ').filter(w => w.length > 2)
  let best: { video: string; slug: string } | null = null
  let bestScore = 0
  for (const entry of MUSCLEWIKI_VIDEOS) {
    let score = 0
    for (const kw of entry.keywords) {
      const kwWords = normalizeText(kw).split(' ').filter(w => w.length > 2)
      const hits = kwWords.filter(w => words.includes(w)).length
      score = Math.max(score, hits)
    }
    if (score > bestScore) { bestScore = score; best = { video: entry.video, slug: entry.slug } }
  }
  return bestScore >= 2 ? best : null
}

// ── Técnica modal ─────────────────────────────────────────────────────────────

interface TecnicaModalProps {
  exerciseName: string
  video: string
  slug: string
  onClose: () => void
}

function TecnicaModal({ exerciseName, video, slug, onClose }: TecnicaModalProps) {
  const videoUrl = `https://musclewiki.com/api-next/videos/${video}`
  const pageUrl = `https://musclewiki.com/es-es/exercise/${slug}`
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl overflow-hidden w-full max-w-md"
        style={{ background: '#161820', border: '1px solid #2a2d3e' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1E2130' }}>
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: '#F5611A' }}>Técnica correcta</p>
            <h3 className="font-bold text-white">{exerciseName}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg cursor-pointer" style={{ background: '#1E2130', color: '#9CA3AF' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
        {/* Video */}
        <div className="relative" style={{ background: '#0d0e14' }}>
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full"
            style={{ maxHeight: 360, objectFit: 'contain' }}
          />
        </div>
        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between">
          <p className="text-xs" style={{ color: '#6B7280' }}>Fuente: MuscleWiki</p>
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            style={{ color: '#F5611A' }}
          >
            Ver ejercicio completo <ExternalLink style={{ width: 12, height: 12 }} />
          </a>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const PLANTILLAS = [
  { nombre: 'Push / Pull / Legs', dias: demoRutina.dias },
]

export default function RutinaTab({ rutina: fallbackRutina, clientId, onToast }: RutinaTabProps) {
  const [realRutina, setRealRutina] = useState<RutinaData | null | 'loading'>('loading')
  const [assigning, setAssigning] = useState(false)
  const [showPlantillas, setShowPlantillas] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [tecnicaModal, setTecnicaModal] = useState<{ name: string; video: string; slug: string } | null>(null)

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
      {/* Técnica modal */}
      {tecnicaModal && (
        <TecnicaModal
          exerciseName={tecnicaModal.name}
          video={tecnicaModal.video}
          slug={tecnicaModal.slug}
          onClose={() => setTecnicaModal(null)}
        />
      )}

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
        <div className="flex gap-2 flex-wrap relative">
          {displayRutina && (
            <button
              onClick={() => setShowPlantillas(s => !s)}
              disabled={assigning || genLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
              style={{ background: '#1E2130', color: '#9CA3AF' }}
            >
              <RefreshCw style={{ width: 14, height: 14 }} />
              Plantilla
            </button>
          )}
          {clientId && (
            <button
              disabled={genLoading || assigning}
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                setGenLoading(true)
                try {
                  const perfil = await fetchPerfilEntrenamiento(clientId)
                  const clienteData = await import('../../../lib/supabase').then(m => m.fetchClienteData(clientId))
                  const res = await fetch('/api/generate-routine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      nivel: perfil?.nivel ?? 'principiante',
                      diasEntreno: perfil?.diasEntreno ?? 3,
                      tiempoEntrenoSemana: perfil?.tiempoEntrenoSemana ?? '3-4h',
                      objetivo: clienteData?.objetivo ?? 'mantenimiento',
                      lesiones: perfil?.lesiones ?? [],
                      nombre: `Rutina IA — ${clienteData?.objetivo ?? 'Entrenamiento'}`,
                    }),
                  })
                  const data = await res.json()
                  if (!res.ok || data.error) throw new Error(data.error ?? `Error ${res.status}`)
                  const dias: DiaRutina[] = data.dias.map((d: DiaRutina, i: number) => ({
                    ...d,
                    id: d.id ?? `d${i}`,
                    ejercicios: d.ejercicios.map((e, j) => ({ ...e, id: e.id ?? `e${i}-${j}` })),
                  }))
                  await upsertRutina(clientId, user.id, { nombre: data.nombre, semana_actual: 1, activa: true, dias })
                  const updated = await fetchRutina(clientId)
                  setRealRutina(updated)
                  onToast('✨ Rutina IA generada. ¡Revísala!', 'success')
                } catch (e) {
                  onToast(`Error IA: ${e instanceof Error ? e.message : 'desconocido'}`, 'error')
                } finally {
                  setGenLoading(false)
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer"
              style={{ background: genLoading ? '#7a3010' : '#F5611A', color: 'white', opacity: genLoading ? 0.8 : 1 }}
            >
              {genLoading
                ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Generando...</>
                : <>✨ Generar con IA</>
              }
            </button>
          )}
          <button
            onClick={() => setShowPlantillas(s => !s)}
            disabled={assigning || genLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
            style={{ background: '#1E2130', color: '#9CA3AF', border: '1px solid #2a2d3e', opacity: assigning ? 0.7 : 1 }}
          >
            {assigning
              ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Asignando...</>
              : <><Plus style={{ width: 14, height: 14 }} /> {displayRutina ? 'Nueva plantilla' : 'Plantilla manual'}</>
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
                {dia.ejercicios.map(ej => {
                  const mw = findMusclewikiVideo(ej.nombre)
                  return (
                    <div key={ej.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-white">{ej.nombre}</span>
                        <span className="text-sm ml-2" style={{ color: '#9CA3AF' }}>
                          {ej.series}×{ej.repsMin}-{ej.repsMax}
                          {ej.peso > 0 && ` · ${ej.peso} kg`}
                        </span>
                      </div>
                      {mw && (
                        <button
                          onClick={() => setTecnicaModal({ name: ej.nombre, video: mw.video, slug: mw.slug })}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg cursor-pointer shrink-0"
                          style={{ background: 'rgba(245,97,26,0.12)', color: '#F5611A', border: '1px solid rgba(245,97,26,0.25)' }}
                          title="Ver técnica correcta"
                        >
                          <Play style={{ width: 10, height: 10 }} />
                          Técnica
                        </button>
                      )}
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0"
                        style={{ background: `${RpeColor(ej.rpe)}20`, color: RpeColor(ej.rpe) }}
                      >
                        RPE {ej.rpe}/10
                      </span>
                    </div>
                  )
                })}
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
