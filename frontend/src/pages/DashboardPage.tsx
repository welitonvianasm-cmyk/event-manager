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
  PRESENCIAL: 'bg-[#EDE9F8] text-[#7C5CBF]',
  ONLINE: 'bg-[#D9F0FC] text-[#0C6E93]',
  HIBRIDO: 'bg-[#FEF3CD] text-[#92610A]',
}
const statusColor: Record<string, string> = {
  RASCUNHO: 'bg-[#F8F7FC] text-[#9CA3AF] border border-black/[0.08]',
  EM_ANDAMENTO: 'bg-[#D9F0FC] text-[#0C6E93]',
  CONCLUIDO: 'bg-[#D4EDDA] text-[#155724]',
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

  if (isLoading) return <p className="text-sm text-[#9CA3AF]">Carregando...</p>

  const total = events?.length ?? 0
  const emAndamento = events?.filter(e => e.status === 'EM_ANDAMENTO').length ?? 0
  const concluido = events?.filter(e => e.status === 'CONCLUIDO').length ?? 0
  const chartData = buildChartData(events ?? [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1A2E]">Eventos</h1>
          <p className="text-sm text-[#6B7280]">{total} evento(s) cadastrado(s)</p>
        </div>
        <Link to="/events/new"
          className="bg-[#7C5CBF] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#9B7DD4] transition-colors">
          + Novo Evento
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-5">
          <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-2">Total de Eventos</p>
          <p className="text-[28px] font-bold text-[#1A1A2E]">{total}</p>
        </div>
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-5">
          <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-2">Em Andamento</p>
          <p className="text-[28px] font-bold text-[#0C6E93]">{emAndamento}</p>
        </div>
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-5">
          <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-2">Concluídos</p>
          <p className="text-[28px] font-bold text-[#155724]">{concluido}</p>
        </div>
      </div>

      {/* Chart */}
      {total > 0 && (
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-5 mb-6">
          <p className="text-sm font-bold text-[#1A1A2E] mb-4">Eventos criados por mês</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C5CBF" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7C5CBF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E0F3" />
              <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, color: '#1A1A2E', fontSize: 12 }}
                labelStyle={{ color: '#6B7280' }}
              />
              <Area type="monotone" dataKey="count" stroke="#7C5CBF" strokeWidth={2} fill="url(#purpleGrad)" name="Eventos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Events grid */}
      {!events?.length ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-bold text-[#1A1A2E]">Nenhum evento ainda</p>
          <p className="text-sm mt-1 text-[#9CA3AF]">Clique em "Novo Evento" para começar</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map(event => {
            const progress = calcProgress(event)
            return (
              <Link key={event.id} to={`/events/${event.id}`}
                className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-5 hover:shadow-[0_4px_16px_rgba(124,92,191,0.12)] transition-shadow block">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${typeColor[event.eventType]}`}>
                    {typeLabel[event.eventType]}
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor[event.status]}`}>
                    {statusLabel[event.status]}
                  </span>
                </div>
                <h2 className="font-bold text-[#1A1A2E] mb-1">{event.name}</h2>
                <p className="text-xs text-[#9CA3AF] mb-4">
                  {new Date(event.startDate).toLocaleDateString('pt-BR')} · {event.totalDays} dia(s)
                </p>
                <div>
                  <div className="flex justify-between text-xs text-[#9CA3AF] mb-1">
                    <span>Checklist</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-[#EDE9F8] rounded-full overflow-hidden">
                    <div className="h-full bg-[#7C5CBF] rounded-full transition-all" style={{ width: `${progress}%` }} />
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
