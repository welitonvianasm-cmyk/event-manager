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
  CREDENCIAMENTO: 'bg-[#F3F2F8] text-[#6B7280]',
  ABERTURA: 'bg-[#D9F0FC] text-[#0C6E93]',
  PALESTRA: 'bg-[#EDE9F8] text-[#7C5CBF]',
  PITCH: 'bg-[#FEF3CD] text-[#92610A]',
  REPITCH: 'bg-[#FDEBD0] text-[#9C4221]',
  COFFEE_BREAK: 'bg-[#FFFBEB] text-[#92610A]',
  ALMOCO: 'bg-[#D4EDDA] text-[#155724]',
  QUEBRA_OBJECOES: 'bg-[#EDE9F8] text-[#7C5CBF]',
  ENCERRAMENTO: 'bg-[#FDEDEE] text-[#C0392B]',
  OUTRO: 'bg-[#F3F2F8] text-[#9CA3AF]',
}

const inp = 'w-full bg-white border border-black/[0.08] text-[#1A1A2E] placeholder-[#9CA3AF] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]'
const lbl = 'block text-xs font-bold text-[#6B7280] mb-1'

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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-6 w-full max-w-md">
        <h3 className="font-bold text-[#1A1A2E] mb-4">Adicionar bloco — Dia {dayNumber}</h3>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Hora inicial *</label>
              <input type="time" value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className={inp} />
            </div>
            <div>
              <label className={lbl}>Hora final *</label>
              <input type="time" value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className={inp} />
            </div>
          </div>
          {form.startTime && form.endTime && (
            <p className="text-xs text-[#9CA3AF]">
              Duração: <span className="text-[#7C5CBF] font-bold">{durStr(form.startTime, form.endTime)}</span>
            </p>
          )}
          <div>
            <label className={lbl}>O que acontece / Tema *</label>
            <input value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Tipo</label>
              <select value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className={inp}>
                {TYPES.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Responsável</label>
              <input value={form.responsible}
                onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Observações</label>
            <textarea value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className={`${inp} resize-none`} />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose}
            className="flex-1 border border-black/[0.15] rounded-full py-2 text-sm text-[#6B7280] hover:bg-[#F3F2F8] transition-colors">
            Cancelar
          </button>
          <button onClick={submit}
            disabled={!form.startTime || !form.endTime || !form.title}
            className="flex-1 bg-[#7C5CBF] text-white rounded-full py-2 text-sm font-bold hover:bg-[#9B7DD4] transition-colors disabled:opacity-50">
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Day Section ──────────────────────────────────────────────────────────────

const dayBorderColors = [
  'border-l-[#7C5CBF]', 'border-l-[#4CD080]', 'border-l-[#45B5E8]',
  'border-l-[#F4C542]', 'border-l-[#E87D7D]',
]
const dayBgColors = [
  'bg-[#EDE9F8]', 'bg-[#D4EDDA]', 'bg-[#D9F0FC]',
  'bg-[#FEF3CD]', 'bg-[#FDEDEE]',
]
const dayTextColors = [
  'text-[#7C5CBF]', 'text-[#155724]', 'text-[#0C6E93]',
  'text-[#92610A]', 'text-[#C0392B]',
]

