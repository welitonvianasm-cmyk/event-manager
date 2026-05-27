import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'

type TicketFilter = 'all' | 'paid' | 'courtesy' | 'Normal' | 'VIP' | 'Premium'

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

  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [showImport, setShowImport] = useState(false)
  const [sheetUrl, setSheetUrl] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [importing, setImporting] = useState(false)
  const [search, setSearch] = useState('')
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('all')

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
        return sale && sale.ticketType?.name === ticketFilter
      })
    }
    return list
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

  if (isLoading) return <p className="text-sm text-gray-500">Carregando...</p>

  const filterChips: { value: TicketFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'paid', label: 'Pagantes' },
    { value: 'courtesy', label: 'Cortesia' },
    { value: 'Normal', label: 'Normal' },
    { value: 'VIP', label: 'VIP' },
    { value: 'Premium', label: 'Premium' },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-300">Eventos</Link>
        <span>/</span>
        <Link to={`/events/${id}`} className="hover:text-gray-300">{event?.name ?? '...'}</Link>
        <span>/</span>
        <span className="text-gray-200 font-medium">Lista de Convidados</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Lista de Convidados</h1>
          {event?.participants && (
            <p className="text-sm text-gray-500 mt-0.5">
              {total} de {event.participants} convidados previstos
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowImport(true)}
            className="text-sm border border-gray-600 rounded-lg px-4 py-2 text-gray-300 hover:bg-gray-800 flex items-center gap-1.5">
            📥 Importar Google Sheets
          </button>
          <button onClick={downloadCSV}
            className="text-sm border border-gray-600 rounded-lg px-4 py-2 text-gray-300 hover:bg-gray-800 flex items-center gap-1.5">
            📤 Exportar CSV
          </button>
          <button onClick={() => setShowAddForm(true)}
            className="text-sm bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700">
            + Adicionar Convidado
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{confirmed}</p>
          <p className="text-xs text-gray-500 mt-0.5">Confirmados</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{checkedIn}</p>
          <p className="text-xs text-gray-500 mt-0.5">Credenciados</p>
        </div>
      </div>

      {/* Add form modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-white mb-4">Adicionar Convidado</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nome *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Telefone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">E-mail</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowAddForm(false); setForm({ name: '', phone: '', email: '' }) }}
                className="flex-1 border border-gray-600 rounded-lg py-2 text-sm text-gray-400 hover:bg-gray-800">Cancelar</button>
              <button onClick={() => addGuest.mutate(form)} disabled={!form.name.trim() || addGuest.isPending}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {addGuest.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h3 className="font-bold text-white mb-2">Importar do Google Sheets</h3>
            <p className="text-xs text-gray-500 mb-4">
              A planilha precisa ter colunas com os nomes: <strong className="text-gray-300">nome</strong>, <strong className="text-gray-300">telefone</strong>, <strong className="text-gray-300">email</strong>. Certifique-se de que ela está compartilhada como "qualquer pessoa com o link pode ver".
            </p>
            <label className="block text-xs font-medium text-gray-400 mb-1">URL da planilha</label>
            <input value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus />
            {importMsg && (
              <p className={`text-sm mb-3 ${importMsg.includes('sucesso') ? 'text-emerald-400' : 'text-red-400'}`}>{importMsg}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setShowImport(false); setImportMsg(''); setSheetUrl('') }}
                className="flex-1 border border-gray-600 rounded-lg py-2 text-sm text-gray-400 hover:bg-gray-800">Fechar</button>
              <button onClick={handleImport} disabled={!sheetUrl.trim() || importing}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
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
          className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 flex-wrap">
          {filterChips.map(chip => (
            <button key={chip.value} onClick={() => setTicketFilter(chip.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                ticketFilter === chip.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
              }`}>
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Guest table */}
      {guests.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-sm text-gray-500">Nenhum convidado ainda</p>
          <p className="text-xs mt-1 text-gray-600">Adicione manualmente ou importe do Google Sheets</p>
        </div>
      ) : filteredGuests.length === 0 ? (
        <div className="text-center py-10 text-gray-600">
          <p className="text-sm text-gray-500">Nenhum convidado encontrado com este filtro</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Convite</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">E-mail</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Confirmado</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Credenciado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((g: any, idx: number) => {
                const sale = saleByGuestId[g.id]
                return (
                  <tr key={g.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-600">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-white">{g.name}</td>
                    <td className="px-4 py-3">
                      {sale ? (
                        sale.unitPrice === 0
                          ? <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Cortesia</span>
                          : <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{sale.ticketType?.name ?? 'Pagante'}</span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{g.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{g.email ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={g.confirmed}
                        onChange={e => updateGuest.mutate({ gid: g.id, data: { confirmed: e.target.checked } })}
                        className="w-4 h-4 accent-emerald-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={g.checkedIn}
                        onChange={e => updateGuest.mutate({ gid: g.id, data: { checkedIn: e.target.checked } })}
                        className="w-4 h-4 accent-blue-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { if (confirm(`Remover ${g.name}?`)) deleteGuest.mutate(g.id) }}
                        className="text-xs text-red-500 hover:text-red-400">✕</button>
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
