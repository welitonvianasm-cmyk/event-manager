import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'

const TYPES = ['CREDENCIAMENTO', 'ABERTURA', 'PALESTRA', 'PITCH', 'REPITCH', 'COFFEE_BREAK', 'ALMOCO', 'QUEBRA_OBJECOES', 'ENCERRAMENTO', 'OUTRO']
const typeLabel: Record<string, string> = {
  CREDENCIAMENTO: 'Credenciamento', ABERTURA: 'Abertura', PALESTRA: 'Palestra',
  PITCH: 'Pitch de Vendas', REPITCH: 'Repitch', COFFEE_BREAK: 'Coffee Break',
  ALMOCO: 'Almoço', QUEBRA_OBJECOES: 'Quebra de Objeções', ENCERRAMENTO: 'Encerramento', OUTRO: 'Outro',
}
const typeColor: Record<string, string> = {
  CREDENCIAMENTO: 'bg-gray-100 text-gray-600', ABERTURA: 'bg-blue-100 text-blue-700',
  PALESTRA: 'bg-indigo-100 text-indigo-700', PITCH: 'bg-yellow-100 text-yellow-700',
  REPITCH: 'bg-orange-100 text-orange-700', COFFEE_BREAK: 'bg-amber-100 text-amber-700',
  ALMOCO: 'bg-green-100 text-green-700', QUEBRA_OBJECOES: 'bg-purple-100 text-purple-700',
  ENCERRAMENTO: 'bg-red-100 text-red-700', OUTRO: 'bg-gray-100 text-gray-500',
}

const emptyForm = { startTime: '', endTime: '', title: '', type: 'PALESTRA', responsible: '', notes: '' }

export default function ScriptPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [activeDay, setActiveDay] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)

  const { data: days, isLoading } = useQuery<any[]>({
    queryKey: ['script', id],
    queryFn: () => api.get(`/events/${id}/script`).then(r => r.data),
  })

  const addItem = useMutation({
    mutationFn: (data: object) => api.post(`/events/${id}/script/items`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['script', id] }); setShowForm(false); setForm(emptyForm) },
  })

  const updateItem = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: object }) =>
      api.patch(`/events/${id}/script/items/${itemId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['script', id] }); setEditId(null) },
  })

  const deleteItem = useMutation({
    mutationFn: (itemId: string) => api.delete(`/events/${id}/script/items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['script', id] }),
  })

  if (isLoading) return <p className="text-sm text-gray-400">Carregando...</p>

  const currentDay = days?.find(d => d.dayNumber === activeDay)

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
        <Link to={`/events/${id}`} className="hover:text-gray-700">← Voltar ao evento</Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minuto a Minuto</h1>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Adicionar bloco
        </button>
      </div>

      {/* Day tabs */}
      {(days?.length ?? 0) > 1 && (
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {days?.map(d => (
            <button key={d.dayNumber} onClick={() => setActiveDay(d.dayNumber)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeDay === d.dayNumber ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {d.label ?? `Dia ${d.dayNumber}`}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-900 mb-4">Adicionar bloco</h3>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora inicial *</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora final *</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">O que acontece / Tema *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {TYPES.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Responsável</label>
                  <input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowForm(false); setForm(emptyForm) }}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => addItem.mutate({ ...form, dayNumber: activeDay })}
                disabled={!form.startTime || !form.endTime || !form.title || addItem.isPending}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {addItem.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[80px_80px_80px_1fr_140px_140px_100px] gap-0 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Início</span><span>Fim</span><span>Duração</span><span>O que / Tema</span><span>Tipo</span><span>Responsável</span><span></span>
        </div>
        {!currentDay?.items?.length ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">⏱️</p>
            <p className="text-sm">Nenhum bloco ainda. Clique em "Adicionar bloco".</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {currentDay.items.map((item: any) => (
              <div key={item.id}
                className="grid grid-cols-[80px_80px_80px_1fr_140px_140px_100px] gap-0 px-4 py-3 items-center hover:bg-gray-50 group">
                {editId === item.id ? (
                  <>
                    <input type="time" defaultValue={item.startTime}
                      onBlur={e => updateItem.mutate({ itemId: item.id, data: { startTime: e.target.value } })}
                      className="border border-gray-300 rounded px-2 py-1 text-xs" />
                    <input type="time" defaultValue={item.endTime}
                      onBlur={e => updateItem.mutate({ itemId: item.id, data: { endTime: e.target.value } })}
                      className="border border-gray-300 rounded px-2 py-1 text-xs" />
                    <span className="text-xs text-gray-400">{item.duration}</span>
                    <input defaultValue={item.title}
                      onBlur={e => updateItem.mutate({ itemId: item.id, data: { title: e.target.value } })}
                      className="border border-gray-300 rounded px-2 py-1 text-sm font-medium" />
                    <select defaultValue={item.type}
                      onChange={e => updateItem.mutate({ itemId: item.id, data: { type: e.target.value } })}
                      className="border border-gray-300 rounded px-2 py-1 text-xs">
                      {TYPES.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
                    </select>
                    <input defaultValue={item.responsible ?? ''}
                      onBlur={e => updateItem.mutate({ itemId: item.id, data: { responsible: e.target.value } })}
                      className="border border-gray-300 rounded px-2 py-1 text-xs" />
                    <button onClick={() => setEditId(null)} className="text-xs text-green-600 hover:text-green-800">✓ Feito</button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-mono text-gray-700">{item.startTime}</span>
                    <span className="text-sm font-mono text-gray-700">{item.endTime}</span>
                    <span className="text-xs text-gray-400">{item.duration}</span>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{item.title}</span>
                      {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${typeColor[item.type]}`}>{typeLabel[item.type]}</span>
                    <span className="text-sm text-gray-500">{item.responsible ?? '—'}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditId(item.id)} className="text-xs text-blue-500 hover:text-blue-700">Editar</button>
                      <button onClick={() => { if (confirm('Excluir?')) deleteItem.mutate(item.id) }}
                        className="text-xs text-red-400 hover:text-red-600">✕</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
