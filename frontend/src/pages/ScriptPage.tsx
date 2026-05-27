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
  CREDENCIAMENTO: 'bg-gray-700 text-gray-400', ABERTURA: 'bg-blue-500/20 text-blue-400',
  PALESTRA: 'bg-indigo-500/20 text-indigo-400', PITCH: 'bg-amber-500/20 text-amber-400',
  REPITCH: 'bg-orange-500/20 text-orange-400', COFFEE_BREAK: 'bg-yellow-500/20 text-yellow-400',
  ALMOCO: 'bg-emerald-500/20 text-emerald-400', QUEBRA_OBJECOES: 'bg-purple-500/20 text-purple-400',
  ENCERRAMENTO: 'bg-red-500/20 text-red-400', OUTRO: 'bg-gray-700 text-gray-500',
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

function timeToMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minsToTime(m: number) {
  const clamped = Math.min(Math.max(m, 0), 23 * 60 + 59)
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

function durMins(start: string, end: string) {
  return Math.max(0, timeToMins(end) - timeToMins(start))
}

function durStr(start: string, end: string) {
  const m = durMins(start, end)
  if (!m) return '—'
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? (m % 60) + 'min' : ''}` : `${m}min`
}

// Given sorted items and the index of the changed item,
// returns the cascade updates for all subsequent items (preserving each item's duration).
function buildCascade(items: any[], fromIdx: number) {
  const updates: { id: string; startTime: string; endTime: string }[] = []
  let prevEnd = items[fromIdx].endTime
  for (let i = fromIdx + 1; i < items.length; i++) {
    const dur = durMins(items[i].startTime, items[i].endTime)
    const newStart = prevEnd
    const newEnd = minsToTime(timeToMins(newStart) + dur)
    updates.push({ id: items[i].id, startTime: newStart, endTime: newEnd })
    prevEnd = newEnd
  }
  return updates
}

// ─── Add Modal ────────────────────────────────────────────────────────────────

const emptyForm = { startTime: '', endTime: '', title: '', type: 'PALESTRA', responsible: '', notes: '' }

function AddModal({ dayNumber, onClose, onSave }: {
  dayNumber: number
  onClose: () => void
  onSave: (data: object) => void
}) {
  const [form, setForm] = useState(emptyForm)

  function submit() {
    if (!form.startTime || !form.endTime || !form.title) return
    onSave({ ...form, dayNumber })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
        <h3 className="font-bold text-white mb-4">Adicionar bloco — Dia {dayNumber}</h3>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Hora inicial *</label>
              <input type="time" value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Hora final *</label>
              <input type="time" value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          {form.startTime && form.endTime && (
            <p className="text-xs text-gray-500">
              Duração: <span className="text-blue-400 font-medium">{durStr(form.startTime, form.endTime)}</span>
            </p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">O que acontece / Tema *</label>
            <input value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Tipo</label>
              <select value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
                {TYPES.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Responsável</label>
              <input value={form.responsible}
                onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Observações</label>
            <textarea value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose}
            className="flex-1 border border-gray-600 rounded-lg py-2 text-sm text-gray-400 hover:bg-gray-800">
            Cancelar
          </button>
          <button onClick={submit}
            disabled={!form.startTime || !form.endTime || !form.title}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Day Section ──────────────────────────────────────────────────────────────

function DaySection({ day, eventId, onAdd, onBulkUpdate, onDelete }: {
  day: any
  eventId: string
  onAdd: () => void
  onBulkUpdate: (updates: any[]) => void
  onDelete: (itemId: string) => void
}) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editBuf, setEditBuf] = useState<Record<string, string>>({})

  const items: any[] = day.items ?? []

  function startEdit(item: any) {
    setEditId(item.id)
    setEditBuf({
      startTime: item.startTime,
      endTime: item.endTime,
      title: item.title,
      type: item.type,
      responsible: item.responsible ?? '',
      notes: item.notes ?? '',
    })
  }

  function saveEdit(item: any) {
    const idx = items.findIndex(i => i.id === item.id)
    const newStart = editBuf.startTime ?? item.startTime
    const newEnd = editBuf.endTime ?? item.endTime

    const dur = durMins(item.startTime, item.endTime)
    const startChanged = newStart !== item.startTime
    const endChanged = newEnd !== item.endTime

    // Recalculate endTime if startTime changed (preserve duration)
    const finalEnd = startChanged && !endChanged
      ? minsToTime(timeToMins(newStart) + dur)
      : newEnd

    const updatedItems = items.map((it, i) =>
      i === idx ? { ...it, startTime: newStart, endTime: finalEnd } : it
    )

    const cascade = (startChanged || endChanged) ? buildCascade(updatedItems, idx) : []

    const mainUpdate = {
      id: item.id,
      startTime: newStart,
      endTime: finalEnd,
      title: editBuf.title,
      type: editBuf.type,
      responsible: editBuf.responsible || null,
      notes: editBuf.notes || null,
    }

    if (cascade.length > 0) {
      onBulkUpdate([mainUpdate, ...cascade])
    } else {
      onBulkUpdate([mainUpdate])
    }
    setEditId(null)
  }

  const colors = [
    'border-l-blue-500', 'border-l-emerald-500', 'border-l-purple-500',
    'border-l-amber-500', 'border-l-pink-500',
  ]
  const headerColor = colors[(day.dayNumber - 1) % colors.length]

  return (
    <div className="mb-8">
      {/* Day header */}
      <div className={`flex items-center justify-between bg-gray-900 border border-gray-700 border-l-4 ${headerColor} rounded-2xl px-5 py-4 mb-3`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-sm font-bold text-blue-400">
            {day.dayNumber}
          </div>
          <div>
            <h2 className="font-bold text-white text-lg">{day.label ?? `Dia ${day.dayNumber}`}</h2>
            <p className="text-xs text-gray-500">{items.length} bloco(s) · {items[0]?.startTime ?? '—'} → {items[items.length - 1]?.endTime ?? '—'}</p>
          </div>
        </div>
        <button onClick={onAdd}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
          + Adicionar bloco
        </button>
      </div>

      {/* Items */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[72px_72px_72px_1fr_140px_130px_90px] gap-0 px-4 py-2 bg-gray-800 border-b border-gray-700 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Início</span><span>Fim</span><span>Duração</span>
          <span>O que / Tema</span><span>Tipo</span><span>Responsável</span><span></span>
        </div>

        {!items.length ? (
          <div className="text-center py-10 text-gray-600">
            <p className="text-2xl mb-2">⏱️</p>
            <p className="text-sm text-gray-500">Nenhum bloco ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {items.map((item: any) => (
              <div key={item.id}
                className={`grid grid-cols-[72px_72px_72px_1fr_140px_130px_90px] gap-0 px-4 py-3 items-center transition-colors group ${
                  editId === item.id ? 'bg-gray-800' : 'hover:bg-gray-800/40'
                }`}>
                {editId === item.id ? (
                  <>
                    <input type="time" value={editBuf.startTime}
                      onChange={e => setEditBuf(b => ({ ...b, startTime: e.target.value }))}
                      className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs w-16" />
                    <input type="time" value={editBuf.endTime}
                      onChange={e => setEditBuf(b => ({ ...b, endTime: e.target.value }))}
                      className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs w-16" />
                    <span className="text-xs text-blue-400 font-medium">
                      {editBuf.startTime && editBuf.endTime ? durStr(editBuf.startTime, editBuf.endTime) : '—'}
                    </span>
                    <input value={editBuf.title}
                      onChange={e => setEditBuf(b => ({ ...b, title: e.target.value }))}
                      className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm font-medium mr-2" />
                    <select value={editBuf.type}
                      onChange={e => setEditBuf(b => ({ ...b, type: e.target.value }))}
                      className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs">
                      {TYPES.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
                    </select>
                    <input value={editBuf.responsible}
                      onChange={e => setEditBuf(b => ({ ...b, responsible: e.target.value }))}
                      placeholder="Responsável"
                      className="bg-gray-700 border border-gray-600 text-white placeholder-gray-600 rounded px-2 py-1 text-xs" />
                    <div className="flex gap-1">
                      <button onClick={() => saveEdit(item)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium px-1">✓ OK</button>
                      <button onClick={() => setEditId(null)}
                        className="text-xs text-gray-500 hover:text-gray-400 px-1">✕</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-mono text-white">{item.startTime}</span>
                    <span className="text-sm font-mono text-gray-400">{item.endTime}</span>
                    <span className="text-xs text-gray-500">{item.duration ?? durStr(item.startTime, item.endTime)}</span>
                    <div className="pr-2">
                      <span className="text-sm font-medium text-white">{item.title}</span>
                      {item.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{item.notes}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${typeColor[item.type] ?? typeColor.OUTRO}`}>
                      {typeLabel[item.type] ?? item.type}
                    </span>
                    <span className="text-sm text-gray-400 truncate">{item.responsible ?? '—'}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(item)} className="text-xs text-blue-400 hover:text-blue-300">Editar</button>
                      <button onClick={() => { if (confirm('Excluir?')) onDelete(item.id) }}
                        className="text-xs text-red-500 hover:text-red-400">✕</button>
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

