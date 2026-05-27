import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../api/client'

type EventType = 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'

interface TicketTypeInput {
  name: string
  lot: number
  price: string
  isCourtesy: boolean
}

const typeOptions: { value: EventType; label: string; desc: string; icon: string }[] = [
  { value: 'PRESENCIAL', label: 'Presencial', desc: 'Evento físico com local definido', icon: '🏛️' },
  { value: 'ONLINE', label: 'Online', desc: 'Evento via plataforma digital', icon: '💻' },
  { value: 'HIBRIDO', label: 'Híbrido', desc: 'Presencial e online simultaneamente', icon: '🌐' },
]

const dayOptions = [
  { value: 1, label: '1 dia' },
  { value: 2, label: '2 dias' },
  { value: 3, label: '3+ dias' },
]

const TICKET_NAMES = ['Normal', 'VIP', 'Premium']
const LOT_LABELS = ['1º', '2º', '3º', '4º', '5º']

export default function NewEventPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [eventType, setEventType] = useState<EventType | null>(null)
  const [totalDays, setTotalDays] = useState<number | null>(null)
  const [templateId, setTemplateId] = useState<string>('')
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', location: '', onlineUrl: '', participants: '' })

  const [ticketTypes, setTicketTypes] = useState<TicketTypeInput[]>([])
  const [ttForm, setTtForm] = useState<TicketTypeInput>({ name: 'Normal', lot: 1, price: '', isCourtesy: false })

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: (data: object) => api.post('/events', data).then(r => r.data),
    onSuccess: async (event) => {
      for (const tt of ticketTypes) {
        await api.post(`/events/${event.id}/ticket-types`, {
          name: tt.name,
          lot: tt.lot,
          price: tt.isCourtesy ? 0 : parseFloat(tt.price) || 0,
          isCourtesy: tt.isCourtesy,
        })
      }
      navigate(`/events/${event.id}`)
    },
  })

  function handleNext() { setStep(s => s + 1) }
  function handleBack() { setStep(s => s - 1) }

  function addTicketType() {
    setTicketTypes(prev => [...prev, { ...ttForm }])
    setTtForm({ name: 'Normal', lot: 1, price: '', isCourtesy: false })
  }

  function removeTicketType(idx: number) {
    setTicketTypes(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate({
      ...form,
      participants: form.participants ? parseInt(form.participants) : undefined,
      eventType,
      totalDays,
      templateId: templateId || undefined,
    })
  }

  const TOTAL_STEPS = 5

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              s === step ? 'bg-blue-600 text-white' : s < step ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-500'
            }`}>{s < step ? '✓' : s}</div>
            {s < TOTAL_STEPS && <div className={`h-0.5 w-8 ${s < step ? 'bg-emerald-500' : 'bg-gray-700'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {['Tipo', 'Duração', 'Informações', 'Template', 'Convites'][step - 1]}
        </span>
      </div>

      {/* Step 1: Event type */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Tipo de evento</h2>
          <p className="text-sm text-gray-500 mb-6">Isso define o checklist e o roteiro gerados automaticamente</p>
          <div className="grid gap-3">
            {typeOptions.map(opt => (
              <button key={opt.value} onClick={() => { setEventType(opt.value); handleNext() }}
                className={`flex items-center gap-4 p-4 border-2 rounded-xl text-left transition-all hover:border-blue-500 ${
                  eventType === opt.value ? 'border-blue-600 bg-blue-900/20' : 'border-gray-700 bg-gray-900'
                }`}>
                <span className="text-3xl">{opt.icon}</span>
                <div>
                  <div className="font-semibold text-white">{opt.label}</div>
                  <div className="text-sm text-gray-500">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Duration */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Duração do evento</h2>
          <p className="text-sm text-gray-500 mb-6">O roteiro será dividido em abas por dia</p>
          <div className="grid grid-cols-3 gap-3">
            {dayOptions.map(opt => (
              <button key={opt.value} onClick={() => { setTotalDays(opt.value); handleNext() }}
                className={`p-6 border-2 rounded-xl text-center font-bold text-lg transition-all hover:border-blue-500 ${
                  totalDays === opt.value ? 'border-blue-600 bg-blue-900/20 text-blue-400' : 'border-gray-700 bg-gray-900 text-gray-300'
                }`}>{opt.label}</button>
            ))}
          </div>
          <button onClick={handleBack} className="mt-4 text-sm text-gray-500 hover:text-gray-300">← Voltar</button>
        </div>
      )}

      {/* Step 3: Event info */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Informações do evento</h2>
          <p className="text-sm text-gray-500 mb-6">Dados gerais do evento</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome do evento *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Data de início *</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Data de encerramento *</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {(eventType === 'PRESENCIAL' || eventType === 'HIBRIDO') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Local</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Endereço ou nome do local"
                  className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            {(eventType === 'ONLINE' || eventType === 'HIBRIDO') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Link da plataforma</label>
                <input value={form.onlineUrl} onChange={e => setForm(f => ({ ...f, onlineUrl: e.target.value }))} placeholder="https://zoom.us/..."
                  className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nº de participantes</label>
              <input type="number" value={form.participants} onChange={e => setForm(f => ({ ...f, participants: e.target.value }))} min={1}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-300">← Voltar</button>
            <button onClick={() => form.name && form.startDate && form.endDate && handleNext()}
              className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Template */}
      {step === 4 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Template (opcional)</h2>
          <p className="text-sm text-gray-500 mb-6">Reutilize a estrutura de um evento anterior ou comece do zero</p>
          <div className="grid gap-3 mb-6">
            <button type="button" onClick={() => setTemplateId('')}
              className={`flex items-center gap-3 p-4 border-2 rounded-xl text-left transition-all hover:border-blue-500 ${
                !templateId ? 'border-blue-600 bg-blue-900/20' : 'border-gray-700 bg-gray-900'
              }`}>
              <span className="text-2xl">✨</span>
              <div>
                <div className="font-semibold text-white">Começar do zero</div>
                <div className="text-sm text-gray-500">Checklist e roteiro gerados pelo sistema</div>
              </div>
            </button>
            {templates?.map((t: { id: string; name: string; eventType: string; totalDays: number }) => (
              <button key={t.id} type="button" onClick={() => setTemplateId(t.id)}
                className={`flex items-center gap-3 p-4 border-2 rounded-xl text-left transition-all hover:border-blue-500 ${
                  templateId === t.id ? 'border-blue-600 bg-blue-900/20' : 'border-gray-700 bg-gray-900'
                }`}>
                <span className="text-2xl">📋</span>
                <div>
                  <div className="font-semibold text-white">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.eventType} · {t.totalDays} dia(s)</div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-300">← Voltar</button>
            <button type="button" onClick={handleNext}
              className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Ticket Types */}
      {step === 5 && (
        <form onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold text-white mb-1">Tipos de Convite (opcional)</h2>
          <p className="text-sm text-gray-500 mb-6">Configure os tipos de ingresso para este evento</p>

          {/* New ticket type form */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Tipo</label>
                <select value={ttForm.name} onChange={e => setTtForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TICKET_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Lote</label>
                <select value={ttForm.lot} onChange={e => setTtForm(f => ({ ...f, lot: parseInt(e.target.value) }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {LOT_LABELS.map((l, i) => <option key={i + 1} value={i + 1}>{l} Lote</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Valor (R$)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={ttForm.price}
                  onChange={e => setTtForm(f => ({ ...f, price: e.target.value }))}
                  disabled={ttForm.isCourtesy}
                  placeholder="0,00"
                  className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                  <input type="checkbox" checked={ttForm.isCourtesy}
                    onChange={e => setTtForm(f => ({ ...f, isCourtesy: e.target.checked, price: e.target.checked ? '0' : f.price }))}
                    className="w-4 h-4 accent-blue-500" />
                  Cortesia (gratuito)
                </label>
              </div>
            </div>
            <button type="button" onClick={addTicketType}
              disabled={!ttForm.isCourtesy && !ttForm.price}
              className="w-full border border-gray-600 rounded-lg py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-40">
              + Adicionar tipo de convite
            </button>
          </div>

          {/* Added types list */}
          {ticketTypes.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {ticketTypes.map((tt, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
                  <div>
                    <span className="font-medium text-white text-sm">{tt.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{LOT_LABELS[tt.lot - 1]} Lote</span>
                    {tt.isCourtesy
                      ? <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Cortesia</span>
                      : <span className="ml-2 text-xs text-emerald-400">R$ {parseFloat(tt.price).toFixed(2)}</span>
                    }
                  </div>
                  <button type="button" onClick={() => removeTicketType(idx)}
                    className="text-xs text-red-500 hover:text-red-400">✕</button>
                </div>
              ))}
            </div>
          )}

          {mutation.isError && (
            <p className="text-red-400 text-sm mb-4 bg-red-900/30 border border-red-800 rounded-lg p-3">Erro ao criar evento. Tente novamente.</p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-300">← Voltar</button>
            <button type="button" onClick={handleSubmit as any} disabled={mutation.isPending}
              className="ml-auto border border-gray-600 text-gray-400 px-4 py-2 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
              {ticketTypes.length === 0 ? 'Pular' : 'Criar sem convites'}
            </button>
            {ticketTypes.length > 0 && (
              <button type="submit" disabled={mutation.isPending}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                {mutation.isPending ? 'Criando...' : `Criar com ${ticketTypes.length} tipo(s)`}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
