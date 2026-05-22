import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../api/client'

type EventType = 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'

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

export default function NewEventPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [eventType, setEventType] = useState<EventType | null>(null)
  const [totalDays, setTotalDays] = useState<number | null>(null)
  const [templateId, setTemplateId] = useState<string>('')
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', location: '', onlineUrl: '', participants: '' })

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: (data: object) => api.post('/events', data).then(r => r.data),
    onSuccess: (event) => navigate(`/events/${event.id}`),
  })

  function handleNext() { setStep(s => s + 1) }
  function handleBack() { setStep(s => s - 1) }

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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              s === step ? 'bg-blue-600 text-white' : s < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>{s < step ? '✓' : s}</div>
            {s < 4 && <div className={`h-0.5 w-8 ${s < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {['Tipo', 'Duração', 'Informações', 'Template'][step - 1]}
        </span>
      </div>

      {/* Step 1: Event type */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Tipo de evento</h2>
          <p className="text-sm text-gray-500 mb-6">Isso define o checklist e o roteiro gerados automaticamente</p>
          <div className="grid gap-3">
            {typeOptions.map(opt => (
              <button key={opt.value} onClick={() => { setEventType(opt.value); handleNext() }}
                className={`flex items-center gap-4 p-4 border-2 rounded-xl text-left transition-all hover:border-blue-400 ${
                  eventType === opt.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                }`}>
                <span className="text-3xl">{opt.icon}</span>
                <div>
                  <div className="font-semibold text-gray-900">{opt.label}</div>
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
          <h2 className="text-xl font-bold text-gray-900 mb-1">Duração do evento</h2>
          <p className="text-sm text-gray-500 mb-6">O roteiro será dividido em abas por dia</p>
          <div className="grid grid-cols-3 gap-3">
            {dayOptions.map(opt => (
              <button key={opt.value} onClick={() => { setTotalDays(opt.value); handleNext() }}
                className={`p-6 border-2 rounded-xl text-center font-bold text-lg transition-all hover:border-blue-400 ${
                  totalDays === opt.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'
                }`}>{opt.label}</button>
            ))}
          </div>
          <button onClick={handleBack} className="mt-4 text-sm text-gray-500 hover:text-gray-700">← Voltar</button>
        </div>
      )}

      {/* Step 3: Event info */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Informações do evento</h2>
          <p className="text-sm text-gray-500 mb-6">Dados gerais do evento</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do evento *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de início *</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de encerramento *</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {(eventType === 'PRESENCIAL' || eventType === 'HIBRIDO') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Endereço ou nome do local"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            {(eventType === 'ONLINE' || eventType === 'HIBRIDO') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link da plataforma</label>
                <input value={form.onlineUrl} onChange={e => setForm(f => ({ ...f, onlineUrl: e.target.value }))} placeholder="https://zoom.us/..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº de participantes</label>
              <input type="number" value={form.participants} onChange={e => setForm(f => ({ ...f, participants: e.target.value }))} min={1}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-700">← Voltar</button>
            <button onClick={() => form.name && form.startDate && form.endDate && handleNext()}
              className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Template */}
      {step === 4 && (
        <form onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Template (opcional)</h2>
          <p className="text-sm text-gray-500 mb-6">Reutilize a estrutura de um evento anterior ou comece do zero</p>
          <div className="grid gap-3 mb-6">
            <button type="button" onClick={() => setTemplateId('')}
              className={`flex items-center gap-3 p-4 border-2 rounded-xl text-left transition-all hover:border-blue-400 ${
                !templateId ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
              }`}>
              <span className="text-2xl">✨</span>
              <div>
                <div className="font-semibold text-gray-900">Começar do zero</div>
                <div className="text-sm text-gray-500">Checklist e roteiro gerados pelo sistema</div>
              </div>
            </button>
            {templates?.map((t: { id: string; name: string; eventType: string; totalDays: number }) => (
              <button key={t.id} type="button" onClick={() => setTemplateId(t.id)}
                className={`flex items-center gap-3 p-4 border-2 rounded-xl text-left transition-all hover:border-blue-400 ${
                  templateId === t.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                }`}>
                <span className="text-2xl">📋</span>
                <div>
                  <div className="font-semibold text-gray-900">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.eventType} · {t.totalDays} dia(s)</div>
                </div>
              </button>
            ))}
          </div>
          {mutation.isError && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg p-3">Erro ao criar evento. Tente novamente.</p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-700">← Voltar</button>
            <button type="submit" disabled={mutation.isPending}
              className="ml-auto bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {mutation.isPending ? 'Criando...' : 'Criar Evento'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