// ─── Main ScriptPage ──────────────────────────────────────────────────────────

export default function ScriptPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [addingDay, setAddingDay] = useState<number | null>(null)

  const { data: days = [], isLoading } = useQuery<any[]>({
    queryKey: ['script', id],
    queryFn: () => api.get(`/events/${id}/script`).then(r => r.data),
  })

  const bulkUpdate = useMutation({
    mutationFn: (updates: any[]) => api.patch(`/events/${id}/script/bulk`, { updates }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['script', id] }),
  })

  const addItem = useMutation({
    mutationFn: (data: object) => api.post(`/events/${id}/script/items`, data).then(r => r.data),
    onSuccess: (created: any, variables: any) => {
      const dayNumber = (variables as any).dayNumber ?? 1
      const day = days.find((d: any) => d.dayNumber === dayNumber)
      const existingItems: any[] = day?.items ?? []

      // Sort all items (including new) by startTime → assign correct orders
      const allSorted = [...existingItems, created].sort(
        (a: any, b: any) => timeToMins(a.startTime) - timeToMins(b.startTime)
      )
      const newIdx = allSorted.findIndex((i: any) => i.id === created.id)

      // Cascade times from the new item's position
      const cascade = buildCascade(allSorted, newIdx)
      const cascadeMap: Record<string, any> = {}
      for (const c of cascade) cascadeMap[c.id] = c

      // Build bulk updates: order for all + cascade times for affected
      const updates = allSorted.map((item: any, order: number) => ({
        id: item.id,
        order,
        ...(cascadeMap[item.id] ?? {}),
      }))

      bulkUpdate.mutate(updates)
    },
  })

  const deleteItem = useMutation({
    mutationFn: (itemId: string) => api.delete(`/events/${id}/script/items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['script', id] }),
  })

  if (isLoading) return <p className="text-sm text-gray-500">Carregando...</p>

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
        <Link to={`/events/${id}`} className="hover:text-gray-300">← Voltar ao evento</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Minuto a Minuto</h1>

      {!days.length ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">⏱️</p>
          <p className="text-sm text-gray-500">Nenhum dia configurado ainda</p>
        </div>
      ) : (
        days.map((day: any) => (
          <DaySection
            key={day.dayNumber}
            day={day}
            eventId={id!}
            onAdd={() => setAddingDay(day.dayNumber)}
            onBulkUpdate={(updates) => bulkUpdate.mutate(updates)}
            onDelete={(itemId) => deleteItem.mutate(itemId)}
          />
        ))
      )}

      {addingDay !== null && (
        <AddModal
          dayNumber={addingDay}
          onClose={() => setAddingDay(null)}
          onSave={(data) => { addItem.mutate(data); setAddingDay(null) }}
        />
      )}
    </div>
  )
}
