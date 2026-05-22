import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'

const CATEGORIES = ['MATERIAL_EVENTO', 'BRINDES', 'BUFFET', 'ESPACO', 'CAPTACAO_IMAGEM', 'OUTRO']
const catLabel: Record<string, string> = {
  MATERIAL_EVENTO: 'Material do Evento', BRINDES: 'Brindes', BUFFET: 'Buffet',
  ESPACO: 'Espaço', CAPTACAO_IMAGEM: 'Captação de Imagem', OUTRO: 'Outro',
}
const statusLabel: Record<string, string> = { PENDENTE: 'Pendente', NEGOCIANDO: 'Negociando', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado' }
const payLabel: Record<string, string> = { PENDENTE: 'Não pago', PARCIAL: 'Parcial', PAGO: 'Pago' }
const payTypeLabel: Record<string, string> = { PIX: 'PIX', BOLETO: 'Boleto', CARTAO: 'Cartão' }
const statusColor: Record<string, string> = {
  PENDENTE: 'bg-gray-100 text-gray-600', NEGOCIANDO: 'bg-yellow-100 text-yellow-700',
  CONFIRMADO: 'bg-green-100 text-green-700', CANCELADO: 'bg-red-100 text-red-600',
}
const payColor: Record<string, string> = {
  PENDENTE: 'bg-orange-100 text-orange-600', PARCIAL: 'bg-yellow-100 text-yellow-700', PAGO: 'bg-green-100 text-green-700',
}

interface Installment { number: number; dueDate: string; value: string; paid: boolean }

const emptyForm = {
  category: 'MATERIAL_EVENTO', description: '', supplierName: '', supplierPhone: '',
  supplierContact: '', quantity: '', unitPrice: '', notes: '',
  status: 'PENDENTE', paymentStatus: 'PENDENTE', paymentDueDate: '',
  paymentType: '' as string, responsible: '', responsiblePersonId: '',
  catalogMaterialId: '', catalogSupplierId: '',
  installments: [] as Installment[],
}

function toFormDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.substring(0, 10)
}

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function SuppliersPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: suppliers } = useQuery<any[]>({
    queryKey: ['suppliers', id],
    queryFn: () => api.get(`/events/${id}/suppliers`).then(r => r.data),
  })

  const { data: total } = useQuery({
    queryKey: ['suppliers-total', id],
    queryFn: () => api.get(`/events/${id}/suppliers/total`).then(r => r.data),
  })

  const { data: catalogMaterials } = useQuery<any[]>({
    queryKey: ['catalog-materials'],
    queryFn: () => api.get('/catalog/materials').then(r => r.data),
  })

  const { data: catalogSuppliers } = useQuery<any[]>({
    queryKey: ['catalog-suppliers'],
    queryFn: () => api.get('/catalog/suppliers').then(r => r.data),
  })

  const { data: people } = useQuery<any[]>({
    queryKey: ['people', id],
    queryFn: () => api.get(`/events/${id}/people`).then(r => r.data),
  })

  const saveSupplier = useMutation({
    mutationFn: (data: object) =>
      editingId
        ? api.put(`/events/${id}/suppliers/${editingId}`, data)
        : api.post(`/events/${id}/suppliers`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers', id] })
      qc.invalidateQueries({ queryKey: ['suppliers-total', id] })
      closeForm()
    },
  })

  const updateSupplier = useMutation({
    mutationFn: ({ sid, data }: { sid: string; data: object }) => api.put(`/events/${id}/suppliers/${sid}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers', id] }); qc.invalidateQueries({ queryKey: ['suppliers-total', id] }) },
  })

  const toggleInstallment = useMutation({
    mutationFn: ({ sid, iid, paid }: { sid: string; iid: string; paid: boolean }) =>
      api.patch(`/events/${id}/suppliers/${sid}/installments/${iid}`, { paid }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers', id] }),
  })

  const deleteSupplier = useMutation({
    mutationFn: (sid: string) => api.delete(`/events/${id}/suppliers/${sid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers', id] }); qc.invalidateQueries({ queryKey: ['suppliers-total', id] }) },
  })

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function openEdit(item: any) {
    setForm({
      category: item.category,
      description: item.description,
      supplierName: item.supplierName ?? '',
      supplierPhone: item.supplierPhone ?? '',
      supplierContact: item.supplierContact ?? '',
      quantity: item.quantity != null ? String(item.quantity) : '',
      unitPrice: item.unitPrice != null ? String(item.unitPrice) : '',
      notes: item.notes ?? '',
      status: item.status,
      paymentStatus: item.paymentStatus,
      paymentDueDate: toFormDate(item.paymentDueDate),
      paymentType: item.paymentType ?? '',
      responsible: item.responsible ?? '',
      responsiblePersonId: item.responsiblePersonId ?? '',
      catalogMaterialId: item.catalogMaterialId ?? '',
      catalogSupplierId: item.catalogSupplierId ?? '',
      installments: (item.installments ?? []).map((i: any) => ({
        number: i.number,
        dueDate: toFormDate(i.dueDate),
        value: String(i.value),
        paid: i.paid,
      })),
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  function handleCatalogMaterialSelect(materialId: string) {
    const mat = catalogMaterials?.find(m => m.id === materialId)
    if (!mat) return setForm(f => ({ ...f, catalogMaterialId: '' }))
    setForm(f => ({
      ...f, catalogMaterialId: materialId, description: mat.name, category: mat.category,
      unitPrice: mat.defaultUnitPrice ?? '', catalogSupplierId: mat.preferredSupplierId ?? '',
    }))
    if (mat.preferredSupplierId) {
      const sup = catalogSuppliers?.find(s => s.id === mat.preferredSupplierId)
      if (sup) setForm(f => ({ ...f, supplierName: sup.name, supplierPhone: sup.phone ?? '', supplierContact: sup.contactName ?? '' }))
    }
  }

  function handleCatalogSupplierSelect(supplierId: string) {
    const sup = catalogSuppliers?.find(s => s.id === supplierId)
    if (!sup) return setForm(f => ({ ...f, catalogSupplierId: '' }))
    setForm(f => ({ ...f, catalogSupplierId: supplierId, supplierName: sup.name, supplierPhone: sup.phone ?? '', supplierContact: sup.contactName ?? '' }))
  }

  function addInstallment() {
    const next = form.installments.length + 1
    setForm(f => ({
      ...f,
      installments: [...f.installments, { number: next, dueDate: '', value: '', paid: false }],
    }))
  }

  function removeInstallment(idx: number) {
    setForm(f => ({
      ...f,
      installments: f.installments
        .filter((_, i) => i !== idx)
        .map((inst, i) => ({ ...inst, number: i + 1 })),
    }))
  }

  function updateInstallment(idx: number, field: keyof Installment, value: string | boolean) {
    setForm(f => ({
      ...f,
      installments: f.installments.map((inst, i) => i === idx ? { ...inst, [field]: value } : inst),
    }))
  }

  function handleSubmit() {
    saveSupplier.mutate({
      ...form,
      quantity: form.quantity ? parseFloat(form.quantity) : undefined,
      unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined,
      catalogMaterialId: form.catalogMaterialId || undefined,
      catalogSupplierId: form.catalogSupplierId || undefined,
      responsiblePersonId: form.responsiblePersonId || undefined,
      paymentType: form.paymentType || undefined,
      paymentDueDate: form.paymentDueDate || undefined,
      installments: form.installments.map(i => ({
        ...i,
        value: parseFloat(i.value) || 0,
      })),
    })
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = suppliers?.filter(s => s.category === cat) ?? []
    if (items.length) acc[cat] = items
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
        <Link to={`/events/${id}`} className="hover:text-gray-700">← Voltar ao evento</Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-sm text-gray-500">Total do evento: <strong>R$ {formatBRL(total?.total ?? 0)}</strong></p>
        </div>
        <button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Adicionar
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">
              {editingId ? 'Editar item' : 'Adicionar material / fornecedor'}
            </h3>

            <div className="flex flex-col gap-4">
              {/* Catalog selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Catálogo de materiais</label>
                  <select value={form.catalogMaterialId} onChange={e => handleCatalogMaterialSelect(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Digitar livremente —</option>
                    {catalogMaterials?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Catálogo de fornecedores</label>
                  <select value={form.catalogSupplierId} onChange={e => handleCatalogSupplierSelect(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">— Digitar livremente —</option>
                    {catalogSuppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Description + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descrição *</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c}>{catLabel[c]}</option>)}
                  </select>
                </div>
              </div>

              {/* Supplier info */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome do fornecedor</label>
                  <input value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                  <input value={form.supplierPhone} onChange={e => setForm(f => ({ ...f, supplierPhone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contato</label>
                  <input value={form.supplierContact} onChange={e => setForm(f => ({ ...f, supplierContact: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </div>
              </div>

              {/* Qty + Price + Responsible */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Qtd</label>
                  <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Preço unitário (R$)</label>
                  <input type="number" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Responsável (equipe)</label>
                  <select value={form.responsiblePersonId} onChange={e => setForm(f => ({ ...f, responsiblePersonId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
                    <option value="">— Nenhum —</option>
                    {people?.map(p => <option key={p.id} value={p.id}>{p.name}{p.role ? ` (${p.role})` : ''}</option>)}
                  </select>
                </div>
              </div>

              {/* Status + Payment status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {['PENDENTE', 'NEGOCIANDO', 'CONFIRMADO', 'CANCELADO'].map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status de pagamento</label>
                  <select value={form.paymentStatus} onChange={e => setForm(f => ({ ...f, paymentStatus: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {['PENDENTE', 'PARCIAL', 'PAGO'].map(s => <option key={s} value={s}>{payLabel[s]}</option>)}
                  </select>
                </div>
              </div>

              {/* Payment details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de pagamento</label>
                  <select value={form.paymentType} onChange={e => setForm(f => ({ ...f, paymentType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">— Selecionar —</option>
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="CARTAO">Cartão</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data de vencimento</label>
                  <input type="date" value={form.paymentDueDate} onChange={e => setForm(f => ({ ...f, paymentDueDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Installments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">Parcelas</label>
                  <button type="button" onClick={addInstallment}
                    className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-100">
                    + Adicionar parcela
                  </button>
                </div>
                {form.installments.length === 0 && (
                  <p className="text-xs text-gray-400">Nenhuma parcela. Clique em "Adicionar parcela" se o pagamento for parcelado.</p>
                )}
                <div className="flex flex-col gap-2">
                  {form.installments.map((inst, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-500 w-16">Parcela {inst.number}</span>
                      <input type="date" value={inst.dueDate}
                        onChange={e => updateInstallment(idx, 'dueDate', e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 flex-1" />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">R$</span>
                        <input type="number" step="0.01" value={inst.value} placeholder="0,00"
                          onChange={e => updateInstallment(idx, 'value', e.target.value)}
                          className="text-xs border border-gray-200 rounded px-2 py-1 w-24" />
                      </div>
                      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={inst.paid}
                          onChange={e => updateInstallment(idx, 'paid', e.target.checked)}
                          className="rounded" />
                        Pago
                      </label>
                      <button type="button" onClick={() => removeInstallment(idx)}
                        className="text-xs text-red-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={closeForm}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSubmit} disabled={!form.description || saveSupplier.isPending}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saveSupplier.isPending ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!suppliers?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏪</p>
          <p className="font-medium text-gray-600">Nenhum fornecedor ainda</p>
          <p className="text-sm mt-1">Clique em "Adicionar" para incluir materiais e fornecedores</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-700 text-sm">{catLabel[cat]}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map(item => {
                  const subtotal = (item.quantity ?? 1) * (item.unitPrice ?? 0)
                  const isExpanded = expandedId === item.id
                  const paidInstallments = item.installments?.filter((i: any) => i.paid).length ?? 0
                  const totalInstallments = item.installments?.length ?? 0

                  return (
                    <div key={item.id}>
                      <div className="px-5 py-3 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="font-medium text-sm text-gray-900">{item.description}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColor[item.status]}`}>{statusLabel[item.status]}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${payColor[item.paymentStatus]}`}>{payLabel[item.paymentStatus]}</span>
                            {item.paymentType && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{payTypeLabel[item.paymentType]}</span>
                            )}
                            {totalInstallments > 0 && (
                              <span className="text-xs text-gray-400">{paidInstallments}/{totalInstallments} parcelas</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                            {item.supplierName && <span>{item.supplierName}{item.supplierPhone ? ` · ${item.supplierPhone}` : ''}</span>}
                            {item.responsiblePerson && <span className="text-indigo-500">👤 {item.responsiblePerson.name}</span>}
                            {item.paymentDueDate && (
                              <span className={new Date(item.paymentDueDate) < new Date() && item.paymentStatus !== 'PAGO' ? 'text-red-500' : ''}>
                                Venc: {formatDate(item.paymentDueDate)}
                              </span>
                            )}
                          </div>
                          {item.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{item.notes}</p>}
                        </div>

                        <div className="text-right shrink-0">
                          {subtotal > 0 && <p className="text-sm font-medium text-gray-900">R$ {formatBRL(subtotal)}</p>}
                          {item.quantity && <p className="text-xs text-gray-400">{item.quantity}x</p>}
                        </div>

                        <div className="flex gap-1 shrink-0 items-start flex-col">
                          <div className="flex gap-1">
                            <select value={item.status}
                              onChange={e => updateSupplier.mutate({ sid: item.id, data: { status: e.target.value } })}
                              className="text-xs border border-gray-200 rounded px-1.5 py-1">
                              {['PENDENTE', 'NEGOCIANDO', 'CONFIRMADO', 'CANCELADO'].map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                            </select>
                            <select value={item.paymentStatus}
                              onChange={e => updateSupplier.mutate({ sid: item.id, data: { paymentStatus: e.target.value } })}
                              className="text-xs border border-gray-200 rounded px-1.5 py-1">
                              {['PENDENTE', 'PARCIAL', 'PAGO'].map(s => <option key={s} value={s}>{payLabel[s]}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-1 justify-end w-full">
                            {totalInstallments > 0 && (
                              <button onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                className="text-xs text-indigo-500 hover:text-indigo-700">
                                {isExpanded ? '▲ Parcelas' : '▼ Parcelas'}
                              </button>
                            )}
                            <button onClick={() => openEdit(item)}
                              className="text-xs text-blue-500 hover:text-blue-700">✎ Editar</button>
                            <button onClick={() => { if (confirm('Excluir?')) deleteSupplier.mutate(item.id) }}
                              className="text-xs text-red-400 hover:text-red-600">✕</button>
                          </div>
                        </div>
                      </div>

                      {/* Installments panel */}
                      {isExpanded && totalInstallments > 0 && (
                        <div className="px-5 pb-3 bg-indigo-50/40">
                          <div className="flex flex-col gap-1.5">
                            {item.installments.map((inst: any) => (
                              <div key={inst.id} className="flex items-center gap-3 text-xs">
                                <span className="text-gray-500 w-20">Parcela {inst.number}</span>
                                <span className="text-gray-600">{formatDate(inst.dueDate)}</span>
                                <span className="font-medium text-gray-800">R$ {formatBRL(inst.value)}</span>
                                <label className="flex items-center gap-1 cursor-pointer ml-auto">
                                  <input type="checkbox" checked={inst.paid}
                                    onChange={e => toggleInstallment.mutate({ sid: item.id, iid: inst.id, paid: e.target.checked })}
                                    className="rounded" />
                                  <span className={inst.paid ? 'text-green-600' : 'text-gray-400'}>{inst.paid ? 'Pago' : 'Pendente'}</span>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
