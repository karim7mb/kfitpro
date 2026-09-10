import { Download, Share2 } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

interface ReportesTabProps {
  client: { nombre: string; cumplimiento: number; semanas: number; pesoInicial: number }
  pesoData: { mes: string; peso: number }[]
  nutricion: { cumplimientoSemanal: { dia: string; valor: number }[] }
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

export default function ReportesTab({ client, pesoData, nutricion, onToast }: ReportesTabProps) {
  const pesoActual = pesoData[pesoData.length - 1].peso
  const cambioPeso = pesoActual - client.pesoInicial

  const handleExportPDF = () => {
    onToast('Reporte PDF generado y descargado', 'success')
  }

  const handleShare = () => {
    onToast('Enlace de reporte copiado al portapapeles', 'info')
  }

  return (
    <div className="space-y-5">
      {/* KPI metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Cumplimiento', value: `${client.cumplimiento}%`, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Semanas Activo', value: `${client.semanas}`, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
          { label: 'Cambio Peso', value: `${cambioPeso > 0 ? '+' : ''}${cambioPeso} kg`, color: cambioPeso < 0 ? '#10B981' : '#EF4444', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Sesiones', value: '38', color: '#F5611A', bg: 'rgba(245,97,26,0.1)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: bg, border: `1px solid ${color}30` }}>
            <div className="text-2xl font-bold mb-1" style={{ color }}>{value}</div>
            <div className="text-xs" style={{ color: '#6B7280' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="rounded-xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <h3 className="font-semibold text-white mb-4">Progreso de Peso</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={pesoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2130" />
              <XAxis dataKey="mes" stroke="#4B5563" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis stroke="#4B5563" tick={{ fontSize: 11, fill: '#6B7280' }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#1E2130', border: '1px solid #2a2d3e', borderRadius: 8 }}
                formatter={(v: number) => [`${v} kg`, 'Peso']}
              />
              <Line type="monotone" dataKey="peso" stroke="#F5611A" strokeWidth={2.5} dot={{ fill: '#F5611A', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
          <h3 className="font-semibold text-white mb-4">Cumplimiento Semanal</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={nutricion.cumplimientoSemanal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2130" />
              <XAxis dataKey="dia" stroke="#4B5563" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis stroke="#4B5563" tick={{ fontSize: 11, fill: '#6B7280' }} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ background: '#1E2130', border: '1px solid #2a2d3e', borderRadius: 8 }}
                formatter={(v: number) => [`${v}%`, 'Cumplimiento']}
              />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {nutricion.cumplimientoSemanal.map(entry => (
                  <Cell key={entry.dia} fill={entry.valor >= 90 ? '#10B981' : entry.valor >= 70 ? '#F59E0B' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm cursor-pointer transition-all"
          style={{ background: '#F5611A', color: 'white' }}
        >
          <Download style={{ width: 16, height: 16 }} />
          Exportar PDF
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm cursor-pointer"
          style={{ background: '#1E2130', color: '#9CA3AF', border: '1px solid #2a2d3e' }}
        >
          <Share2 style={{ width: 16, height: 16 }} />
          Compartir con Cliente
        </button>
      </div>
    </div>
  )
}
