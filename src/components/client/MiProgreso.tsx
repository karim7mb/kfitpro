import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid } from 'recharts'
import { Plus, Loader2, Camera, Trophy, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import {
  fetchRegistrosPeso, addRegistroPeso, fetchClienteData,
  fetchMedidasCorporales, addMedidaCorporal,
  fetchRegistrosRendimiento, addRegistroRendimiento,
  fetchFotosProgreso, uploadFotoProgreso,
  type PesoEntry, type MedidaCorporal, type RegistroRendimiento,
} from '../../lib/supabase'
import { demoPeso, demoMedidas, demoRendimiento } from '../../data/demo'

interface MiProgresoProps {
  userId: string
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const isDemo = (id: string) => id.startsWith('client-') || id.startsWith('admin-')

type ProgresoTab = 'resumen' | 'cuerpo' | 'fuerza' | 'logros'
type MedidaKey = 'cintura' | 'cadera' | 'pecho' | 'brazo' | 'muslo'

const TABS: { id: ProgresoTab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'cuerpo', label: 'Cuerpo' },
  { id: 'fuerza', label: 'Fuerza' },
  { id: 'logros', label: 'Logros' },
]

const MEDIDAS_CONFIG: { key: MedidaKey; label: string }[] = [
  { key: 'cintura', label: 'Cintura' },
  { key: 'cadera', label: 'Cadera' },
  { key: 'pecho', label: 'Pecho' },
  { key: 'brazo', label: 'Brazo' },
  { key: 'muslo', label: 'Muslo' },
]

const EJERCICIOS_SUGERIDOS = ['Sentadilla', 'Press banca', 'Peso muerto', 'Press militar', 'Dominadas', 'Remo barra', 'Hip thrust', 'Fondos']

function formatFecha(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function CircleProgress({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const stroke = circ * (1 - Math.min(pct, 100) / 100)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8} stroke="#1E2130" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8}
        stroke="#F5611A" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={stroke}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text
        x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={size * 0.22} fontWeight="bold"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

export default function MiProgreso({ userId, onToast }: MiProgresoProps) {
  const demo = isDemo(userId)
  const [tab, setTab] = useState<ProgresoTab>('resumen')

  const [pesos, setPesos] = useState<PesoEntry[]>(demo ? demoPeso : [])
  const [pesoInicial, setPesoInicial] = useState<number>(demo ? (demoPeso[0]?.peso ?? 0) : 0)
  const [pesoObjetivo, setPesoObjetivo] = useState<number | undefined>(demo ? 78 : undefined)
  const [medidas, setMedidas] = useState<MedidaCorporal[]>(demo ? demoMedidas : [])
  const [rendimiento, setRendimiento] = useState<RegistroRendimiento[]>(demo ? demoRendimiento : [])
  const [fotos, setFotos] = useState<{ id: string; fecha: string; url: string }[]>([])
  const [loading, setLoading] = useState(!demo)

  const [showPesoForm, setShowPesoForm] = useState(false)
  const [newPeso, setNewPeso] = useState('')
  const [savingPeso, setSavingPeso] = useState(false)

  const [showMedidaForm, setShowMedidaForm] = useState(false)
  const [newMedida, setNewMedida] = useState<Partial<Record<MedidaKey, number>>>({})
  const [savingMedida, setSavingMedida] = useState(false)

  const [showPRForm, setShowPRForm] = useState(false)
  const [newPR, setNewPR] = useState({ ejercicio: '', peso_kg: '', reps: '' })
  const [savingPR, setSavingPR] = useState(false)

  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [lightbox, setLightbox] = useState<{ url: string; fecha: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (demo) return
    Promise.all([
      fetchRegistrosPeso(userId),
      fetchClienteData(userId),
      fetchMedidasCorporales(userId),
      fetchRegistrosRendimiento(userId),
      fetchFotosProgreso(userId),
    ]).then(([pesosData, cliente, medidasData, rendData, fotosData]) => {
      setPesos(pesosData)
      setPesoInicial(cliente?.pesoInicial ?? 0)
      setPesoObjetivo(cliente?.pesoObjetivo)
      setMedidas(medidasData)
      setRendimiento(rendData)
      setFotos(fotosData)
      setLoading(false)
    })
  }, [userId, demo])

  const actual = pesos.length > 0 ? pesos[pesos.length - 1].peso : pesoInicial
  const perdido = pesoInicial > 0 ? pesoInicial - actual : 0
  const totalPorPerder = pesoObjetivo && pesoInicial > 0 ? pesoInicial - pesoObjetivo : 0
  const pct = totalPorPerder > 0 ? Math.max(0, Math.min(100, (perdido / totalPorPerder) * 100)) : 0

  const semanaPasadaStr = (() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]
  })()
  const pesosEstaSemana = pesos.filter(p => p.fecha && p.fecha >= semanaPasadaStr)
  const pesoCambioSemana = pesosEstaSemana.length >= 2
    ? pesosEstaSemana[pesosEstaSemana.length - 1].peso - pesosEstaSemana[0].peso
    : pesos.length >= 2 ? pesos[pesos.length - 1].peso - pesos[pesos.length - 2].peso : null

  const ultimaMedida = medidas[medidas.length - 1]
  const primeraMedida = medidas[0]

  const medidasEstaSemana = medidas.filter(m => m.fecha && m.fecha >= semanaPasadaStr)
  const cinturaCambioSemana = medidasEstaSemana.length >= 2
    ? medidasEstaSemana[medidasEstaSemana.length - 1].cintura != null && medidasEstaSemana[0].cintura != null
      ? medidasEstaSemana[medidasEstaSemana.length - 1].cintura! - medidasEstaSemana[0].cintura!
      : null
    : ultimaMedida?.cintura != null && primeraMedida?.cintura != null && medidas.length > 1
      ? ultimaMedida.cintura - primeraMedida.cintura
      : null

  const ejerciciosMap = new Map<string, RegistroRendimiento[]>()
  rendimiento.forEach(r => {
    if (!ejerciciosMap.has(r.ejercicio)) ejerciciosMap.set(r.ejercicio, [])
    ejerciciosMap.get(r.ejercicio)!.push(r)
  })

  const handleAddPeso = async () => {
    const val = parseFloat(newPeso.replace(',', '.'))
    if (!val || val < 30 || val > 300) { onToast('Peso inválido', 'error'); return }
    setSavingPeso(true)
    try {
      if (!demo) await addRegistroPeso(userId, val, hoy)
      const mes = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      setPesos(prev => {
        const next = [...prev.filter(p => p.fecha !== hoy), { mes, peso: val, fecha: hoy }]
        return next.sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? ''))
      })
      setNewPeso(''); setShowPesoForm(false)
      onToast('Peso registrado', 'success')
    } catch { onToast('Error al guardar', 'error') }
    finally { setSavingPeso(false) }
  }

  const handleAddMedida = async () => {
    if (Object.values(newMedida).every(v => v == null)) { onToast('Añade al menos una medida', 'error'); return }
    setSavingMedida(true)
    try {
      const medida: Omit<MedidaCorporal, 'id'> = { fecha: hoy, ...newMedida }
      if (!demo) await addMedidaCorporal(userId, medida)
      setMedidas(prev => [...prev, medida])
      setNewMedida({}); setShowMedidaForm(false)
      onToast('Medidas guardadas', 'success')
    } catch { onToast('Error al guardar', 'error') }
    finally { setSavingMedida(false) }
  }

  const handleAddPR = async () => {
    if (!newPR.ejercicio.trim() || !newPR.peso_kg) { onToast('Ejercicio y peso obligatorios', 'error'); return }
    setSavingPR(true)
    try {
      const registro: Omit<RegistroRendimiento, 'id'> = {
        fecha: hoy,
        ejercicio: newPR.ejercicio.trim(),
        peso_kg: parseFloat(newPR.peso_kg),
        reps: newPR.reps ? parseInt(newPR.reps) : undefined,
      }
      if (!demo) await addRegistroRendimiento(userId, registro)
      setRendimiento(prev => [...prev, registro])
      setNewPR({ ejercicio: '', peso_kg: '', reps: '' }); setShowPRForm(false)
      onToast('PR registrado', 'success')
    } catch { onToast('Error al guardar', 'error') }
    finally { setSavingPR(false) }
  }

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (demo) { onToast('No disponible en demo', 'info'); return }
    setUploadingFoto(true)
    try {
      const url = await uploadFotoProgreso(userId, file)
      setFotos(prev => [{ id: Date.now().toString(), fecha: hoy, url }, ...prev])
      onToast('Foto subida', 'success')
    } catch { onToast('Error al subir foto', 'error') }
    finally {
      setUploadingFoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const logros = [
    { icon: '📊', titulo: 'Primer registro', desc: 'Registraste tu primer peso', unlocked: pesos.length >= 1 },
    { icon: '📏', titulo: 'Primeras medidas', desc: 'Registraste tus medidas corporales', unlocked: medidas.length >= 1 },
    { icon: '⬇️', titulo: 'Primer kilo', desc: 'Perdiste más de 1 kg', unlocked: perdido >= 1 },
    { icon: '💪', titulo: 'Primer PR', desc: 'Registraste tu primer récord', unlocked: rendimiento.length >= 1 },
    { icon: '🔥', titulo: '3 kg menos', desc: 'Perdiste más de 3 kg', unlocked: perdido >= 3 },
    { icon: '📸', titulo: 'Foto de progreso', desc: 'Subiste tu primera foto', unlocked: fotos.length >= 1 },
    { icon: '🏆', titulo: '5 kg menos', desc: 'Perdiste más de 5 kg', unlocked: perdido >= 5 },
    { icon: '⭐', titulo: '10 kg menos', desc: '¡Transformación real!', unlocked: perdido >= 10 },
  ]

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#F5611A' }} />
    </div>
  )

  const inputStyle = { background: '#1E2130', border: '1px solid #2a2d3e' } as const
  const cardStyle = { background: '#161820', border: '1px solid #1E2130' } as const
  const innerCardStyle = { background: '#1E2130' } as const

  return (
    <div className="pb-28">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">Progreso</h1>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-5 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all whitespace-nowrap"
            style={{
              background: tab === t.id ? '#F5611A' : '#161820',
              color: tab === t.id ? 'white' : '#6B7280',
              border: `1px solid ${tab === t.id ? '#F5611A' : '#1E2130'}`,
              flexShrink: 0,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ─── RESUMEN ─── */}
      {tab === 'resumen' && (
        <div className="px-4 space-y-4">
          {/* Esta semana */}
          <div className="rounded-2xl p-5" style={cardStyle}>
            <h3 className="font-semibold text-white mb-4 text-sm">Esta semana</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: 'Peso',
                  content: pesoCambioSemana !== null ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-base" style={{ color: pesoCambioSemana <= 0 ? '#10B981' : '#EF4444' }}>
                        {pesoCambioSemana > 0 ? '+' : ''}{pesoCambioSemana.toFixed(1)} kg
                      </span>
                      {pesoCambioSemana < 0
                        ? <TrendingDown style={{ width: 14, height: 14, color: '#10B981' }} />
                        : pesoCambioSemana > 0
                        ? <TrendingUp style={{ width: 14, height: 14, color: '#EF4444' }} />
                        : <Minus style={{ width: 14, height: 14, color: '#6B7280' }} />}
                    </div>
                  ) : <span className="font-bold text-base text-white">—</span>,
                },
                {
                  label: 'Cintura',
                  content: cinturaCambioSemana !== null
                    ? <span className="font-bold text-base" style={{ color: cinturaCambioSemana <= 0 ? '#10B981' : '#EF4444' }}>
                        {cinturaCambioSemana > 0 ? '+' : ''}{cinturaCambioSemana.toFixed(1)} cm
                      </span>
                    : ultimaMedida?.cintura
                    ? <span className="font-bold text-base text-white">{ultimaMedida.cintura} cm</span>
                    : <span className="font-bold text-base text-white">—</span>,
                },
                {
                  label: 'Peso actual',
                  content: <span className="font-bold text-base text-white">{actual > 0 ? `${actual} kg` : '—'}</span>,
                },
                {
                  label: 'Último PR',
                  content: rendimiento.length > 0
                    ? <span className="font-bold text-sm text-white truncate">{rendimiento[rendimiento.length - 1].ejercicio}</span>
                    : <span className="font-bold text-base text-white">—</span>,
                },
              ].map(({ label, content }) => (
                <div key={label} className="rounded-xl p-3" style={innerCardStyle}>
                  <div className="text-xs mb-1" style={{ color: '#6B7280' }}>{label}</div>
                  {content}
                </div>
              ))}
            </div>
          </div>

          {/* Goal circle */}
          <div className="rounded-2xl p-5" style={cardStyle}>
            <h3 className="font-semibold text-white mb-4 text-sm">Objetivo de peso</h3>
            <div className="flex items-center gap-5">
              <CircleProgress pct={pct} size={88} />
              <div className="flex-1 space-y-2">
                {[
                  { label: 'Inicial', val: pesoInicial > 0 ? `${pesoInicial} kg` : '—', color: '#6B7280' },
                  { label: 'Actual', val: actual > 0 ? `${actual} kg` : '—', color: 'white' },
                  { label: 'Objetivo', val: pesoObjetivo ? `${pesoObjetivo} kg` : 'Sin definir', color: '#F5611A' },
                  { label: 'Falta', val: pesoObjetivo && actual > 0 ? `${Math.abs(actual - pesoObjetivo).toFixed(1)} kg` : '—', color: '#6B7280' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span style={{ color: '#6B7280' }}>{label}</span>
                    <span className="font-semibold" style={{ color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Medidas snapshot */}
          {medidas.length > 0 && (
            <div className="rounded-2xl p-5" style={cardStyle}>
              <h3 className="font-semibold text-white mb-4 text-sm">Medidas actuales</h3>
              <div className="grid grid-cols-3 gap-2">
                {MEDIDAS_CONFIG.map(({ key, label }) => {
                  const val = ultimaMedida?.[key]
                  if (val == null) return null
                  const first = primeraMedida?.[key]
                  const diff = first != null && medidas.length > 1 ? val - first : null
                  return (
                    <div key={key} className="rounded-xl p-3 text-center" style={innerCardStyle}>
                      <div className="text-xs mb-0.5" style={{ color: '#6B7280' }}>{label}</div>
                      <div className="font-bold text-white text-sm">{val} <span className="text-xs font-normal" style={{ color: '#6B7280' }}>cm</span></div>
                      {diff !== null && (
                        <div className="text-xs mt-0.5 font-medium" style={{ color: diff < 0 ? '#10B981' : diff > 0 ? '#EF4444' : '#6B7280' }}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── CUERPO ─── */}
      {tab === 'cuerpo' && (
        <div className="px-4 space-y-4">
          {/* Objetivo peso */}
          <div className="rounded-2xl p-5" style={cardStyle}>
            <h3 className="font-semibold text-white mb-4">Objetivo de peso</h3>
            <div className="flex items-center gap-5">
              <CircleProgress pct={pct} size={88} />
              <div className="flex-1 space-y-2">
                {[
                  { label: 'Inicial', val: pesoInicial > 0 ? `${pesoInicial} kg` : '—', color: '#6B7280' },
                  { label: 'Actual', val: actual > 0 ? `${actual} kg` : '—', color: 'white' },
                  { label: 'Objetivo', val: pesoObjetivo ? `${pesoObjetivo} kg` : 'Sin definir', color: '#F5611A' },
                  {
                    label: 'Bajado',
                    val: perdido > 0 ? `${perdido.toFixed(1)} kg` : perdido < 0 ? `+${Math.abs(perdido).toFixed(1)} kg` : '—',
                    color: perdido > 0 ? '#10B981' : perdido < 0 ? '#EF4444' : '#6B7280',
                  },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span style={{ color: '#6B7280' }}>{label}</span>
                    <span className="font-semibold" style={{ color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart */}
          {pesos.length > 1 && (
            <div className="rounded-2xl p-5" style={cardStyle}>
              <h3 className="font-semibold text-white mb-4">Evolución del peso</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={pesos} margin={{ top: 22, right: 16, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2130" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#4B5563', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#4B5563', fontSize: 11 }} axisLine={false} tickLine={false}
                    domain={([min, max]: readonly [number, number]) => [Math.floor(min - 0.5), Math.ceil(max + 0.5)] as [number, number]}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1E2130', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9CA3AF' }}
                    itemStyle={{ color: '#F5611A' }}
                    formatter={(v: unknown) => [`${v} kg`, 'Peso']}
                  />
                  <Line type="monotone" dataKey="peso" stroke="#F5611A" strokeWidth={2.5}
                    dot={{ fill: '#F5611A', r: 4, strokeWidth: 2, stroke: '#0D0E13' }}
                    activeDot={{ r: 6, fill: '#F5611A' }}>
                    <LabelList dataKey="peso" position="top"
                      style={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 600 }}
                      formatter={(v: unknown) => `${v}`} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Peso registros */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Registros de peso</h3>
              <button onClick={() => setShowPesoForm(v => !v)}
                className="flex items-center gap-1 text-xs font-medium cursor-pointer"
                style={{ color: '#F5611A' }}>
                <Plus style={{ width: 13, height: 13 }} /> Añadir
              </button>
            </div>
            {showPesoForm && (
              <div className="px-5 pb-4 flex gap-2">
                <input type="number" placeholder="Ej: 79.5" value={newPeso}
                  onChange={e => setNewPeso(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPeso()}
                  className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none" style={inputStyle} />
                <button onClick={handleAddPeso} disabled={savingPeso}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style={{ background: '#F5611A', opacity: savingPeso ? 0.7 : 1 }}>
                  {savingPeso ? '...' : 'OK'}
                </button>
              </div>
            )}
            <div className="divide-y" style={{ borderColor: '#1E2130' }}>
              {[...pesos].reverse().slice(0, 8).map((p, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>
                    {p.fecha ? formatFecha(p.fecha) : p.mes}
                  </span>
                  <span className="font-semibold text-white text-sm">{p.peso} kg</span>
                </div>
              ))}
              {pesos.length === 0 && (
                <div className="px-5 py-6 text-center text-sm" style={{ color: '#4B5563' }}>Sin registros aún</div>
              )}
            </div>
          </div>

          {/* Medidas corporales */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Medidas corporales</h3>
              <button onClick={() => setShowMedidaForm(v => !v)}
                className="flex items-center gap-1 text-xs font-medium cursor-pointer"
                style={{ color: '#F5611A' }}>
                <Plus style={{ width: 13, height: 13 }} /> Añadir
              </button>
            </div>

            {showMedidaForm && (
              <div className="px-5 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {MEDIDAS_CONFIG.map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs mb-1 block" style={{ color: '#6B7280' }}>{label} (cm)</label>
                      <input type="number" placeholder="—"
                        value={newMedida[key] ?? ''}
                        onChange={e => setNewMedida(prev => ({
                          ...prev,
                          [key]: e.target.value ? parseFloat(e.target.value) : undefined,
                        }))}
                        className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none" style={inputStyle} />
                    </div>
                  ))}
                </div>
                <button onClick={handleAddMedida} disabled={savingMedida}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style={{ background: '#F5611A', opacity: savingMedida ? 0.7 : 1 }}>
                  {savingMedida ? 'Guardando...' : 'Guardar medidas'}
                </button>
              </div>
            )}

            {medidas.length > 0 ? (
              <div className="px-5 pb-5">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {MEDIDAS_CONFIG.map(({ key, label }) => {
                    const val = ultimaMedida?.[key]
                    if (val == null) return null
                    const first = primeraMedida?.[key]
                    const diff = first != null && medidas.length > 1 ? val - first : null
                    return (
                      <div key={key} className="rounded-xl p-3" style={innerCardStyle}>
                        <div className="text-xs mb-0.5" style={{ color: '#6B7280' }}>{label}</div>
                        <div className="font-bold text-white">{val}</div>
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>cm</div>
                        {diff !== null && (
                          <div className="text-xs mt-1 font-medium"
                            style={{ color: diff < 0 ? '#10B981' : diff > 0 ? '#EF4444' : '#6B7280' }}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)} cm
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="text-xs mb-2" style={{ color: '#6B7280' }}>Historial</div>
                <div className="space-y-2">
                  {[...medidas].reverse().slice(0, 5).map((m, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <span className="w-14 shrink-0 pt-0.5" style={{ color: '#6B7280' }}>{formatFecha(m.fecha)}</span>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {MEDIDAS_CONFIG.map(({ key, label }) => {
                          const v = m[key]
                          return v != null
                            ? <span key={key} style={{ color: '#9CA3AF' }}>{label}: <span className="text-white font-medium">{v}</span></span>
                            : null
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-5 pb-8 text-center text-sm" style={{ color: '#4B5563' }}>
                Sin medidas registradas
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── FUERZA ─── */}
      {tab === 'fuerza' && (
        <div className="px-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: '#6B7280' }}>Récords personales por ejercicio</p>
            <button onClick={() => setShowPRForm(v => !v)}
              className="flex items-center gap-1 text-xs font-medium cursor-pointer px-3 py-1.5 rounded-xl"
              style={{ background: '#F5611A', color: 'white' }}>
              <Plus style={{ width: 13, height: 13 }} /> Nuevo PR
            </button>
          </div>

          {showPRForm && (
            <div className="rounded-2xl p-5" style={cardStyle}>
              <h3 className="font-semibold text-white mb-4 text-sm">Registrar resultado</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#6B7280' }}>Ejercicio</label>
                  <input type="text" placeholder="Ej: Sentadilla" list="ej-list"
                    value={newPR.ejercicio}
                    onChange={e => setNewPR(prev => ({ ...prev, ejercicio: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none" style={inputStyle} />
                  <datalist id="ej-list">
                    {EJERCICIOS_SUGERIDOS.map(e => <option key={e} value={e} />)}
                  </datalist>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'peso_kg', label: 'Peso (kg)', placeholder: 'Ej: 100' },
                    { key: 'reps', label: 'Reps', placeholder: 'Ej: 5' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs mb-1 block" style={{ color: '#6B7280' }}>{label}</label>
                      <input type="number" placeholder={placeholder}
                        value={newPR[key as 'peso_kg' | 'reps']}
                        onChange={e => setNewPR(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none" style={inputStyle} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowPRForm(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                    style={{ background: '#1E2130', color: '#6B7280' }}>Cancelar</button>
                  <button onClick={handleAddPR} disabled={savingPR}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
                    style={{ background: '#F5611A', opacity: savingPR ? 0.7 : 1 }}>
                    {savingPR ? '...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {ejerciciosMap.size > 0 ? (
            Array.from(ejerciciosMap.entries()).map(([ejercicio, registros]) => {
              const byPeso = [...registros].sort((a, b) => (a.peso_kg ?? 0) - (b.peso_kg ?? 0))
              const pr = byPeso[byPeso.length - 1]
              const primero = byPeso[0]
              const mejora = pr.peso_kg != null && primero.peso_kg != null && registros.length > 1
                ? pr.peso_kg - primero.peso_kg : null
              return (
                <div key={ejercicio} className="rounded-2xl p-5" style={cardStyle}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white">{ejercicio}</h3>
                      <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        {registros.length} registro{registros.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {mejora != null && mejora > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                        <Trophy style={{ width: 11, height: 11 }} /> +{mejora} kg
                      </div>
                    )}
                  </div>
                  <div className="p-3 rounded-xl mb-3"
                    style={{ background: 'rgba(245,97,26,0.1)', border: '1px solid rgba(245,97,26,0.2)' }}>
                    <div className="text-xs mb-0.5" style={{ color: '#F5611A' }}>Récord personal</div>
                    <div className="font-bold text-white">
                      {pr.peso_kg != null ? `${pr.peso_kg} kg` : '—'}
                      {pr.reps ? ` × ${pr.reps} reps` : ''}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {[...registros].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 4).map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span style={{ color: '#6B7280' }}>{formatFecha(r.fecha)}</span>
                        <span className="font-medium text-white">
                          {r.peso_kg != null ? `${r.peso_kg} kg` : '—'}{r.reps ? ` × ${r.reps}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-2xl p-10 flex flex-col items-center gap-3" style={cardStyle}>
              <div className="text-4xl">🏋️</div>
              <p className="font-medium text-white">Sin registros aún</p>
              <p className="text-sm text-center" style={{ color: '#6B7280' }}>
                Registra tu primer resultado para ver tu progreso
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── LOGROS ─── */}
      {tab === 'logros' && (
        <div className="px-4 space-y-4">
          {/* Fotos */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Fotos de progreso</h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFoto}
                className="flex items-center gap-1 text-xs font-medium cursor-pointer px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(245,97,26,0.15)', color: '#F5611A', opacity: uploadingFoto ? 0.6 : 1 }}>
                {uploadingFoto
                  ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                  : <Camera style={{ width: 13, height: 13 }} />}
                {uploadingFoto ? 'Subiendo...' : 'Añadir'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadFoto} />
            </div>
            {fotos.length > 0 ? (
              <div className="px-5 pb-5 grid grid-cols-2 gap-2">
                {fotos.map(f => (
                  <div key={f.id} className="relative rounded-xl overflow-hidden cursor-pointer"
                    style={{ aspectRatio: '1', background: '#1E2130' }}
                    onClick={() => setLightbox({ url: f.url, fecha: f.fecha })}>
                    <img src={f.url} alt={formatFecha(f.fecha)} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs"
                      style={{ background: 'rgba(0,0,0,0.6)', color: '#9CA3AF' }}>
                      {formatFecha(f.fecha)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 pb-8 text-center">
                <div className="text-4xl mb-3">📸</div>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {demo
                    ? 'Las fotos no están disponibles en modo demo'
                    : 'Sube tu primera foto para comparar tu progreso'}
                </p>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white text-sm px-1">Logros desbloqueados</h3>
            {logros.map((l, i) => (
              <div key={i} className="rounded-2xl p-4 flex items-center gap-4"
                style={{
                  background: l.unlocked ? '#161820' : '#0D0E13',
                  border: `1px solid ${l.unlocked ? '#F5611A33' : '#1E2130'}`,
                  opacity: l.unlocked ? 1 : 0.45,
                }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: l.unlocked ? 'rgba(245,97,26,0.15)' : '#1E2130' }}>
                  {l.icon}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{l.titulo}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{l.desc}</p>
                </div>
                {l.unlocked && (
                  <div className="ml-auto text-xs font-medium px-2 py-1 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>✓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightbox(null)}>
          <div className="px-4 pb-3 w-full flex items-center justify-between">
            <span className="text-sm" style={{ color: '#9CA3AF' }}>{formatFecha(lightbox.fecha)}</span>
            <button className="text-white text-2xl leading-none cursor-pointer" onClick={() => setLightbox(null)}>×</button>
          </div>
          <img
            src={lightbox.url}
            alt={formatFecha(lightbox.fecha)}
            className="max-w-full max-h-[80vh] rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
