import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'

type Status = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO'

interface Person {
  id: string
  name: string
  role?: string
}

interface ChecklistItem {
  id: string
  title: string
  status: Status
  assignee?: string | null
  personId?: string | null
  dueDate?: string | null
  notes?: string | null
  person?: Person | null
}

interface Section {
  id: string
  name: string
  items: ChecklistItem[]
}

const statusIcon: Record<Status, string> = {
  PENDENTE: '○',
  EM_ANDAMENTO: '◑',
  CONCLUIDO: '●',
}
const statusColor: Record<Status, string> = {
  PENDENTE: 'text-gray-400',
  EM_ANDAMENTO: 'text-yellow-500',
  CONCLUIDO: 'text-green-500',
}

function nextStatus(s: Status): Status {
  if (s === 'PENDENTE') return 'EM_ANDAMENTO'
  if (s === 'EM_ANDAMENTO') return 'CONCLUIDO'
  return 'PENDENTE'
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function isOverdue(iso: string) {
  return new Date(iso) < new Date(new Date().toDateString())
}

export default function ChecklistPage() {
  const { id } = useParams()
  const qc = useQueryClient()

  // New section state
  const [addingSectionName, setAddingSectionName] = useState('')
  const [showAddSection, setShowAddSection] = useState(false)

  // New item state per section (sectionId → title)
  const [addingItem, setAddingItem] = useState<Record<string, string>>({})

  // Edit inline: item being edited
  const [editingItem, setEditingItem] = useState<string | null>(null)

  const { data: sections, isLoading } = useQuery<Section[]>({
    queryKey: ['checklist', id],
    queryFn: () => api.get(`/events/${id}/checklist`).then(r => r.data),
  })

  const { data: people } = useQuery<Person[]>({
    queryKey: ['people', id],
    queryFn: () => api.get(`/events/${id}/people`).then(r => r.data),
  })

  const updateItem = useMutation({
    mutationFn: (payload: { itemId: string; status?: Status; dueDate?: string | null; personId?: string | null; notes?: string | null }) => {
      const { itemId, ...body } = payload
      return api.patch(`/events/${id}/checklist/${itemId}`, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', id] }),
  })

  const deleteItem = useMutation({
    mutationFn: (itemId: string) => api.delete(`/events/${id}/checklist/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', id] }),
  })

  const addItem = useMutation({
    mutationFn: ({ sectionId, title }: { sectionId: string; title: string }) =>
      api.post(`/events/${id}/checklist/sections/${sectionId}/items`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', id] }),
  })

  const addSection = useMutation({
    mutationFn: (name: string) => api.post(`/events/${id}/checklist/sections`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', id] }),
  })

  const deleteSection = useMutation({
    mutationFn: (sectionId: string) => api.delete(`/events/${id}/checklist/sections/${sectionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', id] }),
  })

  if (isLoading) return <p className="text-sm text-gray-400">Carregando...</p>

  const allItems = sections?.flatMap(s => s.items) ?? []
  const done = allItems.filter(i => i.status === 'CONCLUIDO').length
  const progress = allItems.length ? Math.round((done / allItems.length) * 100) : 0

  function handleAddSection() {
    const name = addingSectionName.trim()
    if (!name) return
    addSection.mutate(name, {
      onSuccess: () => {
        setAddingSectionName('')
        setShowAddSection(false)
      },
    })
  }

  function handleAddItem(sectionId: string) {
    const title = (addingItem[sectionId] ?? '').trim()
    if (!title) return
    addItem.mutate({ sectionId, title }, {
      onSuccess: () => setAddingItem(prev => ({ ...prev, [sectionId]: '' })),
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
        <Link to={`/events/${id}`} className="hover:text-gray-700">← Voltar ao evento</Link>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-gray-900">Checklist</h1>
        <span className="text-sm text-gray-500">{done}/{allItems.length} concluídos ({progress}%)</span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-8">
        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex flex-col gap-6">
        {sections?.map(section => {
          const secDone = section.items.filter(i => i.status === 'CONCLUIDO').length
          const secPct = section.items.length ? Math.round((secDone / section.items.length) * 100) : 0
          const sectionAddingTitle = addingItem[section.id] ?? ''

          return (
            <div key={section.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              {/* Section header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">{section.name}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{secDone}/{section.items.length}</span>
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${secPct}%` }} />
                  </div>
                  <button
                    onClick={() => {
                      if (!confirm(`Excluir seção "${section.name}" e todas as suas tarefas?`)) return
                      deleteSection.mutate(section.id)
                    }}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors ml-1"
                    title="Excluir seção"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-50">
                {section.items.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    people={people ?? []}
                    isEditing={editingItem === item.id}
                    onToggleEdit={() => setEditingItem(prev => prev === item.id ? null : item.id)}
                    onCycleStatus={() => updateItem.mutate({ itemId: item.id, status: nextStatus(item.status) })}
                    onUpdateDate={(date) => updateItem.mutate({ itemId: item.id, dueDate: date || null })}
                    onUpdatePerson={(personId) => updateItem.mutate({ itemId: item.id, personId: personId || null })}
                    onUpdateNotes={(notes) => updateItem.mutate({ itemId: item.id, notes: notes || null })}
                    onDelete={() => {
                      if (!confirm(`Excluir tarefa "${item.title}"?`)) return
                      deleteItem.mutate(item.id)
                    }}
                  />
                ))}
              </div>

              {/* Add item row */}
              <div className="px-5 py-3 border-t border-gray-50 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="+ Nova tarefa..."
                  value={sectionAddingTitle}
                  onChange={e => setAddingItem(prev => ({ ...prev, [section.id]: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddItem(section.id)
                    if (e.key === 'Escape') setAddingItem(prev => ({ ...prev, [section.id]: '' }))
                  }}
                  className="flex-1 text-sm bg-transparent outline-none text-gray-600 placeholder-gray-300"
                />
                {sectionAddingTitle && (
                  <button
                    onClick={() => handleAddItem(section.id)}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg hover:bg-green-600"
                  >
                    Adicionar
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Add section block */}
        <div className="border-2 border-dashed border-gray-200 rounded-2xl">
          {showAddSection ? (
            <div className="px-5 py-4 flex items-center gap-3">
              <input
                autoFocus
                type="text"
                placeholder="Nome da seção..."
                value={addingSectionName}
                onChange={e => setAddingSectionName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddSection()
                  if (e.key === 'Escape') { setShowAddSection(false); setAddingSectionName('') }
                }}
                className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
              />
              <button
                onClick={handleAddSection}
                className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
              >
                Criar
              </button>
              <button
                onClick={() => { setShowAddSection(false); setAddingSectionName('') }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddSection(true)}
              className="w-full px-5 py-4 text-sm text-gray-400 hover:text-gray-600 text-left"
            >
              + Nova seção
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface ItemRowProps {
  item: ChecklistItem
  people: Person[]
  isEditing: boolean
  onToggleEdit: () => void
  onCycleStatus: () => void
  onUpdateDate: (date: string) => void
  onUpdatePerson: (personId: string) => void
  onUpdateNotes: (notes: string) => void
  onDelete: () => void
}

function ItemRow({ item, people, isEditing, onToggleEdit, onCycleStatus, onUpdateDate, onUpdatePerson, onUpdateNotes, onDelete }: ItemRowProps) {
  const personName = item.person?.name ?? null
  const dateStr = item.dueDate ? item.dueDate.substring(0, 10) : ''
  const overdue = item.dueDate && item.status !== 'CONCLUIDO' && isOverdue(item.dueDate)

  return (
    <div className="px-5 py-3 hover:bg-gray-50 group">
      <div className="flex items-center gap-3">
        {/* Status toggle */}
        <button
          onClick={onCycleStatus}
          className={`text-xl flex-shrink-0 ${statusColor[item.status]} hover:scale-110 transition-transform`}
          title={item.status}
        >
          {statusIcon[item.status]}
        </button>

        {/* Title + notes */}
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm ${item.status === 'CONCLUIDO' ? 'line-through text-gray-400' : 'text-gray-700'}`}
          >
            {item.title}
          </span>
          {item.notes && !isEditing && (
            <p className="text-xs text-gray-400 mt-0.5 italic truncate">{item.notes}</p>
          )}
        </div>

        {/* Inline badges (collapsed) */}
        {!isEditing && (
          <div className="flex items-center gap-2">
            {personName && (
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{personName}</span>
            )}
            {dateStr && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${overdue ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
                {formatDate(item.dueDate!)}
              </span>
            )}
            {/* Edit button - visible on hover */}
            <button
              onClick={onToggleEdit}
              className="text-xs text-gray-300 group-hover:text-gray-500 transition-colors"
              title="Editar detalhes"
            >
              ✎
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-gray-300 group-hover:text-red-400 transition-colors"
              title="Excluir tarefa"
            >
              ✕
            </button>
          </div>
        )}

        {/* Expanded controls */}
        {isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleEdit}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ▲
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-red-400 hover:text-red-600"
              title="Excluir"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Expanded detail controls */}
      {isEditing && (
        <div className="mt-2 ml-8 flex items-center gap-4 flex-wrap">
          {/* Date picker */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Prazo:</span>
            <input
              type="date"
              defaultValue={dateStr}
              onChange={e => onUpdateDate(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400 text-gray-600"
            />
            {dateStr && (
              <button
                onClick={() => onUpdateDate('')}
                className="text-xs text-gray-300 hover:text-red-400"
                title="Remover data"
              >
                ✕
              </button>
            )}
          </div>

          {/* Person selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Responsável:</span>
            <select
              defaultValue={item.personId ?? ''}
              onChange={e => onUpdatePerson(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400 text-gray-600 bg-white"
            >
              <option value="">Nenhum</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.role ? ` (${p.role})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="w-full mt-1">
            <span className="text-xs text-gray-400 block mb-1">Observação:</span>
            <textarea
              defaultValue={item.notes ?? ''}
              onBlur={e => onUpdateNotes(e.target.value)}
              rows={2}
              placeholder="Adicione uma observação..."
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400 text-gray-600 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}
