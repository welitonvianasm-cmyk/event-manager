import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'

type Tab = 'tickets' | 'offers'

interface TicketType {
  id: string
  name: string
  lot: number
  price: number
  isCourtesy: boolean
}

interface TicketSale {
  id: string
  guestName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  createdAt: string
  ticketType: TicketType
  guest?: { id: string; name: string }
}

interface OfferSale {
  id: string
  guestName: string
  cpf?: string
  rg?: string
  address?: string
  value: number
  installments?: number
  isEntrada: boolean
  notes?: string
  createdAt: string
  guest?: { id: string; name: string }
}

interface Guest {
  id: string
  name: string
}

const LOT_LABELS = ['1º', '2º', '3º', '4º', '5º']

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

const inp = 'w-full bg-white border border-black/[0.08] text-[#1A1A2E] placeholder-[#9CA3AF] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]'
const lbl = 'block text-xs font-bold text-[#6B7280] mb-1'

export default function TicketSalesPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('tickets')

  const { data: event } = useQuery<any>({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  })

  const { data: ticketTypes = [] } = useQuery<TicketType[]>({
    queryKey: ['ticket-types', id],
    queryFn: () => api.get(`/events/${id}/ticket-types`).then(r => r.data),
  })

  const { data: ticketSales = [] } = useQuery<TicketSale[]>({
    queryKey: ['ticket-sales', id],
    queryFn: () => api.get(`/events/${id}/ticket-sales`).then(r => r.data),
  })

  const { data: offerSales = [] } = useQuery<OfferSale[]>({
    queryKey: ['offer-sales', id],
    queryFn: () => api.get(`/events/${id}/offer-sales`).then(r => r.data),
  })

  const { data: guests = [] } = useQuery<Guest[]>({
    queryKey: ['guests', id],
    queryFn: () => api.get(`/events/${id}/guests`).then(r => r.data),
  })

  // ─── Ticket Sale Modal ────────────────────────────────────────────────────────

  const [showTicketModal, setShowTicketModal] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    guestId: '',
    guestName: '',
    ticketTypeId: '',
    quantity: 1,
    overrideCourtesy: false,
  })

  const selectedTicketType = ticketTypes.find(t => t.id === ticketForm.ticketTypeId)
  const isCourtesy = ticketForm.overrideCourtesy || selectedTicketType?.isCourtesy
  const unitPrice = isCourtesy ? 0 : (selectedTicketType?.price ?? 0)

  const addTicketSale = useMutation({
    mutationFn: (data: object) => api.post(`/events/${id}/ticket-sales`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-sales', id] })
      qc.invalidateQueries({ queryKey: ['guests', id] })
      qc.invalidateQueries({ queryKey: ['guests-count', id] })
      setShowTicketModal(false)
      setTicketForm({ guestId: '', guestName: '', ticketTypeId: '', quantity: 1, overrideCourtesy: false })
    },
  })

  const deleteTicketSale = useMutation({
    mutationFn: (sid: string) => api.delete(`/events/${id}/ticket-sales/${sid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-sales', id] }),
  })

  function submitTicketSale() {
    if (!ticketForm.ticketTypeId || !ticketForm.guestName.trim()) return
    addTicketSale.mutate({
      ticketTypeId: ticketForm.ticketTypeId,
      guestId: ticketForm.guestId || undefined,
      guestName: ticketForm.guestName,
      quantity: ticketForm.quantity,
      unitPrice,
    })
  }

  // ─── Offer Sale Modal ─────────────────────────────────────────────────────────

  const [showOfferModal, setShowOfferModal] = useState(false)
  const [editingOffer, setEditingOffer] = useState<OfferSale | null>(null)
  const [offerForm, setOfferForm] = useState({
    guestId: '',
    guestName: '',
    cpf: '',
    rg: '',
    address: '',
    value: '',
    installments: '',
    isEntrada: false,
    notes: '',
  })

  function openNewOffer() {
    setEditingOffer(null)
    setOfferForm({ guestId: '', guestName: '', cpf: '', rg: '', address: '', value: '', installments: '', isEntrada: false, notes: '' })
    setShowOfferModal(true)
  }

  function openEditOffer(o: OfferSale) {
    setEditingOffer(o)
    setOfferForm({
      guestId: o.guest?.id ?? '',
      guestName: o.guestName,
      cpf: o.cpf ?? '',
      rg: o.rg ?? '',
      address: o.address ?? '',
      value: String(o.value),
      installments: o.installments ? String(o.installments) : '',
      isEntrada: o.isEntrada,
      notes: o.notes ?? '',
    })
    setShowOfferModal(true)
  }

  const addOfferSale = useMutation({
    mutationFn: (data: object) => api.post(`/events/${id}/offer-sales`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offer-sales', id] })
      qc.invalidateQueries({ queryKey: ['guests', id] })
      qc.invalidateQueries({ queryKey: ['guests-count', id] })
      setShowOfferModal(false)
    },
  })

  const updateOfferSale = useMutation({
    mutationFn: ({ oid, data }: { oid: string; data: object }) => api.patch(`/events/${id}/offer-sales/${oid}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offer-sales', id] })
      setShowOfferModal(false)
    },
  })

  const deleteOfferSale = useMutation({
    mutationFn: (oid: string) => api.delete(`/events/${id}/offer-sales/${oid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offer-sales', id] }),
  })

  function submitOffer() {
    if (!offerForm.guestName.trim() || !offerForm.value) return
    const payload = {
      guestId: offerForm.guestId || undefined,
      guestName: offerForm.guestName,
      cpf: offerForm.cpf || undefined,
      rg: offerForm.rg || undefined,
      address: offerForm.address || undefined,
      value: parseFloat(offerForm.value) || 0,
      installments: offerForm.installments ? parseInt(offerForm.installments) : undefined,
      isEntrada: offerForm.isEntrada,
      notes: offerForm.notes || undefined,
    }
    if (editingOffer) {
      updateOfferSale.mutate({ oid: editingOffer.id, data: payload })
    } else {
      addOfferSale.mutate(payload)
    }
  }

  // ─── Offers filter ───────────────────────────────────────────────────────────

  const [payFilter, setPayFilter] = useState<'all' | 'avista' | 'parcelado' | 'entrada'>('all')

  const filteredOffers = offerSales.filter(o => {
    if (payFilter === 'avista') return !o.isEntrada && !o.installments
    if (payFilter === 'parcelado') return !o.isEntrada && !!o.installments
    if (payFilter === 'entrada') return o.isEntrada
    return true
  })

  // ─── Stats ────────────────────────────────────────────────────────────────────

  const ticketRevenue = ticketSales.reduce((s, t) => s + t.totalPrice, 0)
  const ticketCount = ticketSales.reduce((s, t) => s + t.quantity, 0)
  const courtesyCount = ticketSales.filter(t => t.unitPrice === 0).reduce((s, t) => s + t.quantity, 0)

  const totalOffer = offerSales.reduce((s, o) => s + o.value, 0)
  const avistaCount = offerSales.filter(o => !o.isEntrada && !o.installments).length
  const avistaTotal = offerSales.filter(o => !o.isEntrada && !o.installments).reduce((s, o) => s + o.value, 0)
  const parceladoCount = offerSales.filter(o => !o.isEntrada && !!o.installments).length
  const parceladoTotal = offerSales.filter(o => !o.isEntrada && !!o.installments).reduce((s, o) => s + o.value, 0)
  const entradaCount = offerSales.filter(o => o.isEntrada).length
  const entradaTotal = offerSales.filter(o => o.isEntrada).reduce((s, o) => s + o.value, 0)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-[#9CA3AF]">
        <Link to="/" className="hover:text-[#7C5CBF] transition-colors">Eventos</Link>
        <span>/</span>
        <Link to={`/events/${id}`} className="hover:text-[#7C5CBF] transition-colors">{event?.name ?? '...'}</Link>
        <span>/</span>
        <span className="text-[#1A1A2E] font-bold">Vendas</span>
      </div>

      <h1 className="text-[22px] font-bold text-[#1A1A2E] mb-6">Vendas</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F3F2F8] p-1 rounded-[10px] mb-6 w-fit">
        <button onClick={() => setTab('tickets')}
          className={`px-5 py-2 rounded-[8px] text-sm font-bold transition-colors ${tab === 'tickets' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#6B7280] hover:text-[#1A1A2E]'}`}>
          Convites
        </button>
        <button onClick={() => setTab('offers')}
          className={`px-5 py-2 rounded-[8px] text-sm font-bold transition-colors ${tab === 'offers' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#6B7280] hover:text-[#1A1A2E]'}`}>
          Oferta do Evento
        </button>
      </div>

      {/* ─── Tickets tab ─────────────────────────────────────────────────────────── */}
      {tab === 'tickets' && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-4 text-center">
              <p className="text-2xl font-bold text-[#4CD080]">{fmt(ticketRevenue)}</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Total arrecadado</p>
            </div>
            <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-4 text-center">
              <p className="text-2xl font-bold text-[#1A1A2E]">{ticketCount}</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Convites vendidos</p>
            </div>
            <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-4 text-center">
              <p className="text-2xl font-bold text-[#7C5CBF]">{courtesyCount}</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Cortesias</p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-[#6B7280]">{ticketSales.length} venda(s) registrada(s)</p>
            <button onClick={() => setShowTicketModal(true)}
              className="bg-[#7C5CBF] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#9B7DD4] transition-colors">
              + Registrar Venda
            </button>
          </div>

          {ticketSales.length === 0 ? (
            <div className="text-center py-16 text-[#9CA3AF]">
              <p className="text-4xl mb-3">🎟️</p>
              <p className="text-sm">Nenhuma venda registrada</p>
            </div>
          ) : (
            <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F8F7FC] border-b border-black/[0.08]">
                  <tr>
                    <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Convidado</th>
                    <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Tipo / Lote</th>
                    <th className="text-center px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Qtd</th>
                    <th className="text-right px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Valor</th>
                    <th className="text-right px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Data</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {ticketSales.map(s => (
                    <tr key={s.id} className="border-b border-black/[0.06] last:border-0 hover:bg-[#F8F7FC]">
                      <td className="px-4 py-3 font-bold text-[#1A1A2E]">{s.guestName}</td>
                      <td className="px-4 py-3">
                        <span className="text-[#1A1A2E]">{s.ticketType.name}</span>
                        <span className="text-xs text-[#9CA3AF] ml-1">{LOT_LABELS[s.ticketType.lot - 1]} Lote</span>
                        {s.unitPrice === 0 && <span className="ml-2 text-xs bg-[#EDE9F8] text-[#7C5CBF] px-2 py-0.5 rounded-full font-bold">Cortesia</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-[#6B7280]">{s.quantity}</td>
                      <td className="px-4 py-3 text-right text-[#4CD080] font-bold">{fmt(s.totalPrice)}</td>
                      <td className="px-4 py-3 text-right text-[#9CA3AF]">{fmtDate(s.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { if (confirm('Remover esta venda?')) deleteTicketSale.mutate(s.id) }}
                          className="text-xs text-red-400 hover:text-red-500">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Offers tab ──────────────────────────────────────────────────────────── */}
      {tab === 'offers' && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#EDE9F8] rounded-[14px] p-4 text-center">
              <p className="text-[9px] font-bold text-[#7C5CBF] uppercase tracking-[0.1em] mb-1">Total Geral</p>
              <p className="text-xl font-bold text-[#7C5CBF]">{fmt(totalOffer)}</p>
              <p className="text-xs text-[#7C5CBF]/70 mt-0.5">{offerSales.length} vendas</p>
            </div>
            <div className="bg-[#D4EDDA] rounded-[14px] p-4 text-center">
              <p className="text-[9px] font-bold text-[#155724] uppercase tracking-[0.1em] mb-1">À Vista</p>
              <p className="text-xl font-bold text-[#155724]">{fmt(avistaTotal)}</p>
              <p className="text-xs text-[#155724]/70 mt-0.5">{avistaCount} venda(s)</p>
            </div>
            <div className="bg-[#FEF3CD] rounded-[14px] p-4 text-center">
              <p className="text-[9px] font-bold text-[#92610A] uppercase tracking-[0.1em] mb-1">Entrada</p>
              <p className="text-xl font-bold text-[#92610A]">{fmt(entradaTotal)}</p>
              <p className="text-xs text-[#92610A]/70 mt-0.5">{entradaCount} venda(s)</p>
            </div>
            <div className="bg-[#D9F0FC] rounded-[14px] p-4 text-center">
              <p className="text-[9px] font-bold text-[#0C6E93] uppercase tracking-[0.1em] mb-1">Parcelado</p>
              <p className="text-xl font-bold text-[#0C6E93]">{fmt(parceladoTotal)}</p>
              <p className="text-xs text-[#0C6E93]/70 mt-0.5">{parceladoCount} venda(s)</p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              {([['all','Todos'],['avista','À Vista'],['entrada','Entrada'],['parcelado','Parcelado']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setPayFilter(val)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${payFilter === val ? 'bg-[#7C5CBF] text-white' : 'bg-white text-[#6B7280] border border-black/[0.08] hover:border-[#7C5CBF] hover:text-[#7C5CBF]'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-[#6B7280]">{filteredOffers.length} venda(s)</p>
            <button onClick={openNewOffer}
              className="bg-[#7C5CBF] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#9B7DD4] transition-colors">
              + Registrar Venda
            </button>
            </div>
          </div>

          {offerSales.length === 0 ? (
            <div className="text-center py-16 text-[#9CA3AF]">
              <p className="text-4xl mb-3">💰</p>
              <p className="text-sm">Nenhuma venda de oferta registrada</p>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="text-center py-10 text-[#9CA3AF]">
              <p className="text-sm">Nenhuma venda com este filtro</p>
            </div>
          ) : (
            <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F8F7FC] border-b border-black/[0.08]">
                  <tr>
                    <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Nome</th>
                    <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">CPF</th>
                    <th className="text-right px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Valor</th>
                    <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Pagamento</th>
                    <th className="text-right px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Data</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOffers.map(o => (
                    <tr key={o.id} className="border-b border-black/[0.06] last:border-0 hover:bg-[#F8F7FC]">
                      <td className="px-4 py-3 font-bold text-[#1A1A2E]">{o.guestName}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{o.cpf ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-[#4CD080] font-bold">{fmt(o.value)}</td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {o.isEntrada ? 'Entrada + negociar' : o.installments ? `${o.installments}x` : 'À vista'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#9CA3AF]">{fmtDate(o.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => openEditOffer(o)} className="text-xs text-[#7C5CBF] hover:text-[#9B7DD4]">✎</button>
                          <button onClick={() => { if (confirm('Remover esta venda?')) deleteOfferSale.mutate(o.id) }}
                            className="text-xs text-red-400 hover:text-red-500">✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Ticket Sale Modal ────────────────────────────────────────────────────── */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-[#1A1A2E] mb-4">Registrar Venda de Convite</h3>

            {ticketTypes.length === 0 && (
              <p className="text-sm text-[#92610A] bg-[#FEF3CD] border border-[#F4C542]/30 rounded-[10px] p-3 mb-4">
                Nenhum tipo de convite cadastrado. Vá em Configurações do evento ou adicione um tipo primeiro.
              </p>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <label className={lbl}>Convidado da lista</label>
                <select value={ticketForm.guestId}
                  onChange={e => {
                    const g = guests.find(g => g.id === e.target.value)
                    setTicketForm(f => ({ ...f, guestId: e.target.value, guestName: g?.name ?? f.guestName }))
                  }}
                  className={inp}>
                  <option value="">— Buscar na lista (opcional) —</option>
                  {guests.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Nome do comprador *</label>
                <input value={ticketForm.guestName}
                  onChange={e => setTicketForm(f => ({ ...f, guestName: e.target.value }))}
                  className={inp}
                  placeholder="Nome completo" />
              </div>
              <div>
                <label className={lbl}>Tipo de convite *</label>
                <select value={ticketForm.ticketTypeId}
                  onChange={e => setTicketForm(f => ({ ...f, ticketTypeId: e.target.value }))}
                  className={inp}>
                  <option value="">— Selecionar —</option>
                  {ticketTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {LOT_LABELS[t.lot - 1]} Lote · {t.isCourtesy ? 'Cortesia' : fmt(t.price)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Quantidade</label>
                  <input type="number" min={1} value={ticketForm.quantity}
                    onChange={e => setTicketForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                    className={inp} />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1A1A2E]">
                    <input type="checkbox" checked={ticketForm.overrideCourtesy}
                      onChange={e => setTicketForm(f => ({ ...f, overrideCourtesy: e.target.checked }))}
                      className="w-4 h-4 accent-[#7C5CBF]" />
                    Cortesia
                  </label>
                </div>
              </div>
              {selectedTicketType && (
                <p className="text-sm text-[#6B7280] bg-[#F8F7FC] rounded-[10px] px-3 py-2">
                  Total: <span className="text-[#4CD080] font-bold">{fmt(unitPrice * ticketForm.quantity)}</span>
                </p>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowTicketModal(false)}
                className="flex-1 border border-black/[0.15] rounded-full py-2 text-sm text-[#6B7280] hover:bg-[#F3F2F8] transition-colors">Cancelar</button>
              <button onClick={submitTicketSale}
                disabled={!ticketForm.ticketTypeId || !ticketForm.guestName.trim() || addTicketSale.isPending}
                className="flex-1 bg-[#7C5CBF] text-white rounded-full py-2 text-sm font-bold hover:bg-[#9B7DD4] transition-colors disabled:opacity-50">
                {addTicketSale.isPending ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Offer Sale Modal ─────────────────────────────────────────────────────── */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-6 w-full max-w-lg mx-4">
            <h3 className="font-bold text-[#1A1A2E] mb-4">{editingOffer ? 'Editar Venda de Oferta' : 'Registrar Venda de Oferta'}</h3>

            <div className="flex flex-col gap-3">
              <div>
                <label className={lbl}>Convidado da lista</label>
                <select value={offerForm.guestId}
                  onChange={e => {
                    const g = guests.find(g => g.id === e.target.value)
                    setOfferForm(f => ({ ...f, guestId: e.target.value, guestName: g?.name ?? f.guestName }))
                  }}
                  className={inp}>
                  <option value="">— Buscar na lista (opcional) —</option>
                  {guests.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Nome completo *</label>
                <input value={offerForm.guestName}
                  onChange={e => setOfferForm(f => ({ ...f, guestName: e.target.value }))}
                  className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>CPF</label>
                  <input value={offerForm.cpf}
                    onChange={e => setOfferForm(f => ({ ...f, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                    className={inp} />
                </div>
                <div>
                  <label className={lbl}>RG</label>
                  <input value={offerForm.rg}
                    onChange={e => setOfferForm(f => ({ ...f, rg: e.target.value }))}
                    className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>Endereço completo</label>
                <input value={offerForm.address}
                  onChange={e => setOfferForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Rua, número, cidade, estado"
                  className={inp} />
              </div>
              <div>
                <label className={lbl}>Valor do investimento (R$) *</label>
                <input type="number" min="0" step="0.01" value={offerForm.value}
                  onChange={e => setOfferForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="0,00"
                  className={inp} />
              </div>
              <div>
                <label className={`${lbl} mb-2`}>Forma de pagamento</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1A1A2E]">
                    <input type="radio" checked={!offerForm.isEntrada && !offerForm.installments}
                      onChange={() => setOfferForm(f => ({ ...f, isEntrada: false, installments: '' }))}
                      className="accent-[#7C5CBF]" />
                    À vista
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1A1A2E]">
                    <input type="radio" checked={!offerForm.isEntrada && !!offerForm.installments}
                      onChange={() => setOfferForm(f => ({ ...f, isEntrada: false, installments: '2' }))}
                      className="accent-[#7C5CBF]" />
                    Parcelado
                    {!offerForm.isEntrada && !!offerForm.installments && (
                      <input type="number" min={2} max={24} value={offerForm.installments}
                        onChange={e => setOfferForm(f => ({ ...f, installments: e.target.value }))}
                        className="w-16 bg-white border border-black/[0.08] text-[#1A1A2E] rounded-[8px] px-2 py-1 text-sm focus:outline-none focus:border-[#7C5CBF]"
                        placeholder="N" />
                    )}
                    {!offerForm.isEntrada && !!offerForm.installments && <span className="text-[#9CA3AF]">parcelas</span>}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1A1A2E]">
                    <input type="radio" checked={offerForm.isEntrada}
                      onChange={() => setOfferForm(f => ({ ...f, isEntrada: true, installments: '' }))}
                      className="accent-[#7C5CBF]" />
                    Entrada + negociar com equipe
                  </label>
                </div>
              </div>
              <div>
                <label className={lbl}>Observações</label>
                <textarea value={offerForm.notes}
                  onChange={e => setOfferForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className={`${inp} resize-none`} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowOfferModal(false)}
                className="flex-1 border border-black/[0.15] rounded-full py-2 text-sm text-[#6B7280] hover:bg-[#F3F2F8] transition-colors">Cancelar</button>
              <button onClick={submitOffer}
                disabled={!offerForm.guestName.trim() || !offerForm.value || addOfferSale.isPending || updateOfferSale.isPending}
                className="flex-1 bg-[#7C5CBF] text-white rounded-full py-2 text-sm font-bold hover:bg-[#9B7DD4] transition-colors disabled:opacity-50">
                {(addOfferSale.isPending || updateOfferSale.isPending) ? 'Salvando...' : editingOffer ? 'Salvar alterações' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
