import { useState, useEffect } from 'react'
import { RefreshCw, Plus, Loader2, CheckCircle, X, ExternalLink, Play, Pencil, Save, Trash2 } from 'lucide-react'
import { demoRutina } from '../../../data/demo'
import {
  fetchRutina4Semanas, upsertRutina4Semanas, fetchPerfilEntrenamiento, supabase,
  type RutinaData, type DiaRutina, type Rutina4Semanas, type SemanaRutina,
} from '../../../lib/supabase'

interface RutinaTabProps {
  rutina: RutinaData
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
  clientId?: string
}

type EjercicioRutina = DiaRutina['ejercicios'][number]

function RpeColor(rpe: number) {
  if (rpe <= 5) return '#10B981'
  if (rpe <= 7) return '#F59E0B'
  if (rpe <= 8) return '#F97316'
  return '#EF4444'
}

// ── Client-side deriveWeek (mirrors api/generate-4week-plan.ts) ───────────────

function deriveWeek(week1Days: DiaRutina[], weekNum: 2 | 3 | 4): DiaRutina[] {
  return week1Days.map(dia => ({
    ...dia,
    id: dia.id.replace(/w1|d(\d)/, (m: string, n: string) =>
      weekNum === 4 ? `w4d${n ?? m}` : `w${weekNum}d${n ?? m}`),
    ejercicios: dia.ejercicios.map((ej, i) => {
      const baseId = `w${weekNum}e${i + 1}`
      if (weekNum === 4) {
        return {
          ...ej,
          id: baseId,
          series: Math.max(2, Math.round(ej.series * 0.6)),
          rpe: Math.min(8, Math.max(6, ej.rpe - 2)),
          rir: Math.min(5, (ej.rir ?? 3) + 3),
        }
      }
      const extraSeries = (weekNum - 1) * 2
      const extraRpe = (weekNum - 1) * 0.5
      return {
        ...ej,
        id: baseId,
        series: Math.min(6, ej.series + extraSeries),
        rpe: Math.min(9.5, ej.rpe + extraRpe),
        rir: Math.max(0, (ej.rir ?? 3) - (weekNum - 1)),
        repsMax: weekNum === 3 ? Math.max(ej.repsMin + 1, ej.repsMax - 2) : ej.repsMax,
      }
    }),
  }))
}

// ── MuscleWiki video mapping ─────────────────────────────────────────────────

type VideoEntry = { keywords: string[]; video: string; slug: string }

