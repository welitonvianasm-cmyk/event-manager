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

  // ─── Stats ────────────────────────────────────────────────────────────────────

  const ticketRevenue = ticketSales.reduce((s, t) => s + t.totalPrice, 0)
  const ticketCount = ticketSales.reduce((s, t) => s + t.quantity, 0)
  const courtesyCount = ticketSales.filter(t => t.unitPrice === 0).reduce((s, t) => s + t.quantity, 0)

  const offerRevenue = offerSales.reduce((s, o) => s + o.value, 0)
  const offerCount = offerSales.length
  const avgOffer = offerCount ? offerRevenue / offerCount : 0

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-300">Eventos</Link>
        <span>/</span>
        <Link to={`/events/${id}`} className="hover:text-gray-300">{event?.name ?? '...'}</Link>
        <span>/</span>
        <span className="text-gray-200 font-medium">Vendas</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-6">Vendas</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-700 rounded-xl p-1 mb-6 w-fit">
        <button onClick={() => setTab('tickets')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'tickets' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}>
          Convites
        </button>
        <button onClick={() => setTab('offers')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'offers' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}>
          Oferta do Evento
        </button>
      </div>

      {/* ─── Tickets tab ─────────────────────────────────────────────────────────── */}
      {tab === 'tickets' && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{fmt(ticketRevenue)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total arrecadado</p>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{ticketCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Convites vendidos</p>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{courtesyCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Cortesias</p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{ticketSales.length} venda(s) registrada(s)</p>
            <button onClick={() => setShowTicketModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              + Registrar Venda
            </button>
          </div>

          {ticketSales.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <p className="text-4xl mb-3">🎟️</p>
              <p className="text-sm text-gray-500">Nenhuma venda registrada</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Convidado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo / Lote</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qtd</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {ticketSales.map(s => (
                    <tr key={s.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium text-white">{s.guestName}</td>
                      <td className="px-4 py-3">
                        <span className="text-white">{s.ticketType.name}</span>
                        <span className="text-xs text-gray-500 ml-1">{LOT_LABELS[s.ticketType.lot - 1]} Lote</span>
                        {s.unitPrice === 0 && <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Cortesia</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">{s.quantity}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-medium">{fmt(s.totalPrice)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{fmtDate(s.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { if (confirm('Remover esta venda?')) deleteTicketSale.mutate(s.id) }}
                          className="text-xs text-red-500 hover:text-red-400">✕</button>
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
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{fmt(offerRevenue)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total arrecadado</p>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{offerCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Vendas realizadas</p>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{fmt(avgOffer)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Ticket médio</p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{offerSales.length} venda(s) registrada(s)</p>
            <button onClick={openNewOffer}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              + Registrar Venda
            </button>
          </div>

          {offerSales.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <p className="text-4xl mb-3">💰</p>
              <p className="text-sm text-gray-500">Nenhuma venda de oferta registrada</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">CPF</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pagamento</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {offerSales.map(o => (
                    <tr key={o.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium text-white">{o.guestName}</td>
                      <td className="px-4 py-3 text-gray-500">{o.cpf ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-medium">{fmt(o.value)}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {o.isEntrada ? 'Entrada + negociar' : o.installments ? `${o.installments}x` : 'À vista'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{fmtDate(o.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => openEditOffer(o)} className="text-xs text-blue-400 hover:text-blue-300">✎</button>
                          <button onClick={() => { if (confirm('Remover esta venda?')) deleteOfferSale.mutate(o.id) }}
                            className="text-xs text-red-500 hover:text-red-400">✕</button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-white mb-4">Registrar Venda de Convite</h3>

            {ticketTypes.length === 0 && (
              <p className="text-sm text-amber-400 bg-amber-900/20 border border-amber-700 rounded-lg p-3 mb-4">
                Nenhum tipo de convite cadastrado. Vá em Configurações do evento ou adicione um tipo primeiro.
              </p>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Convidado da lista</label>
                <select value={ticketForm.guestId}
                  onChange={e => {
                    const g = guests.find(g => g.id === e.target.value)
                    setTicketForm(f => ({ ...f, guestId: e.target.value, guestName: g?.name ?? f.guestName }))
                  }}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Buscar na lista (opcional) —</option>
                  {guests.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nome do comprador *</label>
                <input value={ticketForm.guestName}
                  onChange={e => setTicketForm(f => ({ ...f, guestName: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Tipo de convite *</label>
                <select value={ticketForm.ticketTypeId}
                  onChange={e => setTicketForm(f => ({ ...f, ticketTypeId: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                  <label className="block text-xs font-medium text-gray-400 mb-1">Quantidade</label>
                  <input type="number" min={1} value={ticketForm.quantity}
                    onChange={e => setTicketForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                    <input type="checkbox" checked={ticketForm.overrideCourtesy}
                      onChange={e => setTicketForm(f => ({ ...f, overrideCourtesy: e.target.checked }))}
                      className="w-4 h-4 accent-purple-500" />
                    Cortesia
                  </label>
                </div>
              </div>
              {selectedTicketType && (
                <p className="text-sm text-gray-400 bg-gray-800 rounded-lg px-3 py-2">
                  Total: <span className="text-emerald-400 font-semibold">{fmt(unitPrice * ticketForm.quantity)}</span>
                </p>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowTicketModal(false)}
                className="flex-1 border border-gray-600 rounded-lg py-2 text-sm text-gray-400 hover:bg-gray-800">Cancelar</button>
              <button onClick={submitTicketSale}
                disabled={!ticketForm.ticketTypeId || !ticketForm.guestName.trim() || addTicketSale.isPending}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {addTicketSale.isPending ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Offer Sale Modal ─────────────────────────────────────────────────────── */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-8">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h3 className="font-bold text-white mb-4">{editingOffer ? 'Editar Venda de Oferta' : 'Registrar Venda de Oferta'}</h3>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Convidado da lista</label>
                <select value={offerForm.guestId}
                  onChange={e => {
                    const g = guests.find(g => g.id === e.target.value)
                    setOfferForm(f => ({ ...f, guestId: e.target.value, guestName: g?.name ?? f.guestName }))
                  }}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Buscar na lista (opcional) —</option>
                  {guests.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nome completo *</label>
                <input value={offerForm.guestName}
                  onChange={e => setOfferForm(f => ({ ...f, guestName: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">CPF</label>
                  <input value={offerForm.cpf}
                    onChange={e => setOfferForm(f => ({ ...f, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                    className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">RG</label>
                  <input value={offerForm.rg}
                    onChange={e => setOfferForm(f => ({ ...f, rg: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Endereço completo</label>
                <input value={offerForm.address}
                  onChange={e => setOfferForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Rua, número, cidade, estado"
                  className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Valor do investimento (R$) *</label>
                <input type="number" min="0" step="0.01" value={offerForm.value}
                  onChange={e => setOfferForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="0,00"
                  className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Forma de pagamento</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                    <input type="radio" checked={!offerForm.isEntrada && !offerForm.installments}
                      onChange={() => setOfferForm(f => ({ ...f, isEntrada: false, installments: '' }))}
                      className="accent-blue-500" />
                    À vista
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                    <input type="radio" checked={!offerForm.isEntrada && !!offerForm.installments}
                      onChange={() => setOfferForm(f => ({ ...f, isEntrada: false, installments: '2' }))}
                      className="accent-blue-500" />
                    Parcelado
                    {!offerForm.isEntrada && !!offerForm.installments && (
                      <input type="number" min={2} max={24} value={offerForm.installments}
                        onChange={e => setOfferForm(f => ({ ...f, installments: e.target.value }))}
                        className="w-16 bg-gray-800 border border-gray-600 text-white rounded-lg px-2 py-1 text-sm"
                        placeholder="N" />
                    )}
                    {!offerForm.isEntrada && !!offerForm.installments && <span className="text-gray-500">parcelas</span>}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                    <input type="radio" checked={offerForm.isEntrada}
                      onChange={() => setOfferForm(f => ({ ...f, isEntrada: true, installments: '' }))}
                      className="accent-blue-500" />
                    Entrada + negociar com equipe
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Observações</label>
                <textarea value={offerForm.notes}
                  onChange={e => setOfferForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowOfferModal(false)}
                className="flex-1 border border-gray-600 rounded-lg py-2 text-sm text-gray-400 hover:bg-gray-800">Cancelar</button>
              <button onClick={submitOffer}
                disabled={!offerForm.guestName.trim() || !offerForm.value || addOfferSale.isPending || updateOfferSale.isPending}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {(addOfferSale.isPending || updateOfferSale.isPending) ? 'Salvando...' : editingOffer ? 'Salvar alterações' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
