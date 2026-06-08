import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
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

interface EventFinancial {
  id: string
  name: string
  startDate: string
  ticketRevenue: number
  offerRevenue: number
  totalRevenue: number
  totalExpenses: number
  profit: number
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

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function calcProgress(event: Event) {
  const items = event.checklistSections.flatMap(s => s.items)
  if (!items.length) return 0
  return Math.round((items.filter(i => i.status === 'CONCLUIDO').length / items.length) * 100)
}

function buildCreationChart(events: Event[]) {
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
  const [filterEventId, setFilterEventId] = useState('')
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then(r => r.data),
  })

  const { data: financials = [] } = useQuery<EventFinancial[]>({
    queryKey: ['all-financial'],
    queryFn: () => api.get('/events/all-financial').then(r => r.data),
  })

  const filteredFinancials = useMemo(() => {
    let list = financials
    if (filterEventId) list = list.filter(f => f.id === filterEventId)
    if (filterStart) list = list.filter(f => new Date(f.startDate) >= new Date(filterStart))
    if (filterEnd) list = list.filter(f => new Date(f.startDate) <= new Date(filterEnd + 'T23:59:59'))
    return list
  }, [financials, filterEventId, filterStart, filterEnd])

  const totalRevenue = filteredFinancials.reduce((s, f) => s + f.totalRevenue, 0)
  const totalExpenses = filteredFinancials.reduce((s, f) => s + f.totalExpenses, 0)
  const totalProfit = totalRevenue - totalExpenses
  const roi = totalExpenses > 0 ? totalRevenue / totalExpenses : 0

  if (isLoading) return <p className="text-sm text-[#9CA3AF]">Carregando...</p>

  const total = events?.length ?? 0
  const emAndamento = events?.filter(e => e.status === 'EM_ANDAMENTO').length ?? 0
  const concluido = events?.filter(e => e.status === 'CONCLUIDO').length ?? 0
  const creationChartData = buildCreationChart(events ?? [])

  const barChartData = filteredFinancials.map(f => ({
    name: f.name.length > 12 ? f.name.slice(0, 12) + '…' : f.name,
    Convites: Math.round(f.ticketRevenue),
    Ofertas: Math.round(f.offerRevenue),
    Gastos: Math.round(f.totalExpenses),
    Lucro: Math.round(f.profit),
  }))

  const hasFilters = filterEventId || filterStart || filterEnd

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
        <div className="bg-[#7C5CBF] rounded-[14px] shadow-[0_1px_3px_rgba(124,92,191,0.3)] p-5">
          <p className="text-[9px] font-bold text-white/70 uppercase tracking-[0.1em] mb-2">Total de Eventos</p>
          <p className="text-[28px] font-bold text-white">{total}</p>
        </div>
        <div className="bg-[#7C5CBF] rounded-[14px] shadow-[0_1px_3px_rgba(124,92,191,0.3)] p-5">
          <p className="text-[9px] font-bold text-white/70 uppercase tracking-[0.1em] mb-2">Em Andamento</p>
          <p className="text-[28px] font-bold text-white">{emAndamento}</p>
        </div>
        <div className="bg-[#7C5CBF] rounded-[14px] shadow-[0_1px_3px_rgba(124,92,191,0.3)] p-5">
          <p className="text-[9px] font-bold text-white/70 uppercase tracking-[0.1em] mb-2">Realizados</p>
          <p className="text-[28px] font-bold text-white">{concluido}</p>
        </div>
      </div>

      {/* ROI card — only when ≥ 2.5 */}
      {roi >= 2.5 && (
        <div className="bg-[#EDE9F8] rounded-[14px] border border-[#7C5CBF]/20 p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#7C5CBF] flex items-center justify-center text-white text-xl shrink-0">🏆</div>
          <div>
            <p className="text-[9px] font-bold text-[#7C5CBF] uppercase tracking-[0.1em]">ROI Geral dos Eventos</p>
            <p className="text-[28px] font-bold text-[#7C5CBF]">{roi.toFixed(1)}x</p>
            <p className="text-xs text-[#7C5CBF]/70">Para cada R$1 investido, R${roi.toFixed(2)} de retorno</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-[#9CA3AF]">Receita total</p>
            <p className="font-bold text-[#1A1A2E]">{fmt(totalRevenue)}</p>
          </div>
        </div>
      )}

      {/* Financial charts section */}
      {financials.length > 0 && (
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="text-sm font-bold text-[#1A1A2E]">Financeiro por Evento</p>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={filterEventId} onChange={e => setFilterEventId(e.target.value)}
                className="text-xs bg-white border border-black/[0.08] text-[#6B7280] rounded-[8px] px-2 py-1.5 focus:outline-none focus:border-[#7C5CBF]">
                <option value="">Todos os eventos</option>
                {financials.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
                placeholder="De"
                className="text-xs bg-white border border-black/[0.08] text-[#6B7280] rounded-[8px] px-2 py-1.5 focus:outline-none focus:border-[#7C5CBF]" />
              <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
                placeholder="Até"
                className="text-xs bg-white border border-black/[0.08] text-[#6B7280] rounded-[8px] px-2 py-1.5 focus:outline-none focus:border-[#7C5CBF]" />
              {hasFilters && (
                <button onClick={() => { setFilterEventId(''); setFilterStart(''); setFilterEnd('') }}
                  className="text-xs text-red-400 hover:text-red-500 font-bold">✕ Limpar</button>
              )}
            </div>
          </div>

          {/* Summary mini-cards */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-[#D4EDDA] rounded-[10px] p-3 text-center">
              <p className="text-[9px] font-bold text-[#155724] uppercase tracking-[0.1em] mb-0.5">Receita Convites</p>
              <p className="text-base font-bold text-[#155724]">{fmt(filteredFinancials.reduce((s,f) => s + f.ticketRevenue, 0))}</p>
            </div>
            <div className="bg-[#D9F0FC] rounded-[10px] p-3 text-center">
              <p className="text-[9px] font-bold text-[#0C6E93] uppercase tracking-[0.1em] mb-0.5">Receita Ofertas</p>
              <p className="text-base font-bold text-[#0C6E93]">{fmt(filteredFinancials.reduce((s,f) => s + f.offerRevenue, 0))}</p>
            </div>
            <div className="bg-[#FDEDEE] rounded-[10px] p-3 text-center">
              <p className="text-[9px] font-bold text-[#C0392B] uppercase tracking-[0.1em] mb-0.5">Gastos</p>
              <p className="text-base font-bold text-[#C0392B]">{fmt(totalExpenses)}</p>
            </div>
            <div className={`rounded-[10px] p-3 text-center ${totalProfit >= 0 ? 'bg-[#EDE9F8]' : 'bg-[#FEF3CD]'}`}>
              <p className={`text-[9px] font-bold uppercase tracking-[0.1em] mb-0.5 ${totalProfit >= 0 ? 'text-[#7C5CBF]' : 'text-[#92610A]'}`}>Lucro Total</p>
              <p className={`text-base font-bold ${totalProfit >= 0 ? 'text-[#7C5CBF]' : 'text-[#92610A]'}`}>{fmt(totalProfit)}</p>
            </div>
          </div>

          {filteredFinancials.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barChartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0F3" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, color: '#1A1A2E', fontSize: 12 }}
                  formatter={(value) => fmt(Number(value))}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#6B7280' }} />
                <Bar dataKey="Convites" fill="#4CD080" radius={[4,4,0,0]} />
                <Bar dataKey="Ofertas" fill="#45B5E8" radius={[4,4,0,0]} />
                <Bar dataKey="Gastos" fill="#E87D7D" radius={[4,4,0,0]} />
                <Bar dataKey="Lucro" fill="#7C5CBF" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[#9CA3AF] text-center py-6">Nenhum evento encontrado com este filtro</p>
          )}
        </div>
      )}

      {/* Creation chart */}
      {total > 1 && (
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-5 mb-6">
          <p className="text-sm font-bold text-[#1A1A2E] mb-4">Eventos criados por mês</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={creationChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
                className="bg-[#7C5CBF] rounded-[14px] shadow-[0_1px_3px_rgba(124,92,191,0.3)] p-5 hover:bg-[#9B7DD4] transition-colors block">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
                    {typeLabel[event.eventType]}
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
                    {statusLabel[event.status]}
                  </span>
                </div>
                <h2 className="font-bold text-white mb-1">{event.name}</h2>
                <p className="text-xs text-white/70 mb-4">
                  {new Date(event.startDate).toLocaleDateString('pt-BR')} · {event.totalDays} dia(s)
                </p>
                <div>
                  <div className="flex justify-between text-xs text-white/70 mb-1">
                    <span>Checklist</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
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
