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
  CHECKLIST: 'bg-blue-500',
  PAGAMENTO: 'bg-orange-500',
}
const statusDot: Record<string, string> = {
  PENDENTE: 'bg-red-400',
  EM_ANDAMENTO: 'bg-yellow-400',
  CONCLUIDO: 'bg-green-400',
  PAGO: 'bg-green-400',
  PARCIAL: 'bg-yellow-400',
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
          className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded">‹</button>
        <span className="font-semibold text-gray-800">{monthNames[month]} {year}</span>
        <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }}
          className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded">›</button>
      </div>

      <div className="grid grid-cols-7 gap-0 text-center">
        {weekdays.map(w => (
          <div key={w} className="text-xs text-gray-400 font-medium py-1">{w}</div>
        ))}
        {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
          const items = byDay[day] ?? []
          const isSelected = selected === day
          return (
            <div key={day} onClick={() => setSelected(isSelected ? null : day)}
              className={`relative p-1 rounded-lg cursor-pointer transition-colors min-h-[40px] ${
                isToday ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
              } ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
              <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day}</span>
              {items.length > 0 && (
                <div className="flex gap-0.5 flex-wrap justify-center mt-0.5">
                  {items.slice(0, 3).map((item: any, idx: number) => (
                    <span key={idx} className={`w-1.5 h-1.5 rounded-full ${deadlineColors[item.type] ?? 'bg-gray-400'}`} />
                  ))}
                  {items.length > 3 && <span className="text-xs text-gray-400">+{items.length - 3}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selected && byDay[selected] && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            {selected} de {monthNames[month]}
          </p>
          <div className="flex flex-col gap-2">
            {byDay[selected].map((item: any) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[item.status] ?? 'bg-gray-300'}`} />
                <span className="flex-1 text-gray-800">{item.title}</span>
                <span className="text-xs text-gray-400">{item.type === 'PAGAMENTO' ? '💰 Pagamento' : '✅ Tarefa'}</span>
                {item.person && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-500">{item.person}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {deadlines.length === 0 && (
        <p className="text-center text-xs text-gray-400 mt-4">Nenhum prazo cadastrado ainda.<br />Adicione datas limite no checklist e nos fornecedores.</p>
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
        <h3 className="font-semibold text-gray-800">Equipe do Evento</h3>
        <button onClick={() => setShowForm(true)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Adicionar pessoa</button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Função / Cargo</label>
              <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="Ex: Coordenador, Fotógrafo..."
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setForm({ name: '', email: '', phone: '', role: '' }) }}
              className="flex-1 border border-gray-300 rounded-lg py-1.5 text-sm text-gray-600">Cancelar</button>
            <button onClick={() => add.mutate(form)} disabled={!form.name || add.isPending}
              className="flex-1 bg-blue-600 text-white rounded-lg py-1.5 text-sm font-medium disabled:opacity-50">
              {add.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {!people?.length && !showForm ? (
        <p className="text-sm text-gray-400 text-center py-4">Nenhuma pessoa cadastrada ainda</p>
      ) : (
        <div className="flex flex-col gap-2">
          {people?.map(p => (
            <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                {p.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-400">{[p.role, p.phone, p.email].filter(Boolean).join(' · ')}</p>
              </div>
              <button onClick={() => { if (confirm(`Remover ${p.name}?`)) remove.mutate(p.id) }}
                className="text-xs text-red-400 hover:text-red-600 shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}
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

  const { data: guestsCount = 0 } = useQuery<number>({
    queryKey: ['guests-count', id],
    queryFn: () => api.get(`/events/${id}/guests`).then(r => r.data.length),
    enabled: !!id,
  })

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

  if (isLoading) return <p className="text-sm text-gray-400">Carregando...</p>
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
  ]

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-700">Eventos</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{event.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{typeLabel[event.eventType]}</span>
              <span className="text-xs text-gray-400">{event.totalDays} dia(s)</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(event.startDate).toLocaleDateString('pt-BR')} → {new Date(event.endDate).toLocaleDateString('pt-BR')}
              {event.location && ` · ${event.location}`}
              {event.onlineUrl && ` · ${event.onlineUrl}`}
              {event.participants && ` · ${event.participants} participantes`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <select value={event.status} onChange={e => updateStatus.mutate(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="RASCUNHO">Rascunho</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="CONCLUIDO">Concluído</option>
            </select>
            <button onClick={() => { setTemplateName(event.name); setShowTemplateModal(true) }}
              className="text-sm text-indigo-600 hover:text-indigo-800 px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50">
              Salvar como Template
            </button>
            <button onClick={() => { if (confirm('Excluir este evento?')) deleteEvent.mutate() }}
              className="text-sm text-red-400 hover:text-red-600 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50">
              Excluir
            </button>
          </div>
        </div>
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>Progresso geral do checklist</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Nav cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        {navItems.map(item => (
          <Link key={item.to} to={item.to}
            className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow flex items-center gap-4">
            <span className="text-3xl">{item.icon}</span>
            <div>
              <div className="font-semibold text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-400">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Template saved confirmation */}
      {templateSaved && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          Template salvo com sucesso! Veja em <a href="/templates" className="underline font-medium">Templates</a>.
        </div>
      )}

      {/* Save as Template modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-gray-900 mb-4">Salvar como Template</h3>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome do template</label>
            <input
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Ex: Imersão Presencial Padrão"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowTemplateModal(false)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => { if (templateName.trim().length >= 2) saveTemplate.mutate(templateName.trim()) }}
                disabled={templateName.trim().length < 2 || saveTemplate.isPending}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 hover:bg-indigo-700">
                {saveTemplate.isPending ? 'Salvando...' : 'Salvar Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar + People side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calendar */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Calendário de Prazos</h2>
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Tarefas</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />Pagamentos</span>
            </div>
          </div>
          <CalendarView deadlines={deadlines} />
        </div>

        {/* People */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <PeoplePanel eventId={id!} />

          {upcoming.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-3">PRÓXIMOS PRAZOS</p>
              <div className="flex flex-col gap-2">
                {upcoming.map((d: any) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${d.type === 'PAGAMENTO' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                    <span className="text-sm text-gray-700 flex-1 truncate">{d.title}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(d.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