const MUSCLEWIKI_VIDEOS: VideoEntry[] = [
  { keywords: ['press banca plano', 'press de banca', 'press banca barra', 'bench press'], video: 'male-barbell-bench-press-front.mp4', slug: 'barbell-bench-press' },
  { keywords: ['press inclinado mancuernas', 'press mancuernas inclinado'], video: 'male-Dumbbells-dumbbell-incline-bench-press-front.mp4', slug: 'dumbbell-incline-bench-press' },
  { keywords: ['press inclinado barra', 'press banca inclinado'], video: 'male-Barbell-barbell-incline-bench-press-front.mp4', slug: 'barbell-incline-bench-press' },
  { keywords: ['flexiones', 'push-up', 'push up', 'lagartijas'], video: 'male-Bodyweight-push-up-front.mp4', slug: 'push-up' },
  { keywords: ['aperturas maquina', 'pec fly maquina', 'contractor pectoral'], video: 'male-Machine-machine-pec-fly-front.mp4', slug: 'machine-pec-fly' },
  { keywords: ['aperturas de pecho', 'aperturas pecho', 'aperturas inclinado', 'aperturas mancuernas', 'flies pecho'], video: 'male-dumbbell-incline-chest-flys-front.mp4', slug: 'dumbbell-incline-chest-flys' },
  { keywords: ['aperturas polea', 'cable fly', 'cruces polea'], video: 'male-cable-pec-fly-front.mp4', slug: 'cable-pec-fly' },
  { keywords: ['press polea pecho', 'press pecho polea', 'cable chest press'], video: 'male-cable-chestpress-front.mp4', slug: 'cable-chestpress' },
  { keywords: ['press agarre estrecho', 'press banca agarre cerrado', 'agarre estrecho'], video: 'male-Barbell-barbell-close-grip-bench-press-front.mp4', slug: 'barbell-close-grip-bench-press' },
  { keywords: ['press militar', 'press hombros barra', 'overhead press barra', 'press por encima cabeza'], video: 'male-Barbell-barbell-overhead-press-front.mp4', slug: 'barbell-overhead-press' },
  { keywords: ['press hombro mancuernas', 'press arnold', 'press sentado mancuernas', 'press hombros mancuernas'], video: 'male-dumbbell-seated-overhead-press-front.mp4', slug: 'dumbbell-seated-overhead-press' },
  { keywords: ['elevaciones laterales polea', 'lateral raise polea', 'elevacion lateral cable'], video: 'male-Cables-cable-lateral-raise-front.mp4', slug: 'cable-lateral-raise' },
  { keywords: ['remo al menton', 'remo menton barra', 'upright row'], video: 'male-Barbell-barbell-upright-row-front.mp4', slug: 'barbell-upright-row' },
  { keywords: ['encogimientos de hombros', 'encogimientos hombros', 'shrugs', 'encogimientos'], video: 'male-Dumbbells-dumbbell-shrug-front.mp4', slug: 'dumbbell-shrug' },
  { keywords: ['dominadas', 'chin-up', 'chin up', 'pullup', 'pull-up', 'jalones peso corporal'], video: 'male-bodyweight-chinup-front.mp4', slug: 'chinup' },
  { keywords: ['remo con mancuernas', 'remo mancuernas', 'remo mancuerna', 'remo un brazo', 'single arm row', 'remo a una mano'], video: 'male-Dumbbells-dumbbell-single-arm-row-front.mp4', slug: 'dumbbell-single-arm-row' },
  { keywords: ['remo con barra', 'remo barra', 'bent over row', 'remo agarre prono', 'remo inclinado barra'], video: 'male-barbell-bent-over-row-front.mp4', slug: 'barbell-bent-over-row' },
  { keywords: ['pullover mancuerna', 'pullover mancuernas'], video: 'male-Dumbbells-dumbbell-pullover-front.mp4', slug: 'dumbbell-pullover' },
  { keywords: ['pullover maquina'], video: 'male-Machine-machine-pullover-front.mp4', slug: 'machine-pullover' },
  { keywords: ['curl de biceps con mancuernas', 'curl biceps mancuernas', 'curl mancuernas', 'curl alterno mancuernas', 'curl con mancuernas'], video: 'male-Dumbbells-dumbbell-curl-front.mp4', slug: 'dumbbell-curl' },
  { keywords: ['curl martillo', 'hammer curl', 'curl martillo mancuernas'], video: 'male-Dumbbells-dumbbell-hammer-curl-front.mp4', slug: 'dumbbell-hammer-curl' },
  { keywords: ['curl barra', 'curl con barra', 'curl biceps barra'], video: 'male-Barbell-barbell-curl-front.mp4', slug: 'barbell-curl' },
  { keywords: ['curl predicador', 'curl scott', 'curl banco predicador'], video: 'male-Dumbbells-dumbbell-preacher-curl-front.mp4', slug: 'dumbbell-preacher-curl' },
  { keywords: ['curl inclinado mancuernas', 'curl inclinado', 'curl banco inclinado'], video: 'male-Dumbbells-dumbbell-incline-curl-front.mp4', slug: 'dumbbell-incline-curl' },
  { keywords: ['extension triceps polea', 'polea triceps', 'pushdown', 'jalones triceps', 'press down triceps'], video: 'male-Cables-cable-push-down-front.mp4', slug: 'cable-push-down' },
  { keywords: ['press frances', 'skull crusher', 'rompe craneo', 'skullcrusher'], video: 'male-Dumbbells-dumbbell-skullcrusher-front.mp4', slug: 'dumbbell-skullcrusher' },
  { keywords: ['fondos en paralelas', 'fondos paralelas', 'dips paralelas', 'paralelas'], video: 'male-Bodyweight-dips-front.mp4', slug: 'dips' },
  { keywords: ['fondos banco', 'fondos en banco', 'bench dips', 'dips banco'], video: 'male-Bodyweight-bench-dips-front.mp4', slug: 'bench-dips' },
  { keywords: ['sentadilla con barra', 'squat barra', 'sentadilla barra', 'sentadilla trasera'], video: 'male-Barbell-barbell-squat-front.mp4', slug: 'barbell-squat' },
  { keywords: ['sentadilla goblet', 'goblet squat', 'sentadilla con mancuerna'], video: 'male-dumbbell-goblet-squat-front.mp4', slug: 'dumbbell-goblet-squat' },
  { keywords: ['sentadilla sin peso', 'sentadilla libre', 'sentadilla bodyweight', 'air squat'], video: 'male-Bodyweight-bodyweight-squat-front.mp4', slug: 'bodyweight-squat' },
  { keywords: ['prensa de pierna', 'prensa pierna', 'prensa piernas', 'leg press', 'prensa de piernas'], video: 'male-Machine-machine-leg-press-front.mp4', slug: 'machine-leg-press' },
  { keywords: ['zancadas', 'lunges', 'estocadas', 'desdoblamientos'], video: 'male-Bodyweight-forward-lunges-front.mp4', slug: 'forward-lunges' },
  { keywords: ['step up', 'subida a banco', 'subida al cajon'], video: 'male-barbell-step-up-front.mp4', slug: 'barbell-step-up' },
  { keywords: ['peso muerto piernas rigidas', 'stiff leg', 'deadlift piernas rigidas'], video: 'male-barbell-stiff-leg-deadlift-front.mp4', slug: 'barbell-stiff-leg-deadlift' },
  { keywords: ['peso muerto rumano', 'rdl', 'romanian deadlift'], video: 'male-Dumbbells-dumbbell-romanian-deadlift-front.mp4', slug: 'dumbbell-romanian-deadlift' },
  { keywords: ['peso muerto', 'deadlift', 'levantamiento de peso'], video: 'male-Barbell-barbell-deadlift-front.mp4', slug: 'barbell-deadlift' },
  { keywords: ['curl femoral', 'curl isquiotibial', 'leg curl', 'femoral maquina', 'flexion de rodilla', 'flexion de rodilla en maquina'], video: 'male-machine-hamstring-curl-front.mp4', slug: 'machine-hamstring-curl' },
  { keywords: ['glute ham raise', 'ghr'], video: 'male-machine-glute-ham-raise-front.mp4', slug: 'machine-glute-ham-raise' },
  { keywords: ['curl nordico', 'nordic curl', 'nordico isquiotibial'], video: 'male-Bodyweight-nordic-hamstring-curl-front.mp4', slug: 'nordic-hamstring-curl' },
  { keywords: ['buenos dias barra', 'good morning barra', 'good mornings'], video: 'male-Barbell-barbell-low-bar-good-morning-front.mp4', slug: 'barbell-low-bar-good-morning' },
  { keywords: ['hip thrust', 'empuje de cadera', 'puente de gluteos barra'], video: 'male-Barbell-barbell-hip-thrust-front.mp4', slug: 'barbell-hip-thrust' },
  { keywords: ['abduccion de cadera', 'abduccion cadera', 'hip abduction'], video: 'male-Machine-machine-hip-abduction-front.mp4', slug: 'machine-hip-abduction' },
  { keywords: ['aduccion de cadera', 'aduccion cadera', 'hip adduction'], video: 'male-Machine-machine-hip-adduction-front.mp4', slug: 'machine-hip-adduction' },
  { keywords: ['extension lumbar', 'extension de espalda', 'hyperextension', 'superman'], video: 'male-Machine-machine-back-extension-front.mp4', slug: 'machine-back-extension' },
  { keywords: ['gemelos maquina de pie', 'gemelos maquina', 'pantorrillas maquina de pie'], video: 'male-machine-standing-calf-raises-front.mp4', slug: 'machine-standing-calf-raises' },
  { keywords: ['gemelos sentado maquina', 'gemelos sentado', 'seated calf raise'], video: 'male-machine-seated-calf-raise-front.mp4', slug: 'machine-seated-calf-raise' },
  { keywords: ['gemelos con barra', 'pantorrillas barra'], video: 'male-Barbell-barbell-calf-raises-front.mp4', slug: 'barbell-calf-raises' },
  { keywords: ['gemelos', 'pantorrillas', 'calf raises', 'elevaciones gemelos'], video: 'male-Bodyweight-calf-raises-front.mp4', slug: 'calf-raises' },
  { keywords: ['plancha frontal', 'plancha abdominal', 'plancha', 'plank'], video: 'male-Bodyweight-forearm-plank-front.mp4', slug: 'forearm-plank' },
  { keywords: ['crunch abdominal', 'crunch', 'encogimiento abdominal', 'abdominales'], video: 'male-Bodyweight-crunch-front.mp4', slug: 'crunch' },
  { keywords: ['swing kettlebell', 'kettlebell swing', 'swing pesa rusa'], video: 'male-Kettlebells-kettlebell-swing-front.mp4', slug: 'kettlebell-swing' },
]

