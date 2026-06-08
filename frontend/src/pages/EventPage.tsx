import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

const typeLabel: Record<string, string> = { PRESENCIAL: 'Presencial', ONLINE: 'Online', HIBRIDO: 'Híbrido' }

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const deadlineColors: Record<string, string> = {
  CHECKLIST: 'bg-[#7C5CBF]',
  PAGAMENTO: 'bg-[#F4C542]',
}
const statusDot: Record<string, string> = {
  PENDENTE: 'bg-[#FF6B8A]',
  EM_ANDAMENTO: 'bg-[#F4C542]',
  CONCLUIDO: 'bg-[#4CD080]',
  PAGO: 'bg-[#4CD080]',
  PARCIAL: 'bg-[#F4C542]',
}

function CalendarView({ deadlines }: { deadlines: any[] }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const daysInMonth = getDaysInMonth(year, month)
  const firstWeekday = getFirstWeekday(year, month)
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const byDay: Record<number, any[]> = {}
  for (const d of deadlines) {
    const dt = new Date(d.date)
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      const day = dt.getDate()
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(d)
    }
  }

  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }}
          className="text-[#9CA3AF] hover:text-[#1A1A2E] px-2 py-1 rounded-[8px] hover:bg-[#F3F2F8] transition-colors">‹</button>
        <span className="font-bold text-[#1A1A2E]">{monthNames[month]} {year}</span>
        <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }}
          className="text-[#9CA3AF] hover:text-[#1A1A2E] px-2 py-1 rounded-[8px] hover:bg-[#F3F2F8] transition-colors">›</button>
      </div>

      <div className="grid grid-cols-7 gap-0 text-center">
        {weekdays.map(w => (
          <div key={w} className="text-[11px] text-[#9CA3AF] font-bold py-1">{w}</div>
        ))}
        {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
          const items = byDay[day] ?? []
          const isSelected = selected === day
          return (
            <div key={day} onClick={() => setSelected(isSelected ? null : day)}
              className={`relative p-1 rounded-[8px] cursor-pointer transition-colors min-h-[40px] ${
                isToday ? 'bg-[#EDE9F8] border border-[#7C5CBF]/30' : 'hover:bg-[#F3F2F8]'
              } ${isSelected ? 'ring-2 ring-[#7C5CBF]' : ''}`}>
              <span className={`text-xs font-bold ${isToday ? 'text-[#7C5CBF]' : 'text-[#6B7280]'}`}>{day}</span>
              {items.length > 0 && (
                <div className="flex gap-0.5 flex-wrap justify-center mt-0.5">
                  {items.slice(0, 3).map((item: any, idx: number) => (
                    <span key={idx} className={`w-1.5 h-1.5 rounded-full ${deadlineColors[item.type] ?? 'bg-[#9CA3AF]'}`} />
                  ))}
                  {items.length > 3 && <span className="text-[9px] text-[#9CA3AF]">+{items.length - 3}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selected && byDay[selected] && (
        <div className="mt-4 border-t border-black/[0.08] pt-4">
          <p className="text-[11px] font-bold text-[#9CA3AF] mb-2">
            {selected} de {monthNames[month]}
          </p>
          <div className="flex flex-col gap-2">
            {byDay[selected].map((item: any) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[item.status] ?? 'bg-[#9CA3AF]'}`} />
                <span className="flex-1 text-[#1A1A2E]">{item.title}</span>
                <span className="text-xs text-[#9CA3AF]">{item.type === 'PAGAMENTO' ? '💰 Pagamento' : '✅ Tarefa'}</span>
                {item.person && <span className="text-xs bg-[#F3F2F8] px-2 py-0.5 rounded-full text-[#6B7280]">{item.person}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {deadlines.length === 0 && (
        <p className="text-center text-xs text-[#9CA3AF] mt-4">Nenhum prazo cadastrado ainda.<br />Adicione datas limite no checklist e nos fornecedores.</p>
      )}
    </div>
  )
}

// ─── People Panel ─────────────────────────────────────────────────────────────

function PeoplePanel({ eventId }: { eventId: string }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '' })

  const { data: people } = useQuery<any[]>({
    queryKey: ['people', eventId],
    queryFn: () => api.get(`/events/${eventId}/people`).then(r => r.data),
  })

  const add = useMutation({
    mutationFn: (data: object) => api.post(`/events/${eventId}/people`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['people', eventId] }); setShowForm(false); setForm({ name: '', email: '', phone: '', role: '' }) },
  })
  const remove = useMutation({
    mutationFn: (personId: string) => api.delete(`/events/${eventId}/people/${personId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people', eventId] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#1A1A2E]">Equipe do Evento</h3>
        <button onClick={() => setShowForm(true)}
          className="text-sm text-[#7C5CBF] hover:text-[#9B7DD4] font-bold transition-colors">+ Adicionar pessoa</button>
      </div>

      {showForm && (
        <div className="bg-[#F8F7FC] rounded-[10px] p-4 mb-4 border border-black/[0.08]">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-white border border-black/[0.08] text-[#1A1A2E] rounded-[10px] px-3 py-1.5 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Função / Cargo</label>
              <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="Ex: Coordenador, Fotógrafo..."
                className="w-full bg-white border border-black/[0.08] text-[#1A1A2E] placeholder-[#9CA3AF] rounded-[10px] px-3 py-1.5 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-white border border-black/[0.08] text-[#1A1A2E] rounded-[10px] px-3 py-1.5 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Telefone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-white border border-black/[0.08] text-[#1A1A2E] rounded-[10px] px-3 py-1.5 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setForm({ name: '', email: '', phone: '', role: '' }) }}
              className="flex-1 border border-black/[0.15] rounded-full py-1.5 text-sm text-[#6B7280] hover:bg-[#F3F2F8] transition-colors">Cancelar</button>
            <button onClick={() => add.mutate(form)} disabled={!form.name || add.isPending}
              className="flex-1 bg-[#7C5CBF] text-white rounded-full py-1.5 text-sm font-bold disabled:opacity-50 hover:bg-[#9B7DD4] transition-colors">
              {add.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {!people?.length && !showForm ? (
        <p className="text-sm text-[#9CA3AF] text-center py-4">Nenhuma pessoa cadastrada ainda</p>
      ) : (
        <div className="flex flex-col gap-2">
          {people?.map(p => (
            <div key={p.id} className="flex items-center gap-3 py-2 border-b border-black/[0.08] last:border-0">
              <div className="w-8 h-8 rounded-full bg-[#EDE9F8] text-[#7C5CBF] flex items-center justify-center text-sm font-bold shrink-0">
                {p.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1A1A2E]">{p.name}</p>
                <p className="text-xs text-[#9CA3AF]">{[p.role, p.phone, p.email].filter(Boolean).join(' · ')}</p>
              </div>
              <button onClick={() => { if (confirm(`Remover ${p.name}?`)) remove.mutate(p.id) }}
                className="text-xs text-red-400 hover:text-red-500 shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── NPS Card ─────────────────────────────────────────────────────────────────

function NpsCard({ event }: { event: any }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    npsFormUrl: event.npsFormUrl ?? '',
    npsOverallRating: event.npsOverallRating != null ? String(event.npsOverallRating) : '',
    npsSatisfaction: event.npsSatisfaction != null ? String(event.npsSatisfaction) : '',
  })

  const save = useMutation({
    mutationFn: (data: object) => api.patch(`/events/${event.id}/nps`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', event.id] })
      setEditing(false)
    },
  })

  function handleSave() {
    save.mutate({
      npsFormUrl: form.npsFormUrl || null,
      npsOverallRating: form.npsOverallRating ? parseFloat(form.npsOverallRating) : null,
      npsSatisfaction: form.npsSatisfaction ? parseFloat(form.npsSatisfaction) : null,
    })
  }

  const inpCls = 'bg-white border border-black/[0.08] text-[#1A1A2E] placeholder-[#9CA3AF] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]'

  return (
    <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-[#1A1A2E]">NPS Pós-Evento</h2>
        <button onClick={() => { setEditing(e => !e); setForm({ npsFormUrl: event.npsFormUrl ?? '', npsOverallRating: event.npsOverallRating != null ? String(event.npsOverallRating) : '', npsSatisfaction: event.npsSatisfaction != null ? String(event.npsSatisfaction) : '' }) }}
          className="text-xs text-[#7C5CBF] hover:text-[#9B7DD4] font-bold transition-colors">
          {editing ? 'Cancelar' : '✏️ Editar'}
        </button>
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Avaliação Geral (0–10)</label>
              <input type="number" min="0" max="10" step="0.1" value={form.npsOverallRating}
                onChange={e => setForm(f => ({ ...f, npsOverallRating: e.target.value }))}
                placeholder="Ex: 8.5" className={`w-full ${inpCls}`} />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Satisfação dos Participantes (0–10)</label>
              <input type="number" min="0" max="10" step="0.1" value={form.npsSatisfaction}
                onChange={e => setForm(f => ({ ...f, npsSatisfaction: e.target.value }))}
                placeholder="Ex: 9.0" className={`w-full ${inpCls}`} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Link do formulário de avaliação</label>
            <input value={form.npsFormUrl}
              onChange={e => setForm(f => ({ ...f, npsFormUrl: e.target.value }))}
              placeholder="https://forms.gle/..."
              className={`w-full ${inpCls}`} />
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={handleSave} disabled={save.isPending}
              className="bg-[#7C5CBF] text-white rounded-full px-5 py-2 text-sm font-bold hover:bg-[#9B7DD4] transition-colors disabled:opacity-50">
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#EDE9F8] rounded-[10px] p-4 text-center">
              <p className="text-[9px] font-bold text-[#7C5CBF] uppercase tracking-[0.1em] mb-1">Avaliação Geral</p>
              <p className="text-2xl font-bold text-[#7C5CBF]">{event.npsOverallRating != null ? event.npsOverallRating : '—'}</p>
              {event.npsOverallRating != null && <p className="text-[9px] text-[#7C5CBF]/70">de 10</p>}
            </div>
            <div className="bg-[#D4EDDA] rounded-[10px] p-4 text-center">
              <p className="text-[9px] font-bold text-[#155724] uppercase tracking-[0.1em] mb-1">Satisfação</p>
              <p className="text-2xl font-bold text-[#155724]">{event.npsSatisfaction != null ? event.npsSatisfaction : '—'}</p>
              {event.npsSatisfaction != null && <p className="text-[9px] text-[#155724]/70">de 10</p>}
            </div>
            <div className="bg-[#F8F7FC] rounded-[10px] p-4 text-center flex flex-col items-center justify-center">
              {event.npsFormUrl ? (
                <>
                  <p className="text-[9px] font-bold text-[#6B7280] uppercase tracking-[0.1em] mb-2">Formulário</p>
                  <a href={event.npsFormUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs bg-[#7C5CBF] text-white px-3 py-1.5 rounded-full font-bold hover:bg-[#9B7DD4] transition-colors">
                    Abrir ↗
                  </a>
                </>
              ) : (
                <p className="text-xs text-[#9CA3AF]">Sem link de formulário</p>
              )}
            </div>
          </div>
          {event.npsOverallRating == null && event.npsSatisfaction == null && !event.npsFormUrl && (
            <p className="text-sm text-[#9CA3AF] text-center py-2">Nenhuma avaliação registrada ainda. Clique em Editar para adicionar.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sales Summary Card ───────────────────────────────────────────────────────

function SalesSummaryCard({ eventId }: { eventId: string }) {
  const { data: summary } = useQuery<any>({
    queryKey: ['sales-summary', eventId],
    queryFn: () => api.get(`/events/${eventId}/sales-summary`).then(r => r.data),
  })

  function fmt(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  }

  const total = (summary?.ticketRevenue ?? 0) + (summary?.offerRevenue ?? 0)
  const saldo = total - (summary?.totalExpenses ?? 0)

  return (
    <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-[#1A1A2E]">Resumo Financeiro</h2>
        <Link to={`/events/${eventId}/sales`}
          className="text-xs text-[#7C5CBF] hover:text-[#9B7DD4] font-bold transition-colors">
          Ver detalhes →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#D4EDDA] rounded-[10px] p-4">
          <p className="text-[9px] font-bold text-[#155724] uppercase tracking-[0.1em] mb-1">Receita Convites</p>
          <p className="text-xl font-bold text-[#155724]">{fmt(summary?.ticketRevenue ?? 0)}</p>
        </div>
        <div className="bg-[#D9F0FC] rounded-[10px] p-4">
          <p className="text-[9px] font-bold text-[#0C6E93] uppercase tracking-[0.1em] mb-1">Receita Oferta</p>
          <p className="text-xl font-bold text-[#0C6E93]">{fmt(summary?.offerRevenue ?? 0)}</p>
        </div>
        <div className="bg-[#FDEDEE] rounded-[10px] p-4">
          <p className="text-[9px] font-bold text-[#C0392B] uppercase tracking-[0.1em] mb-1">Gastos (fornecedores)</p>
          <p className="text-xl font-bold text-[#C0392B]">{fmt(summary?.totalExpenses ?? 0)}</p>
        </div>
        <div className={`rounded-[10px] p-4 ${saldo >= 0 ? 'bg-[#EDE9F8]' : 'bg-[#FEF3CD]'}`}>
          <p className={`text-[9px] font-bold uppercase tracking-[0.1em] mb-1 ${saldo >= 0 ? 'text-[#7C5CBF]' : 'text-[#92610A]'}`}>Lucro</p>
          <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-[#7C5CBF]' : 'text-[#92610A]'}`}>{fmt(saldo)}</p>
          <p className={`text-[9px] mt-0.5 ${saldo >= 0 ? 'text-[#7C5CBF]/70' : 'text-[#92610A]/70'}`}>
            {saldo >= 0 ? '✓ Lucrativo' : '⚠ No prejuízo'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main EventPage ───────────────────────────────────────────────────────────

export default function EventPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateSaved, setTemplateSaved] = useState(false)

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  })

  const { data: guestsList = [] } = useQuery<any[]>({
    queryKey: ['guests', id],
    queryFn: () => api.get(`/events/${id}/guests`).then(r => r.data),
    enabled: !!id,
  })
  const guestsCount = guestsList.length
  const guestsConfirmed = guestsList.filter(g => g.confirmed).length
  const guestsCheckedIn = guestsList.filter(g => g.checkedIn).length

  const { data: deadlines = [] } = useQuery<any[]>({
    queryKey: ['calendar', id],
    queryFn: () => api.get(`/events/${id}/calendar`).then(r => r.data),
  })

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.put(`/events/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event', id] }),
  })

  const deleteEvent = useMutation({
    mutationFn: () => api.delete(`/events/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); navigate('/') },
  })

  const saveTemplate = useMutation({
    mutationFn: (name: string) => api.post(`/templates/from-event/${id}`, { name }),
    onSuccess: () => {
      setShowTemplateModal(false)
      setTemplateSaved(true)
      setTimeout(() => setTemplateSaved(false), 3000)
    },
  })

  if (isLoading) return <p className="text-sm text-[#9CA3AF]">Carregando...</p>
  if (!event) return <p className="text-sm text-red-400">Evento não encontrado</p>

  const allItems = event.checklistSections?.flatMap((s: any) => s.items) ?? []
  const done = allItems.filter((i: any) => i.status === 'CONCLUIDO').length
  const progress = allItems.length ? Math.round((done / allItems.length) * 100) : 0

  const upcoming = deadlines.filter((d: any) => new Date(d.date) >= new Date()).slice(0, 5)

  const navItems = [
    { to: `/events/${id}/checklist`, label: 'Checklist', icon: '✅', desc: `${done}/${allItems.length} itens` },
    { to: `/events/${id}/suppliers`, label: 'Fornecedores', icon: '🏪', desc: `${event.eventSuppliers?.length ?? 0} itens` },
    { to: `/events/${id}/script`, label: 'Minuto a Minuto', icon: '⏱️', desc: `${event.scriptDays?.length ?? 0} dia(s)` },
    { to: `/events/${id}/guests`, label: 'Convidados', icon: '👥', desc: `${guestsCount} convidados` },
    { to: `/events/${id}/sales`, label: 'Vendas', icon: '💰', desc: 'convites + ofertas' },
  ]

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

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 text-sm text-[#9CA3AF]">
        <Link to="/" className="hover:text-[#1A1A2E] transition-colors">Eventos</Link>
        <span>/</span>
        <span className="text-[#1A1A2E] font-bold">{event.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${typeColor[event.eventType] ?? 'bg-[#EDE9F8] text-[#7C5CBF]'}`}>
                {typeLabel[event.eventType]}
              </span>
              <span className="text-xs text-[#9CA3AF]">{event.totalDays} dia(s)</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor[event.status] ?? 'bg-[#F8F7FC] text-[#9CA3AF]'}`}>
                {event.status === 'RASCUNHO' ? 'Rascunho' : event.status === 'EM_ANDAMENTO' ? 'Em andamento' : 'Concluído'}
              </span>
            </div>
            <h1 className="text-[22px] font-bold text-[#1A1A2E]">{event.name}</h1>
            <p className="text-sm text-[#6B7280] mt-1">
              {new Date(event.startDate).toLocaleDateString('pt-BR')} → {new Date(event.endDate).toLocaleDateString('pt-BR')}
              {event.location && ` · ${event.location}`}
              {event.onlineUrl && ` · ${event.onlineUrl}`}
              {event.participants && ` · ${event.participants} participantes`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <select value={event.status} onChange={e => updateStatus.mutate(e.target.value)}
              className="text-sm bg-white border border-black/[0.08] text-[#1A1A2E] rounded-full px-4 py-1.5 focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]">
              <option value="RASCUNHO">Rascunho</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="CONCLUIDO">Concluído</option>
            </select>
            <Link to={`/events/${id}/edit`}
              className="text-sm text-[#6B7280] hover:text-[#1A1A2E] px-4 py-1.5 border border-black/[0.15] rounded-full hover:bg-[#F3F2F8] transition-colors">
              ✏️ Editar
            </Link>
            <button onClick={() => { setTemplateName(event.name); setShowTemplateModal(true) }}
              className="text-sm text-[#7C5CBF] hover:text-[#9B7DD4] px-4 py-1.5 border border-[#7C5CBF]/40 rounded-full hover:bg-[#EDE9F8] transition-colors">
              Salvar como Template
            </button>
            <button onClick={() => { if (confirm('Excluir este evento?')) deleteEvent.mutate() }}
              className="text-sm text-red-500 hover:text-red-600 px-4 py-1.5 border border-red-200 rounded-full hover:bg-red-50 transition-colors">
              Excluir
            </button>
          </div>
        </div>
        <div className="mb-1 flex justify-between text-xs text-[#9CA3AF]">
          <span>Progresso geral do checklist</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-[#EDE9F8] rounded-full overflow-hidden">
          <div className="h-full bg-[#7C5CBF] rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Nav cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        {navItems.map(item => (
          <Link key={item.to} to={item.to}
            className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-5 hover:shadow-[0_4px_16px_rgba(124,92,191,0.12)] transition-shadow flex flex-col items-center justify-center text-center gap-2 min-h-[100px]">
            <span className="text-2xl">{item.icon}</span>
            <div>
              <div className="font-bold text-[#1A1A2E] text-sm">{item.label}</div>
              <div className="text-xs text-[#9CA3AF]">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Template saved confirmation */}
      {templateSaved && (
        <div className="mb-4 bg-[#D4EDDA] border border-[#4CD080]/30 rounded-[10px] px-4 py-3 text-sm text-[#155724]">
          Template salvo com sucesso! Veja em <a href="/templates" className="underline font-bold">Templates</a>.
        </div>
      )}

      {/* Save as Template modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-[#1A1A2E] mb-4">Salvar como Template</h3>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Nome do template</label>
            <input
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="w-full bg-white border border-black/[0.08] text-[#1A1A2E] placeholder-[#9CA3AF] rounded-[10px] px-3 py-2 text-sm mb-4 focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]"
              placeholder="Ex: Imersão Presencial Padrão"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowTemplateModal(false)}
                className="flex-1 border border-black/[0.15] rounded-full py-2 text-sm text-[#6B7280] hover:bg-[#F3F2F8] transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => { if (templateName.trim().length >= 2) saveTemplate.mutate(templateName.trim()) }}
                disabled={templateName.trim().length < 2 || saveTemplate.isPending}
                className="flex-1 bg-[#7C5CBF] text-white rounded-full py-2 text-sm font-bold disabled:opacity-50 hover:bg-[#9B7DD4] transition-colors">
                {saveTemplate.isPending ? 'Salvando...' : 'Salvar Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* People Summary */}
      <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#1A1A2E]">Participantes</h2>
          <Link to={`/events/${id}/guests`} className="text-xs text-[#7C5CBF] hover:text-[#9B7DD4] font-bold transition-colors">
            Ver lista →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#F8F7FC] rounded-[10px] p-4 text-center">
            <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">Total</p>
            <p className="text-2xl font-bold text-[#1A1A2E]">{guestsCount}</p>
            <p className="text-[9px] text-[#9CA3AF] mt-0.5">na lista</p>
          </div>
          <div className="bg-[#D4EDDA] rounded-[10px] p-4 text-center">
            <p className="text-[9px] font-bold text-[#155724] uppercase tracking-[0.1em] mb-1">Confirmados</p>
            <p className="text-2xl font-bold text-[#155724]">{guestsConfirmed}</p>
            <p className="text-[9px] text-[#155724]/70 mt-0.5">presença confirmada</p>
          </div>
          <div className="bg-[#D9F0FC] rounded-[10px] p-4 text-center">
            <p className="text-[9px] font-bold text-[#0C6E93] uppercase tracking-[0.1em] mb-1">Credenciados</p>
            <p className="text-2xl font-bold text-[#0C6E93]">{guestsCheckedIn}</p>
            <p className="text-[9px] text-[#0C6E93]/70 mt-0.5">presentes no evento</p>
          </div>
        </div>
      </div>

      {/* Sales Summary */}
      <SalesSummaryCard eventId={id!} />

      {/* Calendar */}
      <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#1A1A2E]">Calendário de Prazos</h2>
          <div className="flex gap-3 text-xs text-[#9CA3AF]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7C5CBF]" />Tarefas</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F4C542]" />Pagamentos</span>
          </div>
        </div>
        <CalendarView deadlines={deadlines} />
      </div>

      {/* Team */}
      <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-6 mb-6">
        <PeoplePanel eventId={id!} />
      </div>

      {/* NPS */}
      <NpsCard event={event} />

      {/* Upcoming deadlines */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-6">
          <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-3">Próximos Prazos</p>
          <div className="flex flex-col gap-2">
            {upcoming.map((d: any) => (
              <div key={d.id} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${d.type === 'PAGAMENTO' ? 'bg-[#F4C542]' : 'bg-[#7C5CBF]'}`} />
                <span className="text-sm text-[#1A1A2E] flex-1 truncate">{d.title}</span>
                <span className="text-xs text-[#9CA3AF] shrink-0">
                  {new Date(d.date).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