function DaySection({ day, eventId, onAdd, onBulkUpdate, onDelete }: {
  day: any
  eventId: string
  onAdd: () => void
  onBulkUpdate: (updates: any[]) => void
  onDelete: (itemId: string, cascade: { id: string; startTime: string; endTime: string }[]) => void
}) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editBuf, setEditBuf] = useState<Record<string, string>>({})

  const items: any[] = day.items ?? []
  const colorIdx = (day.dayNumber - 1) % dayBorderColors.length

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

  const inpSm = 'bg-white border border-black/[0.08] text-[#1A1A2E] rounded-[8px] px-2 py-1 text-xs focus:outline-none focus:border-[#7C5CBF]'

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between bg-[#7C5CBF] rounded-[14px] px-5 py-4 mb-3 shadow-[0_1px_3px_rgba(124,92,191,0.3)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">
            {day.dayNumber}
          </div>
          <div>
            <h2 className="font-bold text-white text-lg">{day.label ?? `Dia ${day.dayNumber}`}</h2>
            <p className="text-xs text-white/70">{items.length} bloco(s) · {items[0]?.startTime ?? '—'} → {items[items.length - 1]?.endTime ?? '—'}</p>
          </div>
        </div>
        <button onClick={onAdd}
          className="text-sm bg-white text-[#7C5CBF] px-4 py-2 rounded-full hover:bg-[#F3F2F8] transition-colors font-bold">
          + Adicionar bloco
        </button>
      </div>

      <div className="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden shadow-[0_1px_3px_rgba(124,92,191,0.08)]">
        <div className="grid grid-cols-[72px_72px_72px_1fr_140px_130px_90px] gap-0 px-4 py-2 bg-[#F8F7FC] border-b border-black/[0.08] text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">
          <span>Início</span><span>Fim</span><span>Duração</span>
          <span>O que / Tema</span><span>Tipo</span><span>Responsável</span><span></span>
        </div>

        {!items.length ? (
          <div className="text-center py-10 text-[#9CA3AF]">
            <p className="text-2xl mb-2">⏱️</p>
            <p className="text-sm">Nenhum bloco ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.06]">
            {items.map((item: any) => (
              <div key={item.id}
                className={`grid grid-cols-[72px_72px_72px_1fr_140px_130px_90px] gap-0 px-4 py-3 items-center transition-colors group ${
                  editId === item.id ? 'bg-[#F8F7FC]' : 'hover:bg-[#FAFAFA]'
                }`}>
                {editId === item.id ? (
                  <>
                    <input type="time" value={editBuf.startTime}
                      onChange={e => setEditBuf(b => ({ ...b, startTime: e.target.value }))}
                      className={`${inpSm} w-16`} />
                    <input type="time" value={editBuf.endTime}
                      onChange={e => setEditBuf(b => ({ ...b, endTime: e.target.value }))}
                      className={`${inpSm} w-16`} />
                    <span className="text-xs text-[#7C5CBF] font-bold">
                      {editBuf.startTime && editBuf.endTime ? durStr(editBuf.startTime, editBuf.endTime) : '—'}
                    </span>
                    <input value={editBuf.title}
                      onChange={e => setEditBuf(b => ({ ...b, title: e.target.value }))}
                      className={`${inpSm} text-sm mr-2`} />
                    <select value={editBuf.type}
                      onChange={e => setEditBuf(b => ({ ...b, type: e.target.value }))}
                      className={inpSm}>
                      {TYPES.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
                    </select>
                    <input value={editBuf.responsible}
                      onChange={e => setEditBuf(b => ({ ...b, responsible: e.target.value }))}
                      placeholder="Responsável"
                      className={`${inpSm} placeholder-[#9CA3AF]`} />
                    <div className="flex gap-1">
                      <button onClick={() => saveEdit(item)}
                        className="text-xs text-[#4CD080] hover:text-[#38a167] font-bold px-1">✓ OK</button>
                      <button onClick={() => setEditId(null)}
                        className="text-xs text-[#9CA3AF] hover:text-[#6B7280] px-1">✕</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-mono text-[#1A1A2E]">{item.startTime}</span>
                    <span className="text-sm font-mono text-[#6B7280]">{item.endTime}</span>
                    <span className="text-xs text-[#9CA3AF]">{item.duration ?? durStr(item.startTime, item.endTime)}</span>
                    <div className="pr-2">
                      <span className="text-sm font-bold text-[#1A1A2E]">{item.title}</span>
                      {item.notes && <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">{item.notes}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full w-fit font-bold ${typeColor[item.type] ?? typeColor.OUTRO}`}>
                      {typeLabel[item.type] ?? item.type}
                    </span>
                    <span className="text-sm text-[#6B7280] truncate">{item.responsible ?? '—'}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(item)} className="text-xs text-[#7C5CBF] hover:text-[#9B7DD4]">Editar</button>
                      <button onClick={() => {
                        if (!confirm('Excluir?')) return
                        const idx = items.findIndex((i: any) => i.id === item.id)
                        const prevItem = idx > 0 ? items[idx - 1] : null
                        const cascade: { id: string; startTime: string; endTime: string }[] = []
                        if (prevItem) {
                          let prevEnd = prevItem.endTime
                          for (let j = idx + 1; j < items.length; j++) {
                            const it = items[j]
                            const dur = durMins(it.startTime, it.endTime)
                            const newStart = prevEnd
                            const newEnd = minsToTime(timeToMins(newStart) + dur)
                            cascade.push({ id: it.id, startTime: newStart, endTime: newEnd })
                            prevEnd = newEnd
                          }
                        }
                        onDelete(item.id, cascade)
                      }} className="text-xs text-red-400 hover:text-red-500">✕</button>
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

      const allSorted = [...existingItems, created].sort(
        (a: any, b: any) => timeToMins(a.startTime) - timeToMins(b.startTime)
      )
      const newIdx = allSorted.findIndex((i: any) => i.id === created.id)
      const cascade = buildCascade(allSorted, newIdx)
      const cascadeMap: Record<string, any> = {}
      for (const c of cascade) cascadeMap[c.id] = c

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
  })

  if (isLoading) return <p className="text-sm text-[#9CA3AF]">Carregando...</p>

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm text-[#9CA3AF]">
        <Link to={`/events/${id}`} className="hover:text-[#7C5CBF] transition-colors">← Voltar ao evento</Link>
      </div>
      <h1 className="text-[22px] font-bold text-[#1A1A2E] mb-6">Minuto a Minuto</h1>

      {!days.length ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <p className="text-4xl mb-3">⏱️</p>
          <p className="text-sm">Nenhum dia configurado ainda</p>
        </div>
      ) : (
        days.map((day: any) => (
          <DaySection
            key={day.dayNumber}
            day={day}
            eventId={id!}
            onAdd={() => setAddingDay(day.dayNumber)}
            onBulkUpdate={(updates) => bulkUpdate.mutate(updates)}
            onDelete={(itemId, cascade) => {
              deleteItem.mutate(itemId, {
                onSuccess: () => {
                  if (cascade.length > 0) {
                    bulkUpdate.mutate(cascade)
                  } else {
                    qc.invalidateQueries({ queryKey: ['script', id] })
                  }
                },
              })
            }}
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
