import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

type EventType = 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'

interface TicketType {
  id: string
  name: string
  lot: number
  price: number
  isCourtesy: boolean
}

const typeOptions = [
  { value: 'PRESENCIAL' as EventType, label: 'Presencial', desc: 'Evento físico com local definido', icon: '🏛️' },
  { value: 'ONLINE' as EventType, label: 'Online', desc: 'Evento via plataforma digital', icon: '💻' },
  { value: 'HIBRIDO' as EventType, label: 'Híbrido', desc: 'Presencial e online simultaneamente', icon: '🌐' },
]

const dayOptions = [
  { value: 1, label: '1 dia' },
  { value: 2, label: '2 dias' },
  { value: 3, label: '3+ dias' },
]

const TICKET_NAMES = ['Normal', 'VIP', 'Premium']
const LOT_LABELS = ['1º', '2º', '3º', '4º', '5º']

export default function EventEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: event, isLoading } = useQuery<any>({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  })

  const { data: ticketTypes = [], refetch: refetchTypes } = useQuery<TicketType[]>({
    queryKey: ['ticket-types', id],
    queryFn: () => api.get(`/events/${id}/ticket-types`).then(r => r.data),
    enabled: !!id,
  })

  const [form, setForm] = useState({
    name: '',
    eventType: 'PRESENCIAL' as EventType,
    totalDays: 1,
    startDate: '',
    endDate: '',
    location: '',
    onlineUrl: '',
    participants: '',
    status: 'RASCUNHO',
  })

  const [ttForm, setTtForm] = useState({ name: 'Normal', lot: 1, price: '', isCourtesy: false })
  const [addingTicket, setAddingTicket] = useState(false)

  useEffect(() => {
    if (event) {
      setForm({
        name: event.name ?? '',
        eventType: event.eventType ?? 'PRESENCIAL',
        totalDays: event.totalDays ?? 1,
        startDate: event.startDate ? event.startDate.slice(0, 10) : '',
        endDate: event.endDate ? event.endDate.slice(0, 10) : '',
        location: event.location ?? '',
        onlineUrl: event.onlineUrl ?? '',
        participants: event.participants ? String(event.participants) : '',
        status: event.status ?? 'RASCUNHO',
      })
    }
  }, [event])

  const updateEvent = useMutation({
    mutationFn: (data: object) => api.put(`/events/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', id] })
      qc.invalidateQueries({ queryKey: ['events'] })
      navigate(`/events/${id}`)
    },
  })

  const addTicketType = useMutation({
    mutationFn: (data: object) => api.post(`/events/${id}/ticket-types`, data),
    onSuccess: () => {
      refetchTypes()
      setTtForm({ name: 'Normal', lot: 1, price: '', isCourtesy: false })
      setAddingTicket(false)
    },
  })

  const removeTicketType = useMutation({
    mutationFn: (tid: string) => api.delete(`/events/${id}/ticket-types/${tid}`),
    onSuccess: () => refetchTypes(),
  })

  function handleSubmit() {
    if (!form.name.trim() || !form.startDate || !form.endDate) return
    updateEvent.mutate({
      name: form.name,
      eventType: form.eventType,
      totalDays: form.totalDays,
      startDate: form.startDate,
      endDate: form.endDate,
      location: form.location || undefined,
      onlineUrl: form.onlineUrl || undefined,
      participants: form.participants ? parseInt(form.participants) : undefined,
      status: form.status,
    })
  }

  function handleAddTicket() {
    if (!ttForm.isCourtesy && !ttForm.price) return
    addTicketType.mutate({
      name: ttForm.name,
      lot: ttForm.lot,
      price: ttForm.isCourtesy ? 0 : parseFloat(ttForm.price) || 0,
      isCourtesy: ttForm.isCourtesy,
    })
  }

  if (isLoading) return <p className="text-sm text-gray-500">Carregando...</p>
  if (!event) return <p className="text-sm text-red-400">Evento não encontrado</p>

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-300">Eventos</Link>
        <span>/</span>
        <Link to={`/events/${id}`} className="hover:text-gray-300">{event.name}</Link>
        <span>/</span>
        <span className="text-gray-200 font-medium">Editar</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-8">Editar configurações do evento</h1>

      {/* ─── Tipo do evento ─────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-4">
        <h2 className="font-semibold text-white mb-4">Tipo de evento</h2>
        <div className="grid gap-3">
          {typeOptions.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setForm(f => ({ ...f, eventType: opt.value }))}
              className={`flex items-center gap-4 p-4 border-2 rounded-xl text-left transition-all hover:border-blue-500 ${
                form.eventType === opt.value ? 'border-blue-600 bg-blue-900/20' : 'border-gray-700 bg-gray-800'
              }`}>
              <span className="text-2xl">{opt.icon}</span>
              <div>
                <div className="font-semibold text-white">{opt.label}</div>
                <div className="text-sm text-gray-500">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Duração ────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-4">
        <h2 className="font-semibold text-white mb-4">Duração do evento</h2>
        <div className="grid grid-cols-3 gap-3">
          {dayOptions.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setForm(f => ({ ...f, totalDays: opt.value }))}
              className={`p-4 border-2 rounded-xl text-center font-bold text-lg transition-all hover:border-blue-500 ${
                form.totalDays === opt.value
                  ? 'border-blue-600 bg-blue-900/20 text-blue-400'
                  : 'border-gray-700 bg-gray-800 text-gray-300'
              }`}>{opt.label}</button>
          ))}
        </div>
      </div>

      {/* ─── Informações básicas ─────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-4">
        <h2 className="font-semibold text-white mb-4">Informações do evento</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nome do evento *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Data de início *</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Data de encerramento *</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {(form.eventType === 'PRESENCIAL' || form.eventType === 'HIBRIDO') && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Local</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Endereço ou nome do local"
                className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          {(form.eventType === 'ONLINE' || form.eventType === 'HIBRIDO') && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Link da plataforma</label>
              <input value={form.onlineUrl} onChange={e => setForm(f => ({ ...f, onlineUrl: e.target.value }))}
                placeholder="https://zoom.us/..."
                className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nº de participantes</label>
            <input type="number" min={1} value={form.participants} onChange={e => setForm(f => ({ ...f, participants: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="RASCUNHO">Rascunho</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="CONCLUIDO">Concluído</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Tipos de convite ────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Tipos de Convite</h2>
          <button type="button" onClick={() => setAddingTicket(true)}
            className="text-sm text-blue-400 hover:text-blue-300 font-medium">+ Adicionar tipo</button>
        </div>

        {/* Existing ticket types */}
        {ticketTypes.length === 0 && !addingTicket && (
          <p className="text-sm text-gray-600 text-center py-4">Nenhum tipo de convite cadastrado</p>
        )}
        <div className="flex flex-col gap-2 mb-3">
          {ticketTypes.map(tt => (
            <div key={tt.id} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
              <div>
                <span className="font-medium text-white text-sm">{tt.name}</span>
                <span className="text-xs text-gray-500 ml-2">{LOT_LABELS[tt.lot - 1]} Lote</span>
                {tt.isCourtesy
                  ? <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Cortesia</span>
                  : <span className="ml-2 text-xs text-emerald-400">
                      R$ {tt.price.toFixed(2)}
                    </span>
                }
              </div>
              <button type="button"
                onClick={() => { if (confirm(`Remover tipo "${tt.name}"?`)) removeTicketType.mutate(tt.id) }}
                className="text-xs text-red-500 hover:text-red-400">✕</button>
            </div>
          ))}
        </div>

        {/* Add new ticket type form */}
        {addingTicket && (
          <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Tipo</label>
                <select value={ttForm.name} onChange={e => setTtForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TICKET_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Lote</label>
                <select value={ttForm.lot} onChange={e => setTtForm(f => ({ ...f, lot: parseInt(e.target.value) }))}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {LOT_LABELS.map((l, i) => <option key={i + 1} value={i + 1}>{l} Lote</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Valor (R$)</label>
                <input type="number" min="0" step="0.01" value={ttForm.price}
                  onChange={e => setTtForm(f => ({ ...f, price: e.target.value }))}
                  disabled={ttForm.isCourtesy}
                  placeholder="0,00"
                  className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                  <input type="checkbox" checked={ttForm.isCourtesy}
                    onChange={e => setTtForm(f => ({ ...f, isCourtesy: e.target.checked, price: e.target.checked ? '0' : f.price }))}
                    className="w-4 h-4 accent-blue-500" />
                  Cortesia
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAddingTicket(false)}
                className="flex-1 border border-gray-600 rounded-lg py-2 text-sm text-gray-400 hover:bg-gray-700">Cancelar</button>
              <button type="button" onClick={handleAddTicket}
                disabled={(!ttForm.isCourtesy && !ttForm.price) || addTicketType.isPending}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {addTicketType.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Actions ─────────────────────────────────────────────────── */}
      {updateEvent.isError && (
        <p className="text-red-400 text-sm mb-4 bg-red-900/30 border border-red-800 rounded-lg p-3">Erro ao salvar. Tente novamente.</p>
      )}
      <div className="flex gap-3">
        <Link to={`/events/${id}`}
          className="text-sm text-gray-500 hover:text-gray-300 px-4 py-2.5">← Cancelar</Link>
        <button type="button" onClick={handleSubmit}
          disabled={!form.name.trim() || !form.startDate || !form.endDate || updateEvent.isPending}
          className="ml-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {updateEvent.isPending ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  )
}
