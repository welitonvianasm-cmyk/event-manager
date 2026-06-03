import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../api/client'

type EventType = 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'

interface TicketTypeInput { name: string; lot: number; price: string; isCourtesy: boolean }

const typeOptions: { value: EventType; label: string; desc: string; icon: string }[] = [
  { value: 'PRESENCIAL', label: 'Presencial', desc: 'Evento físico com local definido', icon: '🏛️' },
  { value: 'ONLINE', label: 'Online', desc: 'Evento via plataforma digital', icon: '💻' },
  { value: 'HIBRIDO', label: 'Híbrido', desc: 'Presencial e online simultaneamente', icon: '🌐' },
]
const dayOptions = [{ value: 1, label: '1 dia' }, { value: 2, label: '2 dias' }, { value: 3, label: '3+ dias' }]
const TICKET_NAMES = ['Normal', 'VIP', 'Premium']
const LOT_LABELS = ['1º', '2º', '3º', '4º', '5º']

const inp = 'w-full bg-white border border-black/[0.08] text-[#1A1A2E] placeholder-[#9CA3AF] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]'
const lbl = 'block text-xs font-bold text-[#6B7280] mb-1'

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
          name: tt.name, lot: tt.lot, price: tt.isCourtesy ? 0 : parseFloat(tt.price) || 0, isCourtesy: tt.isCourtesy,
        })
      }
      navigate(`/events/${event.id}`)
    },
  })

  function handleNext() { setStep(s => s + 1) }
  function handleBack() { setStep(s => s - 1) }
  function addTicketType() { setTicketTypes(prev => [...prev, { ...ttForm }]); setTtForm({ name: 'Normal', lot: 1, price: '', isCourtesy: false }) }
  function removeTicketType(idx: number) { setTicketTypes(prev => prev.filter((_, i) => i !== idx)) }
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate({ ...form, participants: form.participants ? parseInt(form.participants) : undefined, eventType, totalDays, templateId: templateId || undefined })
  }

  const TOTAL_STEPS = 5

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s === step ? 'bg-[#7C5CBF] text-white' : s < step ? 'bg-[#4CD080] text-white' : 'bg-[#E5E0F3] text-[#9CA3AF]'
            }`}>{s < step ? '✓' : s}</div>
            {s < TOTAL_STEPS && <div className={`h-0.5 w-8 transition-colors ${s < step ? 'bg-[#4CD080]' : 'bg-[#E5E0F3]'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-[#9CA3AF] font-bold">
          {['Tipo', 'Duração', 'Informações', 'Template', 'Convites'][step - 1]}
        </span>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div>
          <h2 className="text-[18px] font-bold text-[#1A1A2E] mb-1">Tipo de evento</h2>
          <p className="text-sm text-[#6B7280] mb-6">Isso define o checklist e o roteiro gerados automaticamente</p>
          <div className="grid gap-3">
            {typeOptions.map(opt => (
              <button key={opt.value} onClick={() => { setEventType(opt.value); handleNext() }}
                className={`flex items-center gap-4 p-4 border-2 rounded-[14px] text-left transition-all hover:border-[#7C5CBF] ${
                  eventType === opt.value ? 'border-[#7C5CBF] bg-[#EDE9F8]' : 'border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(124,92,191,0.08)]'
                }`}>
                <span className="text-3xl">{opt.icon}</span>
                <div>
                  <div className="font-bold text-[#1A1A2E]">{opt.label}</div>
                  <div className="text-sm text-[#6B7280]">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div>
          <h2 className="text-[18px] font-bold text-[#1A1A2E] mb-1">Duração do evento</h2>
          <p className="text-sm text-[#6B7280] mb-6">O roteiro será dividido em seções por dia</p>
          <div className="grid grid-cols-3 gap-3">
            {dayOptions.map(opt => (
              <button key={opt.value} onClick={() => { setTotalDays(opt.value); handleNext() }}
                className={`p-6 border-2 rounded-[14px] text-center font-bold text-lg transition-all hover:border-[#7C5CBF] ${
                  totalDays === opt.value ? 'border-[#7C5CBF] bg-[#EDE9F8] text-[#7C5CBF]' : 'border-black/[0.08] bg-white text-[#1A1A2E]'
                }`}>{opt.label}</button>
            ))}
          </div>
          <button onClick={handleBack} className="mt-4 text-sm text-[#9CA3AF] hover:text-[#7C5CBF] transition-colors">← Voltar</button>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div>
          <h2 className="text-[18px] font-bold text-[#1A1A2E] mb-1">Informações do evento</h2>
          <p className="text-sm text-[#6B7280] mb-6">Dados gerais do evento</p>
          <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-6 flex flex-col gap-4">
            <div><label className={lbl}>Nome do evento *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className={inp} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Data de início *</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required className={inp} /></div>
              <div><label className={lbl}>Data de encerramento *</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required className={inp} /></div>
            </div>
            {(eventType === 'PRESENCIAL' || eventType === 'HIBRIDO') && (
              <div><label className={lbl}>Local</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Endereço ou nome do local" className={inp} /></div>
            )}
            {(eventType === 'ONLINE' || eventType === 'HIBRIDO') && (
              <div><label className={lbl}>Link da plataforma</label>
                <input value={form.onlineUrl} onChange={e => setForm(f => ({ ...f, onlineUrl: e.target.value }))} placeholder="https://zoom.us/..." className={inp} /></div>
            )}
            <div><label className={lbl}>Nº de participantes</label>
              <input type="number" value={form.participants} onChange={e => setForm(f => ({ ...f, participants: e.target.value }))} min={1} className={inp} /></div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleBack} className="text-sm text-[#9CA3AF] hover:text-[#7C5CBF] transition-colors">← Voltar</button>
            <button onClick={() => form.name && form.startDate && form.endDate && handleNext()}
              className="ml-auto bg-[#7C5CBF] text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-[#9B7DD4] transition-colors disabled:opacity-50">
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div>
          <h2 className="text-[18px] font-bold text-[#1A1A2E] mb-1">Template (opcional)</h2>
          <p className="text-sm text-[#6B7280] mb-6">Reutilize a estrutura de um evento anterior ou comece do zero</p>
          <div className="grid gap-3 mb-6">
            <button type="button" onClick={() => setTemplateId('')}
              className={`flex items-center gap-3 p-4 border-2 rounded-[14px] text-left transition-all hover:border-[#7C5CBF] ${
                !templateId ? 'border-[#7C5CBF] bg-[#EDE9F8]' : 'border-black/[0.08] bg-white'
              }`}>
              <span className="text-2xl">✨</span>
              <div>
                <div className="font-bold text-[#1A1A2E]">Começar do zero</div>
                <div className="text-sm text-[#6B7280]">Checklist e roteiro gerados pelo sistema</div>
              </div>
            </button>
            {templates?.map((t: { id: string; name: string; eventType: string; totalDays: number }) => (
              <button key={t.id} type="button" onClick={() => setTemplateId(t.id)}
                className={`flex items-center gap-3 p-4 border-2 rounded-[14px] text-left transition-all hover:border-[#7C5CBF] ${
                  templateId === t.id ? 'border-[#7C5CBF] bg-[#EDE9F8]' : 'border-black/[0.08] bg-white'
                }`}>
                <span className="text-2xl">📋</span>
                <div>
                  <div className="font-bold text-[#1A1A2E]">{t.name}</div>
                  <div className="text-sm text-[#6B7280]">{t.eventType} · {t.totalDays} dia(s)</div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleBack} className="text-sm text-[#9CA3AF] hover:text-[#7C5CBF] transition-colors">← Voltar</button>
            <button type="button" onClick={handleNext}
              className="ml-auto bg-[#7C5CBF] text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-[#9B7DD4] transition-colors">
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* Step 5 */}
      {step === 5 && (
        <form onSubmit={handleSubmit}>
          <h2 className="text-[18px] font-bold text-[#1A1A2E] mb-1">Tipos de Convite (opcional)</h2>
          <p className="text-sm text-[#6B7280] mb-6">Configure os tipos de ingresso para este evento</p>

          <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className={lbl}>Tipo</label>
                <select value={ttForm.name} onChange={e => setTtForm(f => ({ ...f, name: e.target.value }))} className={inp}>
                  {TICKET_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                </select></div>
              <div><label className={lbl}>Lote</label>
                <select value={ttForm.lot} onChange={e => setTtForm(f => ({ ...f, lot: parseInt(e.target.value) }))} className={inp}>
                  {LOT_LABELS.map((l, i) => <option key={i + 1} value={i + 1}>{l} Lote</option>)}
                </select></div>
              <div><label className={lbl}>Valor (R$)</label>
                <input type="number" min="0" step="0.01" value={ttForm.price}
                  onChange={e => setTtForm(f => ({ ...f, price: e.target.value }))}
                  disabled={ttForm.isCourtesy} placeholder="0,00"
                  className={`${inp} disabled:opacity-40`} /></div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#6B7280]">
                  <input type="checkbox" checked={ttForm.isCourtesy}
                    onChange={e => setTtForm(f => ({ ...f, isCourtesy: e.target.checked, price: e.target.checked ? '0' : f.price }))}
                    className="w-4 h-4 accent-[#7C5CBF]" />
                  Cortesia (gratuito)
                </label>
              </div>
            </div>
            <button type="button" onClick={addTicketType} disabled={!ttForm.isCourtesy && !ttForm.price}
              className="w-full border border-[#7C5CBF]/30 rounded-full py-2 text-sm text-[#7C5CBF] font-bold hover:bg-[#EDE9F8] disabled:opacity-40 transition-colors">
              + Adicionar tipo de convite
            </button>
          </div>

          {ticketTypes.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {ticketTypes.map((tt, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white rounded-[14px] border border-black/[0.08] px-4 py-3 shadow-[0_1px_3px_rgba(124,92,191,0.08)]">
                  <div>
                    <span className="font-bold text-[#1A1A2E] text-sm">{tt.name}</span>
                    <span className="text-xs text-[#9CA3AF] ml-2">{LOT_LABELS[tt.lot - 1]} Lote</span>
                    {tt.isCourtesy
                      ? <span className="ml-2 text-xs bg-[#EDE9F8] text-[#7C5CBF] px-2 py-0.5 rounded-full font-bold">Cortesia</span>
                      : <span className="ml-2 text-xs text-[#155724] font-bold">R$ {parseFloat(tt.price).toFixed(2)}</span>
                    }
                  </div>
                  <button type="button" onClick={() => removeTicketType(idx)} className="text-xs text-red-400 hover:text-red-500">✕</button>
                </div>
              ))}
            </div>
          )}

          {mutation.isError && (
            <p className="text-sm mb-4 bg-[#FDEDEE] border border-[#FF6B8A]/30 text-[#C0392B] rounded-[10px] p-3">Erro ao criar evento. Tente novamente.</p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={handleBack} className="text-sm text-[#9CA3AF] hover:text-[#7C5CBF] transition-colors">← Voltar</button>
            <button type="button" onClick={handleSubmit as any} disabled={mutation.isPending}
              className="ml-auto border border-[#7C5CBF]/30 text-[#7C5CBF] px-5 py-2 rounded-full text-sm font-bold hover:bg-[#EDE9F8] disabled:opacity-50 transition-colors">
              {ticketTypes.length === 0 ? 'Pular' : 'Criar sem convites'}
            </button>
            {ticketTypes.length > 0 && (
              <button type="submit" disabled={mutation.isPending}
                className="bg-[#7C5CBF] text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-[#9B7DD4] disabled:opacity-50 transition-colors">
                {mutation.isPending ? 'Criando...' : `Criar com ${ticketTypes.length} tipo(s)`}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
