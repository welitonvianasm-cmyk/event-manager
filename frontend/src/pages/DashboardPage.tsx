import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api/client'

interface Event {
  id: string
  name: string
  eventType: 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'
  totalDays: number
  startDate: string
  createdAt: string
  status: 'RASCUNHO' | 'EM_ANDAMENTO' | 'CONCLUIDO'
  checklistSections: { items: { status: string }[] }[]
}

const typeLabel: Record<string, string> = { PRESENCIAL: 'Presencial', ONLINE: 'Online', HIBRIDO: 'Híbrido' }
const typeColor: Record<string, string> = {
  PRESENCIAL: 'bg-blue-500/20 text-blue-400',
  ONLINE: 'bg-purple-500/20 text-purple-400',
  HIBRIDO: 'bg-orange-500/20 text-orange-400',
}
const statusColor: Record<string, string> = {
  RASCUNHO: 'bg-gray-700 text-gray-400',
  EM_ANDAMENTO: 'bg-amber-500/20 text-amber-400',
  CONCLUIDO: 'bg-emerald-500/20 text-emerald-400',
}
const statusLabel: Record<string, string> = { RASCUNHO: 'Rascunho', EM_ANDAMENTO: 'Em andamento', CONCLUIDO: 'Concluído' }

function calcProgress(event: Event) {
  const items = event.checklistSections.flatMap(s => s.items)
  if (!items.length) return 0
  return Math.round((items.filter(i => i.status === 'CONCLUIDO').length / items.length) * 100)
}

function buildChartData(events: Event[]) {
  const now = new Date()
  const months: { month: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), count: 0 })
  }
  for (const ev of events) {
    const d = new Date(ev.createdAt)
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1)
      if (d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()) {
        months[5 - i].count++
        break
      }
    }
  }
  return months
}

export default function DashboardPage() {
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then(r => r.data),
  })

  if (isLoading) return <p className="text-gray-500 text-sm">Carregando...</p>

  const total = events?.length ?? 0
  const emAndamento = events?.filter(e => e.status === 'EM_ANDAMENTO').length ?? 0
  const concluido = events?.filter(e => e.status === 'CONCLUIDO').length ?? 0
  const chartData = buildChartData(events ?? [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Eventos</h1>
          <p className="text-sm text-gray-500">{total} evento(s) cadastrado(s)</p>
        </div>
        <Link to="/events/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Novo Evento
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total de Eventos</p>
          <p className="text-3xl font-bold text-white">{total}</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Em Andamento</p>
          <p className="text-3xl font-bold text-amber-400">{emAndamento}</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Concluídos</p>
          <p className="text-3xl font-bold text-emerald-400">{concluido}</p>
        </div>
      </div>

      {/* Chart */}
      {total > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold text-gray-300 mb-4">Eventos criados por mês</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb', fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Area type="monotone" dataKey="count" stroke="#60A5FA" strokeWidth={2} fill="url(#blueGrad)" name="Eventos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Events grid */}
      {!events?.length ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium text-gray-500">Nenhum evento ainda</p>
          <p className="text-sm mt-1 text-gray-600">Clique em "Novo Evento" para começar</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map(event => {
            const progress = calcProgress(event)
            return (
              <Link key={event.id} to={`/events/${event.id}`}
                className="bg-gray-900 border border-gray-700 rounded-2xl p-5 hover:border-gray-600 hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[event.eventType]}`}>
                    {typeLabel[event.eventType]}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[event.status]}`}>
                    {statusLabel[event.status]}
                  </span>
                </div>
                <h2 className="font-semibold text-white mb-1">{event.name}</h2>
                <p className="text-xs text-gray-500 mb-4">
                  {new Date(event.startDate).toLocaleDateString('pt-BR')} · {event.totalDays} dia(s)
                </p>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Checklist</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