const SCORE_STOP = new Set(['mancuernas', 'barra', 'polea', 'maquina', 'cable', 'cables', 'kettlebell', 'banda', 'con', 'los', 'las', 'una', 'unos'])

function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function findMusclewikiVideo(exerciseName: string): { video: string; slug: string } | null {
  const norm = normalizeText(exerciseName)
  for (const entry of MUSCLEWIKI_VIDEOS) {
    for (const kw of entry.keywords) {
      if (norm.includes(normalizeText(kw))) return { video: entry.video, slug: entry.slug }
    }
  }
  const words = norm.split(' ').filter(w => w.length > 3 && !SCORE_STOP.has(w))
  if (words.length === 0) return null
  let best: { video: string; slug: string } | null = null
  let bestScore = 0
  for (const entry of MUSCLEWIKI_VIDEOS) {
    let score = 0
    for (const kw of entry.keywords) {
      const kwWords = normalizeText(kw).split(' ').filter(w => w.length > 3 && !SCORE_STOP.has(w))
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
  video?: string
  slug?: string
  onClose: () => void
}

function TecnicaModal({ exerciseName, video, slug, onClose }: TecnicaModalProps) {
  const videoUrl = video ? `https://musclewiki.com/api-next/videos/${video}` : null
  const pageUrl = slug ? `https://musclewiki.com/es-es/exercise/${slug}` : null
  const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' técnica correcta')}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="rounded-2xl overflow-hidden w-full max-w-md" style={{ background: '#161820', border: '1px solid #2a2d3e' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1E2130' }}>
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: '#F5611A' }}>Técnica correcta</p>
            <h3 className="font-bold text-white">{exerciseName}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg cursor-pointer" style={{ background: '#1E2130', color: '#9CA3AF' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
        {videoUrl ? (
          <>
            <div style={{ background: '#0d0e14' }}>
              <video src={videoUrl} autoPlay loop muted playsInline className="w-full" style={{ maxHeight: 360, objectFit: 'contain' }} />
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <p className="text-xs" style={{ color: '#6B7280' }}>Fuente: MuscleWiki</p>
              <div className="flex items-center gap-3">
                <a href={ytSearch} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: '#6B7280' }}>
                  YouTube <ExternalLink style={{ width: 10, height: 10 }} />
                </a>
                {pageUrl && (
                  <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-medium cursor-pointer" style={{ color: '#F5611A' }}>
                    Ver completo <ExternalLink style={{ width: 12, height: 12 }} />
                  </a>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="px-5 py-8 flex flex-col items-center gap-4 text-center">
            <div className="text-4xl">📺</div>
            <div>
              <p className="text-white font-medium mb-1">Ver técnica en YouTube</p>
              <p className="text-sm" style={{ color: '#6B7280' }}>Este ejercicio no está disponible en MuscleWiki</p>
            </div>
            <a href={ytSearch} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer" style={{ background: '#FF0000', color: 'white' }}>
              <ExternalLink style={{ width: 14, height: 14 }} />
              Buscar en YouTube
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Generador modal ──────────────────────────────────────────────────────────

type Genero = 'hombre' | 'mujer'
type Equipamiento = 'gimnasio_completo' | 'gimnasio_basico' | 'casa' | 'sin_equipamiento'

interface GenModalProps {
  genero: Genero
  setGenero: (g: Genero) => void
  equipamiento: Equipamiento
  setEquipamiento: (e: Equipamiento) => void
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}

function GenModal({ genero, setGenero, equipamiento, setEquipamiento, loading, onConfirm, onClose }: GenModalProps) {
  const equipOpts: { value: Equipamiento; label: string; desc: string }[] = [
    { value: 'gimnasio_completo', label: 'Gimnasio completo', desc: 'Barras, máquinas, poleas, cables' },
    { value: 'gimnasio_basico', label: 'Gimnasio básico', desc: 'Barras, mancuernas y máquinas básicas' },
    { value: 'casa', label: 'Casa con mancuernas', desc: 'Mancuernas y peso corporal' },
    { value: 'sin_equipamiento', label: 'Sin equipamiento', desc: 'Solo peso corporal' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-sm" style={{ background: '#161820', border: '1px solid #2a2d3e' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1E2130' }}>
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: '#F5611A' }}>Generar con IA</p>
            <h3 className="font-bold text-white">Plan 4 semanas · Nippard</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg cursor-pointer" style={{ background: '#1E2130', color: '#9CA3AF' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div className="px-5 py-5 space-y-5">
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#6B7280' }}>Género</p>
            <div className="grid grid-cols-2 gap-2">
              {(['hombre', 'mujer'] as Genero[]).map(g => (
                <button key={g} onClick={() => setGenero(g)} className="py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                  style={{ background: genero === g ? 'rgba(245,97,26,0.2)' : '#1E2130', color: genero === g ? '#F5611A' : '#9CA3AF', border: `1px solid ${genero === g ? '#F5611A' : '#2a2d3e'}` }}>
                  {g === 'hombre' ? '♂ Hombre' : '♀ Mujer'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#6B7280' }}>Equipamiento disponible</p>
            <div className="space-y-2">
              {equipOpts.map(opt => (
                <button key={opt.value} onClick={() => setEquipamiento(opt.value)} className="w-full px-3.5 py-2.5 rounded-xl text-left cursor-pointer transition-all"
                  style={{ background: equipamiento === opt.value ? 'rgba(245,97,26,0.15)' : '#1E2130', border: `1px solid ${equipamiento === opt.value ? '#F5611A' : '#2a2d3e'}` }}>
                  <span className="text-sm font-medium" style={{ color: equipamiento === opt.value ? '#F5611A' : '#E5E7EB' }}>{opt.label}</span>
                  <span className="block text-xs mt-0.5" style={{ color: '#6B7280' }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={onConfirm} disabled={loading} className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
            style={{ background: loading ? '#7a3010' : '#F5611A', color: 'white', opacity: loading ? 0.8 : 1 }}>
            {loading ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Generando plan...</> : <>✨ Generar plan personalizado</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Input helpers ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: '#0D0E13',
  border: '1px solid #2a2d3e',
  borderRadius: 8,
  color: '#E5E7EB',
  fontSize: 13,
  padding: '4px 8px',
  outline: 'none',
  width: '100%',
}

const numInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: 52,
  textAlign: 'center',
}

// ─────────────────────────────────────────────────────────────────────────────

const PLANTILLAS = [
  { nombre: 'Push / Pull / Legs', dias: demoRutina.dias },
]

let ejCounter = 0
function newEjId() { return `new-ej-${++ejCounter}` }

export default function RutinaTab({ rutina: fallbackRutina, clientId, onToast }: RutinaTabProps) {
  const [realRutina, setRealRutina] = useState<Rutina4Semanas | null | 'loading'>('loading')
  const [assigning, setAssigning] = useState(false)
  const [showPlantillas, setShowPlantillas] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [tecnicaModal, setTecnicaModal] = useState<{ name: string; video?: string; slug?: string } | null>(null)
  const [showGenModal, setShowGenModal] = useState(false)
  const [genGenero, setGenGenero] = useState<Genero>('hombre')
  const [genEquipamiento, setGenEquipamiento] = useState<Equipamiento>('gimnasio_completo')

  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [editedDias, setEditedDias] = useState<DiaRutina[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!clientId) { setRealRutina(null); return }
    fetchRutina4Semanas(clientId).then(r => setRealRutina(r))
  }, [clientId])

  const handleAssign = async (plantilla: typeof PLANTILLAS[0]) => {
    if (!clientId) return
    setAssigning(true)
    setShowPlantillas(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sin sesión')
      await upsertRutina4Semanas(clientId, user.id, {
        nombre: plantilla.nombre, semana_actual: 1, activa: true, dias: plantilla.dias,
      })
      const updated = await fetchRutina4Semanas(clientId)
      setRealRutina(updated)
      onToast(`Rutina "${plantilla.nombre}" asignada correctamente`, 'success')
    } catch {
      onToast('Error al asignar la rutina', 'error')
    } finally { setAssigning(false) }
  }

  const handleGenerate = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setGenLoading(true)
    try {
      const perfil = await fetchPerfilEntrenamiento(clientId!)
      const clienteData = await import('../../../lib/supabase').then(m => m.fetchClienteData(clientId!))
      const res = await fetch('/api/generate-4week-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nivel: perfil?.nivel ?? 'principiante',
          diasEntreno: perfil?.diasEntreno ?? 3,
          tiempoEntrenoSemana: perfil?.tiempoEntrenoSemana ?? '3-4h',
          objetivo: clienteData?.objetivo ?? 'mantenimiento',
          lesiones: perfil?.lesiones ?? [],
          nombre: `Plan 4 Semanas — ${clienteData?.objetivo ?? 'Entrenamiento'}`,
          genero: genGenero,
          equipamiento: genEquipamiento,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? `Error ${res.status}`)
      const dias: DiaRutina[] = (data.dias ?? data.semanas?.[0]?.dias ?? []).map((d: DiaRutina, i: number) => ({
        ...d, id: d.id ?? `d${i}`,
        ejercicios: d.ejercicios.map((e, j) => ({ ...e, id: e.id ?? `e${i}-${j}` })),
      }))
      await upsertRutina4Semanas(clientId!, user.id, {
        nombre: data.nombre, semana_actual: 1, activa: true, dias, semanas: data.semanas, fecha_inicio: data.fecha_inicio,
      })
      const updated = await fetchRutina4Semanas(clientId!)
      setRealRutina(updated)
      setShowGenModal(false)
      onToast('✨ Plan 4 semanas generado. ¡Revísalo!', 'success')
    } catch (e) {
      onToast(`Error IA: ${e instanceof Error ? e.message : 'desconocido'}`, 'error')
    } finally { setGenLoading(false) }
  }

  // ── Edit handlers ───────────────────────────────────────────────────────────

  const handleEditStart = () => {
    const dias = displayRutina?.dias ?? []
    setEditedDias(JSON.parse(JSON.stringify(dias)))
    setEditMode(true)
  }

  const handleEditCancel = () => {
    setEditMode(false)
    setEditedDias([])
  }

  const handleEditSave = async () => {
    if (!clientId || !displayRutina) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sin sesión')
      const semanas: SemanaRutina[] = [
        { semana: 1, descripcion: 'Semana 1 — MEV: Base y técnica (RPE 7-8)', dias: editedDias },
        { semana: 2, descripcion: 'Semana 2 — Mid-MAV: +2 series, doble progresión en reps', dias: deriveWeek(editedDias, 2) },
        { semana: 3, descripcion: 'Semana 3 — Pico MAV: +4 series, más peso, RPE 8-9', dias: deriveWeek(editedDias, 3) },
        { semana: 4, descripcion: 'Semana 4 — Deload: 50% volumen, supercompensación', dias: deriveWeek(editedDias, 4) },
      ]
      await upsertRutina4Semanas(clientId, user.id, {
        nombre: (realRutina && realRutina !== 'loading') ? realRutina.nombre : displayRutina.nombre,
        semana_actual: (realRutina && realRutina !== 'loading') ? realRutina.semana_actual : 1,
        activa: true,
        dias: editedDias,
        semanas,
        fecha_inicio: (realRutina && realRutina !== 'loading') ? realRutina.fecha_inicio : undefined,
      })
      const updated = await fetchRutina4Semanas(clientId)
      setRealRutina(updated)
      setEditMode(false)
      setEditedDias([])
      onToast('Rutina guardada correctamente', 'success')
    } catch (e) {
      onToast(`Error al guardar: ${e instanceof Error ? e.message : 'desconocido'}`, 'error')
    } finally { setSaving(false) }
  }

  const updateDia = (diaId: string, field: keyof DiaRutina, value: string) => {
    setEditedDias(prev => prev.map(d => d.id === diaId ? { ...d, [field]: value } : d))
  }

  const updateEj = (diaId: string, ejId: string, field: keyof EjercicioRutina, value: string | number | boolean) => {
    setEditedDias(prev => prev.map(d =>
      d.id !== diaId ? d : {
        ...d,
        ejercicios: d.ejercicios.map(e => e.id !== ejId ? e : { ...e, [field]: value }),
      }
    ))
  }

  const deleteEj = (diaId: string, ejId: string) => {
    setEditedDias(prev => prev.map(d =>
      d.id !== diaId ? d : { ...d, ejercicios: d.ejercicios.filter(e => e.id !== ejId) }
    ))
  }

  const addEj = (diaId: string) => {
    const newEj: EjercicioRutina = {
      id: newEjId(), nombre: 'Nuevo ejercicio', series: 3, repsMin: 8, repsMax: 12,
      peso: 0, rpe: 7, rir: 3, descanso: 90,
    }
    setEditedDias(prev => prev.map(d =>
      d.id !== diaId ? d : { ...d, ejercicios: [...d.ejercicios, newEj] }
    ))
  }

  // ── Derived display ─────────────────────────────────────────────────────────

  const displayRutina: RutinaData | Rutina4Semanas | null = clientId
    ? (realRutina === 'loading' ? null : realRutina)
    : fallbackRutina

  const activeDias = editMode ? editedDias : displayRutina?.dias ?? []

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
      {tecnicaModal && !editMode && (
        <TecnicaModal exerciseName={tecnicaModal.name} video={tecnicaModal.video} slug={tecnicaModal.slug} onClose={() => setTecnicaModal(null)} />
      )}

      {/* Generador modal */}
      {showGenModal && (
        <GenModal genero={genGenero} setGenero={setGenGenero} equipamiento={genEquipamiento} setEquipamiento={setGenEquipamiento}
          loading={genLoading} onConfirm={handleGenerate} onClose={() => !genLoading && setShowGenModal(false)} />
      )}

      {/* Header */}
      <div className="rounded-xl p-5 mb-5" style={{ background: '#161820', border: editMode ? '1px solid #F5611A' : '1px solid #1E2130' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-white text-lg">
              {displayRutina ? displayRutina.nombre : 'Sin rutina asignada'}
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {displayRutina
                ? `Semana ${displayRutina.semana_actual} · ${activeDias.length} días/semana${editMode ? ' — Modo edición' : ''}`
                : 'Asigna una plantilla para comenzar'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {displayRutina && !editMode && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                Activa
              </span>
            )}
            {displayRutina && (
              editMode ? (
                <>
                  <button onClick={handleEditCancel} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer"
                    style={{ background: '#1E2130', color: '#9CA3AF' }}>
                    <X style={{ width: 14, height: 14 }} /> Cancelar
                  </button>
                  <button onClick={handleEditSave} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer"
                    style={{ background: saving ? '#14532d' : '#10B981', color: 'white' }}>
                    {saving
                      ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Guardando...</>
                      : <><Save style={{ width: 14, height: 14 }} /> Guardar</>}
                  </button>
                </>
              ) : (
                <button onClick={handleEditStart}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer"
                  style={{ background: '#1E2130', color: '#9CA3AF', border: '1px solid #2a2d3e' }}>
                  <Pencil style={{ width: 13, height: 13 }} /> Editar
                </button>
              )
            )}
          </div>
        </div>

        {/* Action buttons — hidden in edit mode */}
        {!editMode && (
          <div className="flex gap-2 flex-wrap relative">
            {displayRutina && (
              <button onClick={() => setShowPlantillas(s => !s)} disabled={assigning || genLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                style={{ background: '#1E2130', color: '#9CA3AF' }}>
                <RefreshCw style={{ width: 14, height: 14 }} /> Plantilla
              </button>
            )}
            {clientId && (
              <button disabled={genLoading || assigning} onClick={() => setShowGenModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                style={{ background: '#F5611A', color: 'white', opacity: genLoading ? 0.8 : 1 }}>
                ✨ Generar con IA
              </button>
            )}
            <button onClick={() => setShowPlantillas(s => !s)} disabled={assigning || genLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{ background: '#1E2130', color: '#9CA3AF', border: '1px solid #2a2d3e', opacity: assigning ? 0.7 : 1 }}>
              {assigning
                ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Asignando...</>
                : <><Plus style={{ width: 14, height: 14 }} /> {displayRutina ? 'Nueva plantilla' : 'Plantilla manual'}</>}
            </button>
            {showPlantillas && (
              <div className="absolute top-full left-0 mt-2 z-10 rounded-xl overflow-hidden shadow-xl"
                style={{ background: '#161820', border: '1px solid #2a2d3e', minWidth: 220 }}>
                <p className="px-4 py-2 text-xs font-medium" style={{ color: '#6B7280', borderBottom: '1px solid #1E2130' }}>
                  Plantillas disponibles
                </p>
                {PLANTILLAS.map(p => (
                  <button key={p.nombre} onClick={() => handleAssign(p)}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2 cursor-pointer">
                    <CheckCircle style={{ width: 14, height: 14, color: '#F5611A' }} />
                    {p.nombre}
                    <span className="ml-auto text-xs" style={{ color: '#6B7280' }}>{p.dias.length} días</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Days */}
      {displayRutina ? (
        <div className="space-y-4">
          {activeDias.map(dia => (
            <div key={dia.id} className="rounded-xl overflow-hidden" style={{ background: '#161820', border: '1px solid #1E2130' }}>
              {/* Day header */}
              <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#1E2130' }}>
                {editMode ? (
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <span className="font-semibold text-white whitespace-nowrap">{dia.nombre}</span>
                    <input
                      value={dia.titulo}
                      onChange={e => updateDia(dia.id, 'titulo', e.target.value)}
                      style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                      placeholder="Título del día"
                    />
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold text-white">{dia.nombre}</span>
                    <span className="text-sm ml-2" style={{ color: '#6B7280' }}>{dia.titulo}</span>
                  </div>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-3 shrink-0"
                  style={{ background: 'rgba(245,97,26,0.2)', color: '#F5611A' }}>
                  {dia.ejercicios.length} ejercicios
                </span>
              </div>

              {/* Exercises */}
              <div className="divide-y" style={{ borderColor: '#1E2130' }}>
                {dia.ejercicios.map(ej => {
                  const mw = findMusclewikiVideo(ej.nombre)
                  const descansoLabel = ej.descanso
                    ? ej.descanso >= 60 ? `${Math.round(ej.descanso / 60)}min` : `${ej.descanso}s`
                    : null

                  if (editMode) {
                    return (
                      <div key={ej.id} className="px-4 py-3 space-y-2">
                        {/* Row 1: nombre + delete */}
                        <div className="flex items-center gap-2">
                          <input
                            value={ej.nombre}
                            onChange={e => updateEj(dia.id, ej.id, 'nombre', e.target.value)}
                            style={{ ...inputStyle, flex: 1 }}
                            placeholder="Nombre del ejercicio"
                          />
                          <button onClick={() => deleteEj(dia.id, ej.id)}
                            className="p-1.5 rounded-lg cursor-pointer shrink-0"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                            title="Eliminar ejercicio">
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                        {/* Row 2: numeric fields */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="flex items-center gap-1">
                            <span className="text-xs" style={{ color: '#6B7280' }}>Series</span>
                            <input type="number" min={1} max={10} value={ej.series}
                              onChange={e => updateEj(dia.id, ej.id, 'series', Number(e.target.value))}
                              style={numInputStyle} />
                          </label>
                          <label className="flex items-center gap-1">
                            <span className="text-xs" style={{ color: '#6B7280' }}>Min</span>
                            <input type="number" min={1} max={30} value={ej.repsMin}
                              onChange={e => updateEj(dia.id, ej.id, 'repsMin', Number(e.target.value))}
                              style={numInputStyle} />
                          </label>
                          <label className="flex items-center gap-1">
                            <span className="text-xs" style={{ color: '#6B7280' }}>Max</span>
                            <input type="number" min={1} max={40} value={ej.repsMax}
                              onChange={e => updateEj(dia.id, ej.id, 'repsMax', Number(e.target.value))}
                              style={numInputStyle} />
                          </label>
                          <label className="flex items-center gap-1">
                            <span className="text-xs" style={{ color: '#6B7280' }}>RPE</span>
                            <input type="number" min={5} max={10} step={0.5} value={ej.rpe}
                              onChange={e => updateEj(dia.id, ej.id, 'rpe', Number(e.target.value))}
                              style={numInputStyle} />
                          </label>
                          <label className="flex items-center gap-1">
                            <span className="text-xs" style={{ color: '#6B7280' }}>RIR</span>
                            <input type="number" min={0} max={5} value={ej.rir ?? 2}
                              onChange={e => updateEj(dia.id, ej.id, 'rir', Number(e.target.value))}
                              style={numInputStyle} />
                          </label>
                          <label className="flex items-center gap-1">
                            <span className="text-xs" style={{ color: '#6B7280' }}>Desc(s)</span>
                            <input type="number" min={30} max={360} step={15} value={ej.descanso ?? 90}
                              onChange={e => updateEj(dia.id, ej.id, 'descanso', Number(e.target.value))}
                              style={{ ...numInputStyle, width: 60 }} />
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer ml-1">
                            <input type="checkbox" checked={!!ej.superset}
                              onChange={e => updateEj(dia.id, ej.id, 'superset', e.target.checked)}
                              style={{ accentColor: '#A78BFA', width: 14, height: 14 }} />
                            <span className="text-xs" style={{ color: '#A78BFA' }}>Superset</span>
                          </label>
                        </div>
                      </div>
                    )
                  }

                  // View mode
                  return (
                    <div key={ej.id} className="relative">
                      {ej.superset && (
                        <div className="absolute left-5 -top-px flex items-center gap-1.5" style={{ zIndex: 1 }}>
                          <span className="text-xs px-2 py-px rounded-sm font-medium" style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA', fontSize: 10 }}>
                            ↕ Superset
                          </span>
                        </div>
                      )}
                      <div className={`px-5 py-3 flex items-center gap-3 ${ej.superset ? 'pt-4' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-white">{ej.nombre}</span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>
                              {ej.series} series · {ej.repsMin}-{ej.repsMax} reps{ej.peso > 0 ? ` · ${ej.peso} kg` : ''}
                            </span>
                            {descansoLabel && (
                              <span className="text-xs" style={{ color: '#6B7280' }}>⏱ {descansoLabel}</span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => setTecnicaModal({ name: ej.nombre, video: mw?.video, slug: mw?.slug })}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg cursor-pointer shrink-0"
                          style={{ background: mw ? 'rgba(245,97,26,0.12)' : 'rgba(107,114,128,0.12)', color: mw ? '#F5611A' : '#6B7280', border: `1px solid ${mw ? 'rgba(245,97,26,0.25)' : 'rgba(107,114,128,0.2)'}` }}
                          title="Ver técnica correcta">
                          <Play style={{ width: 10, height: 10 }} /> Técnica
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {ej.rir !== undefined && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                              RIR {ej.rir}
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{ background: `${RpeColor(ej.rpe)}20`, color: RpeColor(ej.rpe) }}>
                            RPE {ej.rpe}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Add exercise button (edit mode only) */}
              {editMode && (
                <div className="px-4 py-3" style={{ borderTop: '1px solid #1E2130' }}>
                  <button onClick={() => addEj(dia.id)}
                    className="flex items-center gap-1.5 text-sm font-medium cursor-pointer px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(245,97,26,0.1)', color: '#F5611A', border: '1px dashed rgba(245,97,26,0.4)' }}>
                    <Plus style={{ width: 14, height: 14 }} /> Añadir ejercicio
                  </button>
                </div>
              )}
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
