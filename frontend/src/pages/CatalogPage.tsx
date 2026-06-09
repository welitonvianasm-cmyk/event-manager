import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

const CATEGORIES = ['MATERIAL_EVENTO', 'BRINDES', 'BUFFET', 'ESPACO', 'CAPTACAO_IMAGEM', 'OUTRO']
const catLabel: Record<string, string> = {
  MATERIAL_EVENTO: 'Material do Evento', BRINDES: 'Brindes', BUFFET: 'Buffet',
  ESPACO: 'Espaço', CAPTACAO_IMAGEM: 'Captação de Imagem', OUTRO: 'Outro',
}

const inputCls = 'w-full bg-white border border-black/[0.08] text-[#1A1A2E] placeholder-[#9CA3AF] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]'
const labelCls = 'block text-xs font-bold text-[#6B7280] mb-1'

const emptySupForm = { name: '', category: 'MATERIAL_EVENTO', phone: '', email: '', contactName: '', address: '', notes: '' }
const emptyMatForm = { name: '', category: 'MATERIAL_EVENTO', preferredSupplierId: '', defaultUnitPrice: '', notes: '' }

export default function CatalogPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'suppliers' | 'materials'>('suppliers')

  const { data: suppliers } = useQuery<any[]>({ queryKey: ['catalog-suppliers'], queryFn: () => api.get('/catalog/suppliers').then(r => r.data) })
  const { data: materials } = useQuery<any[]>({ queryKey: ['catalog-materials'], queryFn: () => api.get('/catalog/materials').then(r => r.data) })

  // Supplier state
  const [supForm, setSupForm] = useState(emptySupForm)
  const [showSupForm, setShowSupForm] = useState(false)
  const [editingSupId, setEditingSupId] = useState<string | null>(null)
  const [supCatFilter, setSupCatFilter] = useState('')
  const [expandedSupId, setExpandedSupId] = useState<string | null>(null)

  // Material state
  const [matForm, setMatForm] = useState(emptyMatForm)
  const [showMatForm, setShowMatForm] = useState(false)
  const [editingMatId, setEditingMatId] = useState<string | null>(null)
  const [matSupFilter, setMatSupFilter] = useState('')

  function openNewSupplier() {
    setEditingSupId(null)
    setSupForm(emptySupForm)
    setShowSupForm(true)
  }

  function openEditSupplier(s: any) {
    setEditingSupId(s.id)
    setSupForm({ name: s.name, category: s.category, phone: s.phone ?? '', email: s.email ?? '', contactName: s.contactName ?? '', address: s.address ?? '', notes: s.notes ?? '' })
    setShowSupForm(true)
  }

  function openNewMaterial() {
    setEditingMatId(null)
    setMatForm(emptyMatForm)
    setShowMatForm(true)
  }

  function openEditMaterial(m: any) {
    setEditingMatId(m.id)
    setMatForm({ name: m.name, category: m.category, preferredSupplierId: m.preferredSupplierId ?? '', defaultUnitPrice: m.defaultUnitPrice ? String(m.defaultUnitPrice) : '', notes: m.notes ?? '' })
    setShowMatForm(true)
  }

  const saveSupplier = useMutation({
    mutationFn: (data: object) => editingSupId
      ? api.put(`/catalog/suppliers/${editingSupId}`, data)
      : api.post('/catalog/suppliers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-suppliers'] })
      setShowSupForm(false)
      setEditingSupId(null)
      setSupForm(emptySupForm)
    },
  })

  const deleteSupplier = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-suppliers'] }),
  })

  const saveMaterial = useMutation({
    mutationFn: (data: object) => editingMatId
      ? api.put(`/catalog/materials/${editingMatId}`, data)
      : api.post('/catalog/materials', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-materials'] })
      setShowMatForm(false)
      setEditingMatId(null)
      setMatForm(emptyMatForm)
    },
  })

  const deleteMaterial = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/materials/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-materials'] }),
  })

  function submitSupplier() {
    saveSupplier.mutate({
      name: supForm.name,
      category: supForm.category,
      phone: supForm.phone || undefined,
      email: supForm.email || undefined,
      contactName: supForm.contactName || undefined,
      address: supForm.address || undefined,
      notes: supForm.notes || undefined,
    })
  }

  function submitMaterial() {
    saveMaterial.mutate({
      name: matForm.name,
      category: matForm.category,
      defaultUnitPrice: matForm.defaultUnitPrice ? parseFloat(matForm.defaultUnitPrice) : undefined,
      preferredSupplierId: matForm.preferredSupplierId || undefined,
      notes: matForm.notes || undefined,
    })
  }

  const filteredSuppliers = supCatFilter
    ? (suppliers ?? []).filter((s: any) => s.category === supCatFilter)
    : (suppliers ?? [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1A2E]">Catálogo</h1>
          <p className="text-sm text-[#6B7280]">Materiais e fornecedores reutilizáveis em qualquer evento</p>
        </div>
        <button onClick={() => tab === 'suppliers' ? openNewSupplier() : openNewMaterial()}
          className="bg-[#7C5CBF] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#9B7DD4] transition-colors">
          + Cadastrar {tab === 'suppliers' ? 'Fornecedor' : 'Material'}
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-[#F3F2F8] p-1 rounded-[10px] w-fit">
        <button onClick={() => setTab('suppliers')}
          className={`px-4 py-2 text-sm font-bold rounded-[8px] transition-colors ${tab === 'suppliers' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#6B7280] hover:text-[#1A1A2E]'}`}>
          Fornecedores ({suppliers?.length ?? 0})
        </button>
        <button onClick={() => setTab('materials')}
          className={`px-4 py-2 text-sm font-bold rounded-[8px] transition-colors ${tab === 'materials' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#6B7280] hover:text-[#1A1A2E]'}`}>
          Materiais ({materials?.length ?? 0})
        </button>
      </div>

      {/* Supplier form modal */}
      {showSupForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-6 w-full max-w-md">
            <h3 className="font-bold text-[#1A1A2E] mb-4">{editingSupId ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}</h3>
            <div className="flex flex-col gap-3">
              <div><label className={labelCls}>Nome *</label>
                <input value={supForm.name} onChange={e => setSupForm(f => ({ ...f, name: e.target.value }))} className={inputCls} autoFocus /></div>
              <div><label className={labelCls}>Categoria</label>
                <select value={supForm.category} onChange={e => setSupForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{catLabel[c]}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Telefone</label>
                  <input value={supForm.phone} onChange={e => setSupForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Nome do contato</label>
                  <input value={supForm.contactName} onChange={e => setSupForm(f => ({ ...f, contactName: e.target.value }))} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>E-mail</label>
                <input type="email" value={supForm.email} onChange={e => setSupForm(f => ({ ...f, email: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Endereço</label>
                <input value={supForm.address} onChange={e => setSupForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Rua, número, bairro, cidade" className={inputCls} /></div>
              <div><label className={labelCls}>Observações</label>
                <textarea value={supForm.notes} onChange={e => setSupForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className={`${inputCls} resize-none`} /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowSupForm(false); setEditingSupId(null) }}
                className="flex-1 border border-black/[0.15] rounded-full py-2 text-sm text-[#6B7280] hover:bg-[#F3F2F8] transition-colors">Cancelar</button>
              <button onClick={submitSupplier} disabled={!supForm.name || saveSupplier.isPending}
                className="flex-1 bg-[#7C5CBF] text-white rounded-full py-2 text-sm font-bold disabled:opacity-50 hover:bg-[#9B7DD4] transition-colors">
                {saveSupplier.isPending ? 'Salvando...' : editingSupId ? 'Salvar alterações' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Material form modal */}
      {showMatForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-6 w-full max-w-md">
            <h3 className="font-bold text-[#1A1A2E] mb-4">{editingMatId ? 'Editar Material' : 'Cadastrar Material'}</h3>
            <div className="flex flex-col gap-3">
              <div><label className={labelCls}>Nome *</label>
                <input value={matForm.name} onChange={e => setMatForm(f => ({ ...f, name: e.target.value }))} className={inputCls} autoFocus /></div>
              <div><label className={labelCls}>Categoria</label>
                <select value={matForm.category} onChange={e => setMatForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{catLabel[c]}</option>)}</select></div>
              <div><label className={labelCls}>Fornecedor preferido</label>
                <select value={matForm.preferredSupplierId} onChange={e => setMatForm(f => ({ ...f, preferredSupplierId: e.target.value }))} className={inputCls}>
                  <option value="">— Nenhum —</option>
                  {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className={labelCls}>Preço padrão (R$)</label>
                <input type="number" step="0.01" value={matForm.defaultUnitPrice} onChange={e => setMatForm(f => ({ ...f, defaultUnitPrice: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Observações</label>
                <textarea value={matForm.notes} onChange={e => setMatForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className={`${inputCls} resize-none`} /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowMatForm(false); setEditingMatId(null) }}
                className="flex-1 border border-black/[0.15] rounded-full py-2 text-sm text-[#6B7280] hover:bg-[#F3F2F8] transition-colors">Cancelar</button>
              <button onClick={submitMaterial} disabled={!matForm.name || saveMaterial.isPending}
                className="flex-1 bg-[#7C5CBF] text-white rounded-full py-2 text-sm font-bold disabled:opacity-50 hover:bg-[#9B7DD4] transition-colors">
                {saveMaterial.isPending ? 'Salvando...' : editingMatId ? 'Salvar alterações' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="flex flex-col gap-3">
          {/* Category filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#6B7280] font-bold">Filtrar por categoria:</span>
            <select value={supCatFilter} onChange={e => setSupCatFilter(e.target.value)}
              className="text-xs bg-white border border-black/[0.08] text-[#6B7280] rounded-[8px] px-3 py-1.5 focus:outline-none focus:border-[#7C5CBF]">
              <option value="">Todas</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{catLabel[c]}</option>)}
            </select>
            {supCatFilter && (
              <button onClick={() => setSupCatFilter('')} className="text-xs text-[#9CA3AF] hover:text-red-400 font-bold">✕</button>
            )}
          </div>

          {!filteredSuppliers.length ? (
            <div className="text-center py-12 text-[#9CA3AF]"><p className="text-3xl mb-2">🏪</p><p>Nenhum fornecedor encontrado</p></div>
          ) : filteredSuppliers.map((s: any) => {
            const supMaterials = (materials ?? []).filter((m: any) => m.preferredSupplierId === s.id)
            const isExpanded = expandedSupId === s.id
            return (
              <div key={s.id} className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] overflow-hidden hover:shadow-[0_4px_16px_rgba(124,92,191,0.12)] transition-shadow">
                {/* Header row — click to expand */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setExpandedSupId(isExpanded ? null : s.id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1A1A2E]">{s.name}</span>
                      <span className="text-xs bg-[#F3F2F8] text-[#6B7280] px-2 py-0.5 rounded-full border border-black/[0.08]">{catLabel[s.category]}</span>
                      {supMaterials.length > 0 && (
                        <span className="text-xs bg-[#EDE9F8] text-[#7C5CBF] px-2 py-0.5 rounded-full font-bold">
                          {supMaterials.length} produto{supMaterials.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{[s.phone, s.contactName, s.email].filter(Boolean).join(' · ')}</p>
                    {s.address && <p className="text-xs text-[#9CA3AF] mt-0.5">📍 {s.address}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={e => { e.stopPropagation(); openEditSupplier(s) }}
                      className="text-xs text-[#7C5CBF] hover:text-[#9B7DD4]">✎ Editar</button>
                    <button
                      onClick={e => { e.stopPropagation(); if (confirm('Excluir?')) deleteSupplier.mutate(s.id) }}
                      className="text-xs text-red-400 hover:text-red-500">✕ Excluir</button>
                    <span className={`text-[#9CA3AF] text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>

                {/* Expanded: product list */}
                {isExpanded && (
                  <div className="border-t border-black/[0.06] bg-[#F8F7FC]">
                    {supMaterials.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-[#9CA3AF]">Nenhum produto vinculado a este fornecedor.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-black/[0.06]">
                            <th className="text-left px-4 py-2 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Produto</th>
                            <th className="text-left px-4 py-2 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Categoria</th>
                            <th className="text-right px-4 py-2 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Último valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {supMaterials.map((m: any) => (
                            <tr key={m.id} className="border-b border-black/[0.04] last:border-0 hover:bg-[#EDE9F8]/40">
                              <td className="px-4 py-2.5 font-bold text-[#1A1A2E]">{m.name}</td>
                              <td className="px-4 py-2.5 text-[#6B7280]">{catLabel[m.category]}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-[#7C5CBF]">
                                {m.defaultUnitPrice
                                  ? `R$ ${Number(m.defaultUnitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                  : <span className="text-[#9CA3AF] font-normal">—</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'materials' && (
        <div className="flex flex-col gap-3">
          {(suppliers?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280] font-bold">Filtrar por fornecedor:</span>
              <select value={matSupFilter} onChange={e => setMatSupFilter(e.target.value)}
                className="text-xs bg-white border border-black/[0.08] text-[#6B7280] rounded-[8px] px-3 py-1.5 focus:outline-none focus:border-[#7C5CBF]">
                <option value="">Todos</option>
                {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {matSupFilter && (
                <button onClick={() => setMatSupFilter('')} className="text-xs text-[#9CA3AF] hover:text-red-400 font-bold">✕</button>
              )}
            </div>
          )}
          {!materials?.length ? (
            <div className="text-center py-12 text-[#9CA3AF]"><p className="text-3xl mb-2">📦</p><p>Nenhum material cadastrado</p></div>
          ) : (matSupFilter ? materials.filter((m: any) => m.preferredSupplierId === matSupFilter) : materials).map((m: any) => (
            <div key={m.id} className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-4 flex items-center justify-between hover:shadow-[0_4px_16px_rgba(124,92,191,0.12)] transition-shadow">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1A1A2E]">{m.name}</span>
                  <span className="text-xs bg-[#F3F2F8] text-[#6B7280] px-2 py-0.5 rounded-full border border-black/[0.08]">{catLabel[m.category]}</span>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  {m.preferredSupplier && `Fornecedor: ${m.preferredSupplier.name}`}
                  {m.defaultUnitPrice && ` · R$ ${Number(m.defaultUnitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => openEditMaterial(m)} className="text-xs text-[#7C5CBF] hover:text-[#9B7DD4]">✎ Editar</button>
                <button onClick={() => { if (confirm('Excluir?')) deleteMaterial.mutate(m.id) }} className="text-xs text-red-400 hover:text-red-500">✕ Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
