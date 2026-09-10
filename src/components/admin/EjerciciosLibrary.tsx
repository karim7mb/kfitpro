import { useState } from 'react'
import { Search, Plus, Edit2, Trash2, Play, X } from 'lucide-react'
import { demoEjercicios, grupoColors } from '../../data/demo'

interface EjerciciosLibraryProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

type Grupo = 'Todos' | 'Piernas' | 'Pecho' | 'Espalda' | 'Brazos' | 'Hombros' | 'Glúteos'

const grupos: Grupo[] = ['Todos', 'Piernas', 'Pecho', 'Espalda', 'Brazos', 'Hombros', 'Glúteos']

interface EjercicioForm {
  nombre: string
  descripcion: string
  grupo: string
  youtubeUrl: string
}

export default function EjerciciosLibrary({ onToast }: EjerciciosLibraryProps) {
  const [ejercicios, setEjercicios] = useState(demoEjercicios)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<Grupo>('Todos')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<EjercicioForm>({ nombre: '', descripcion: '', grupo: 'Piernas', youtubeUrl: '' })

  const filtered = ejercicios.filter(e => {
    const matchSearch = e.nombre.toLowerCase().includes(search.toLowerCase()) ||
      e.descripcion.toLowerCase().includes(search.toLowerCase())
    const matchGrupo = filtro === 'Todos' || e.grupo === filtro
    return matchSearch && matchGrupo
  })

  const handleDelete = (id: string) => {
    setEjercicios(prev => prev.filter(e => e.id !== id))
    onToast('Ejercicio eliminado', 'info')
  }

  const handleSave = () => {
    if (!form.nombre) return
    const youtubeId = form.youtubeUrl.split('v=')[1]?.split('&')[0] || ''
    setEjercicios(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      nombre: form.nombre,
      descripcion: form.descripcion,
      grupo: form.grupo,
      youtubeUrl: form.youtubeUrl,
      youtubeId,
    }])
    setShowModal(false)
    setForm({ nombre: '', descripcion: '', grupo: 'Piernas', youtubeUrl: '' })
    onToast('Ejercicio creado correctamente', 'success')
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Ejercicios
            <span className="ml-2 text-base font-normal" style={{ color: '#6B7280' }}>
              {ejercicios.length} en biblioteca
            </span>
          </h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white cursor-pointer"
          style={{ background: '#F5611A' }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          Nuevo Ejercicio
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ width: 15, height: 15, color: '#6B7280' }} />
          <input
            type="text"
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: '#161820', border: '1px solid #1E2130' }}
          />
        </div>
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {grupos.map(g => (
            <button
              key={g}
              onClick={() => setFiltro(g)}
              className="px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap cursor-pointer transition-all"
              style={{
                background: filtro === g ? (grupoColors[g] || '#F5611A') : '#161820',
                color: filtro === g ? 'white' : '#6B7280',
                border: '1px solid',
                borderColor: filtro === g ? (grupoColors[g] || '#F5611A') : '#1E2130',
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(ej => (
          <div key={ej.id} className="rounded-xl overflow-hidden" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            {/* Thumbnail */}
            <div className="relative aspect-video" style={{ background: '#0D0E13' }}>
              {ej.youtubeId ? (
                <img
                  src={`https://img.youtube.com/vi/${ej.youtubeId}/mqdefault.jpg`}
                  alt={ej.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play style={{ width: 40, height: 40, color: '#2a2d3e' }} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Play style={{ width: 20, height: 20, color: 'white' }} />
                </div>
              </div>
            </div>
            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white text-sm">{ej.nombre}</h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0"
                  style={{ background: `${grupoColors[ej.grupo]}20`, color: grupoColors[ej.grupo] }}
                >
                  {ej.grupo}
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: '#6B7280' }}>{ej.descripcion}</p>
              <div className="flex gap-2">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ background: '#1E2130', color: '#9CA3AF' }}
                >
                  <Edit2 style={{ width: 12, height: 12 }} />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(ej.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                >
                  <Trash2 style={{ width: 12, height: 12 }} />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#161820', border: '1px solid #1E2130' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-lg">Nuevo Ejercicio</h3>
              <button onClick={() => setShowModal(false)} style={{ color: '#6B7280' }} className="cursor-pointer">
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { key: 'nombre', label: 'Nombre', placeholder: 'Press Banca' },
                { key: 'descripcion', label: 'Descripción', placeholder: 'Descripción técnica del ejercicio' },
                { key: 'youtubeUrl', label: 'URL YouTube', placeholder: 'https://youtube.com/watch?v=...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs mb-1.5 block" style={{ color: '#6B7280' }}>{label}</label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={form[key as keyof EjercicioForm]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: '#6B7280' }}>Grupo Muscular</label>
                <select
                  value={form.grupo}
                  onChange={e => setForm(prev => ({ ...prev, grupo: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none cursor-pointer"
                  style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}
                >
                  {['Piernas', 'Pecho', 'Espalda', 'Brazos', 'Hombros', 'Glúteos', 'Core'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                style={{ background: '#1E2130', color: '#9CA3AF' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
                style={{ background: '#F5611A' }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
