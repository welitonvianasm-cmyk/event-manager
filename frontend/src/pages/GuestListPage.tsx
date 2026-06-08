import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'

type TicketFilter = 'all' | 'paid' | 'courtesy' | 'Normal' | 'VIP' | 'Premium' | 'confirmed' | 'checkedIn'

const inp = 'w-full bg-white border border-black/[0.08] text-[#1A1A2E] placeholder-[#9CA3AF] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]'
const lbl = 'block text-xs font-bold text-[#6B7280] mb-1'

export default function GuestListPage() {
  const { id } = useParams()
  const qc = useQueryClient()

  const { data: event } = useQuery<any>({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  })

  const { data: guests = [], isLoading } = useQuery<any[]>({
    queryKey: ['guests', id],
    queryFn: () => api.get(`/events/${id}/guests`).then(r => r.data),
  })

  const { data: ticketSales = [] } = useQuery<any[]>({
    queryKey: ['ticket-sales', id],
    queryFn: () => api.get(`/events/${id}/ticket-sales`).then(r => r.data),
  })

  const { data: ticketTypes = [] } = useQuery<any[]>({
    queryKey: ['ticket-types', id],
    queryFn: () => api.get(`/events/${id}/ticket-types`).then(r => r.data),
  })

  const linkTicketSale = useMutation({
    mutationFn: (data: object) => api.post(`/events/${id}/ticket-sales`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-sales', id] })
      setLinkingGuest(null)
      setLinkTicketTypeId('')
      setLinkIsCourtesy(false)
    },
  })

  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [showImport, setShowImport] = useState(false)
  const [sheetUrl, setSheetUrl] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [importing, setImporting] = useState(false)
  const [search, setSearch] = useState('')
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('all')
  const [linkingGuest, setLinkingGuest] = useState<any | null>(null)
  const [linkTicketTypeId, setLinkTicketTypeId] = useState('')
  const [linkIsCourtesy, setLinkIsCourtesy] = useState(false)

  const saleByGuestId = useMemo(() => {
    const map: Record<string, any> = {}
    for (const s of ticketSales) {
      if (s.guestId && !map[s.guestId]) map[s.guestId] = s
    }
    return map
  }, [ticketSales])

  const filteredGuests = useMemo(() => {
    let list = guests
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((g: any) => g.name.toLowerCase().includes(q))
    }
    if (ticketFilter !== 'all') {
      list = list.filter((g: any) => {
        const sale = saleByGuestId[g.id]
        if (ticketFilter === 'paid') return sale && sale.unitPrice > 0
        if (ticketFilter === 'courtesy') return sale && sale.unitPrice === 0
        if (ticketFilter === 'confirmed') return g.confirmed
        if (ticketFilter === 'checkedIn') return g.checkedIn
        return sale && sale.ticketType?.name === ticketFilter
      })
    }
    return [...list].sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [guests, search, ticketFilter, saleByGuestId])

  const addGuest = useMutation({
    mutationFn: (data: object) => api.post(`/events/${id}/guests`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guests', id] })
      qc.invalidateQueries({ queryKey: ['guests-count', id] })
      setShowAddForm(false)
      setForm({ name: '', phone: '', email: '' })
    },
  })

  const updateGuest = useMutation({
    mutationFn: ({ gid, data }: { gid: string; data: object }) =>
      api.patch(`/events/${id}/guests/${gid}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guests', id] }),
  })

  const deleteGuest = useMutation({
    mutationFn: (gid: string) => api.delete(`/events/${id}/guests/${gid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guests', id] })
      qc.invalidateQueries({ queryKey: ['guests-count', id] })
    },
  })

  async function handleImport() {
    if (!sheetUrl.trim()) return
    setImporting(true)
    setImportMsg('')
    try {
      const { data } = await api.post(`/events/${id}/guests/import`, { sheetUrl: sheetUrl.trim() })
      setImportMsg(`${data.imported} convidado(s) importado(s) com sucesso!`)
      qc.invalidateQueries({ queryKey: ['guests', id] })
      qc.invalidateQueries({ queryKey: ['guests-count', id] })
      setSheetUrl('')
    } catch (err: any) {
      setImportMsg(err.response?.data?.error ?? 'Erro ao importar. Verifique se a planilha é pública.')
    } finally {
      setImporting(false)
    }
  }

  async function downloadCSV() {
    const resp = await api.get(`/events/${id}/guests/export`, { responseType: 'blob' })
    const url = URL.createObjectURL(resp.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `convidados-${id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const total = guests.length
  const confirmed = guests.filter((g: any) => g.confirmed).length
  const checkedIn = guests.filter((g: any) => g.checkedIn).length

  if (isLoading) return <p className="text-sm text-[#9CA3AF]">Carregando...</p>

  const filterChips: { value: TicketFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'confirmed', label: 'Confirmados' },
    { value: 'checkedIn', label: 'Credenciados' },
    { value: 'paid', label: 'Pagantes' },
    { value: 'courtesy', label: 'Cortesia' },
    { value: 'Normal', label: 'Normal' },
    { value: 'VIP', label: 'VIP' },
    { value: 'Premium', label: 'Premium' },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-[#9CA3AF]">
        <Link to="/" className="hover:text-[#7C5CBF] transition-colors">Eventos</Link>
        <span>/</span>
        <Link to={`/events/${id}`} className="hover:text-[#7C5CBF] transition-colors">{event?.name ?? '...'}</Link>
        <span>/</span>
        <span className="text-[#1A1A2E] font-bold">Lista de Convidados</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1A2E]">Lista de Convidados</h1>
          {event?.participants && (
            <p className="text-sm text-[#6B7280] mt-0.5">
              {total} de {event.participants} convidados previstos
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowImport(true)}
            className="text-sm border border-black/[0.15] rounded-full px-4 py-2 text-[#6B7280] hover:bg-[#F3F2F8] transition-colors flex items-center gap-1.5">
            📥 Importar Google Sheets
          </button>
          <button onClick={downloadCSV}
            className="text-sm border border-black/[0.15] rounded-full px-4 py-2 text-[#6B7280] hover:bg-[#F3F2F8] transition-colors flex items-center gap-1.5">
            📤 Exportar CSV
          </button>
          <button onClick={() => setShowAddForm(true)}
            className="text-sm bg-[#7C5CBF] text-white rounded-full px-5 py-2 font-bold hover:bg-[#9B7DD4] transition-colors">
            + Adicionar Convidado
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#7C5CBF] rounded-[14px] shadow-[0_1px_3px_rgba(124,92,191,0.3)] p-4 text-center">
          <p className="text-2xl font-bold text-white">{total}</p>
          <p className="text-xs text-white/70 mt-0.5">Total</p>
        </div>
        <div className="bg-[#7C5CBF] rounded-[14px] shadow-[0_1px_3px_rgba(124,92,191,0.3)] p-4 text-center">
          <p className="text-2xl font-bold text-white">{confirmed}</p>
          <p className="text-xs text-white/70 mt-0.5">Confirmados</p>
        </div>
        <div className="bg-[#7C5CBF] rounded-[14px] shadow-[0_1px_3px_rgba(124,92,191,0.3)] p-4 text-center">
          <p className="text-2xl font-bold text-white">{checkedIn}</p>
          <p className="text-xs text-white/70 mt-0.5">Credenciados</p>
        </div>
      </div>

      {/* Add form modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-[#1A1A2E] mb-4">Adicionar Convidado</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className={lbl}>Nome *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inp} autoFocus />
              </div>
              <div>
                <label className={lbl}>Telefone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className={inp} />
              </div>
              <div>
                <label className={lbl}>E-mail</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={inp} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowAddForm(false); setForm({ name: '', phone: '', email: '' }) }}
                className="flex-1 border border-black/[0.15] rounded-full py-2 text-sm text-[#6B7280] hover:bg-[#F3F2F8] transition-colors">Cancelar</button>
              <button onClick={() => addGuest.mutate(form)} disabled={!form.name.trim() || addGuest.isPending}
                className="flex-1 bg-[#7C5CBF] text-white rounded-full py-2 text-sm font-bold hover:bg-[#9B7DD4] transition-colors disabled:opacity-50">
                {addGuest.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vincular convite modal */}
      {linkingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-[#1A1A2E] mb-1">Vincular Convite</h3>
            <p className="text-xs text-[#9CA3AF] mb-4">{linkingGuest.name}</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className={lbl}>Tipo de Convite *</label>
                <select
                  value={linkTicketTypeId}
                  onChange={e => setLinkTicketTypeId(e.target.value)}
                  className={inp}>
                  <option value="">Selecione...</option>
                  {ticketTypes.map((tt: any) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name} — {tt.lot}º lote {tt.isCourtesy ? '(Cortesia)' : `R$ ${tt.price.toFixed(2)}`}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={linkIsCourtesy} onChange={e => setLinkIsCourtesy(e.target.checked)}
                  className="w-4 h-4 accent-[#7C5CBF]" />
                <span className="text-sm text-[#1A1A2E]">Cortesia (valor zerado)</span>
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setLinkingGuest(null); setLinkTicketTypeId(''); setLinkIsCourtesy(false) }}
                className="flex-1 border border-black/[0.15] rounded-full py-2 text-sm text-[#6B7280] hover:bg-[#F3F2F8] transition-colors">Cancelar</button>
              <button
                disabled={!linkTicketTypeId || linkTicketSale.isPending}
                onClick={() => {
                  const tt = ticketTypes.find((t: any) => t.id === linkTicketTypeId)
                  if (!tt) return
                  const unitPrice = linkIsCourtesy ? 0 : tt.price
                  linkTicketSale.mutate({
                    ticketTypeId: tt.id,
                    guestId: linkingGuest.id,
                    guestName: linkingGuest.name,
                    quantity: 1,
                    unitPrice,
                  })
                }}
                className="flex-1 bg-[#7C5CBF] text-white rounded-full py-2 text-sm font-bold hover:bg-[#9B7DD4] transition-colors disabled:opacity-50">
                {linkTicketSale.isPending ? 'Salvando...' : 'Vincular'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-6 w-full max-w-lg mx-4">
            <h3 className="font-bold text-[#1A1A2E] mb-2">Importar do Google Sheets</h3>
            <p className="text-xs text-[#6B7280] mb-4">
              A planilha precisa ter colunas com os nomes: <strong className="text-[#1A1A2E]">nome</strong>, <strong className="text-[#1A1A2E]">telefone</strong>, <strong className="text-[#1A1A2E]">email</strong>. Certifique-se de que ela está compartilhada como "qualquer pessoa com o link pode ver".
            </p>
            <label className={lbl}>URL da planilha</label>
            <input value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className={`${inp} mb-3`}
              autoFocus />
            {importMsg && (
              <p className={`text-sm mb-3 font-bold ${importMsg.includes('sucesso') ? 'text-[#4CD080]' : 'text-red-500'}`}>{importMsg}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setShowImport(false); setImportMsg(''); setSheetUrl('') }}
                className="flex-1 border border-black/[0.15] rounded-full py-2 text-sm text-[#6B7280] hover:bg-[#F3F2F8] transition-colors">Fechar</button>
              <button onClick={handleImport} disabled={!sheetUrl.trim() || importing}
                className="flex-1 bg-[#7C5CBF] text-white rounded-full py-2 text-sm font-bold hover:bg-[#9B7DD4] transition-colors disabled:opacity-50">
                {importing ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col gap-3 mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar convidado pelo nome..."
          className={inp}
        />
        <div className="flex gap-2 flex-wrap">
          {filterChips.map(chip => (
            <button key={chip.value} onClick={() => setTicketFilter(chip.value)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                ticketFilter === chip.value
                  ? 'bg-[#7C5CBF] text-white'
                  : 'bg-white text-[#6B7280] border border-black/[0.08] hover:border-[#7C5CBF] hover:text-[#7C5CBF]'
              }`}>
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Guest table */}
      {guests.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-sm">Nenhum convidado ainda</p>
          <p className="text-xs mt-1 text-[#9CA3AF]">Adicione manualmente ou importe do Google Sheets</p>
        </div>
      ) : filteredGuests.length === 0 ? (
        <div className="text-center py-10 text-[#9CA3AF]">
          <p className="text-sm">Nenhum convidado encontrado com este filtro</p>
        </div>
      ) : (
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F7FC] border-b border-black/[0.08]">
              <tr>
                <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">#</th>
                <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Nome</th>
                <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Convite</th>
                <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Telefone</th>
                <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">E-mail</th>
                <th className="text-center px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Confirmado</th>
                <th className="text-center px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Credenciado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((g: any, idx: number) => {
                const sale = saleByGuestId[g.id]
                return (
                  <tr key={g.id} className="border-b border-black/[0.06] last:border-0 hover:bg-[#F8F7FC]">
                    <td className="px-4 py-3 text-[#9CA3AF] text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-[#1A1A2E]">{g.name}</td>
                    <td className="px-4 py-3">
                      {sale ? (
                        sale.unitPrice === 0
                          ? <span className="text-xs bg-[#EDE9F8] text-[#7C5CBF] px-2 py-0.5 rounded-full font-bold">Cortesia</span>
                          : <span className="text-xs bg-[#D4EDDA] text-[#155724] px-2 py-0.5 rounded-full font-bold">{sale.ticketType?.name ?? 'Pagante'}</span>
                      ) : ticketTypes.length > 0 ? (
                        <button
                          onClick={() => { setLinkingGuest(g); setLinkTicketTypeId(''); setLinkIsCourtesy(false) }}
                          className="text-xs text-[#7C5CBF] hover:text-[#9B7DD4] border border-[#C4B5FD] rounded-full px-2 py-0.5 hover:bg-[#EDE9F8] transition-colors font-bold">
                          + Vincular
                        </button>
                      ) : (
                        <span className="text-xs text-[#9CA3AF]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {g.phone ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#6B7280]">{g.phone}</span>
                          <a href={`https://wa.me/55${g.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                            title="Conversar no WhatsApp"
                            className="text-[#4CD080] hover:text-[#38a167] text-xs font-bold border border-[#4CD080]/40 rounded-full px-2 py-0.5 hover:bg-[#D4EDDA] transition-colors">
                            💬
                          </a>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{g.email ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={g.confirmed}
                        onChange={e => updateGuest.mutate({ gid: g.id, data: { confirmed: e.target.checked } })}
                        className="w-4 h-4 accent-[#4CD080] cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={g.checkedIn}
                        onChange={e => updateGuest.mutate({ gid: g.id, data: { checkedIn: e.target.checked } })}
                        className="w-4 h-4 accent-[#7C5CBF] cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { if (confirm(`Remover ${g.name}?`)) deleteGuest.mutate(g.id) }}
                        className="text-xs text-red-400 hover:text-red-500">✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
