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

const emptySupForm = { name: '', subName: '', category: 'MATERIAL_EVENTO', phone: '', email: '', contactName: '', address: '', notes: '' }
const emptyMatForm = { name: '', category: 'MATERIAL_EVENTO', preferredSupplierId: '', defaultUnitPrice: '', notes: '' }

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const full = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`
  return `https://wa.me/${full}`
}

function WaButton({ phone, onClick }: { phone: string; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <a href={whatsappUrl(phone)} target="_blank" rel="noopener noreferrer"
      onClick={onClick}
      className="text-green-500 hover:text-green-600 shrink-0" title="Abrir WhatsApp">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </a>
  )
}

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
  const [supError, setSupError] = useState('')

  // Material state
  const [matForm, setMatForm] = useState(emptyMatForm)
  const [showMatForm, setShowMatForm] = useState(false)
  const [editingMatId, setEditingMatId] = useState<string | null>(null)
  const [matSupFilter, setMatSupFilter] = useState('')
  const [matError, setMatError] = useState('')
  const [expandedMatId, setExpandedMatId] = useState<string | null>(null)

  function openNewSupplier() {
    setEditingSupId(null)
    setSupForm(emptySupForm)
    setSupError('')
    setShowSupForm(true)
  }

  function openEditSupplier(s: any) {
    setEditingSupId(s.id)
    setSupForm({ name: s.name, subName: s.subName ?? '', category: s.category, phone: s.phone ?? '', email: s.email ?? '', contactName: s.contactName ?? '', address: s.address ?? '', notes: s.notes ?? '' })
    setSupError('')
    setShowSupForm(true)
  }

  function openNewMaterial() {
    setEditingMatId(null)
    setMatForm(emptyMatForm)
    setMatError('')
    setShowMatForm(true)
  }

  function openEditMaterial(m: any) {
    setEditingMatId(m.id)
    setMatForm({ name: m.name, category: m.category, preferredSupplierId: m.preferredSupplierId ?? '', defaultUnitPrice: m.defaultUnitPrice ? String(m.defaultUnitPrice) : '', notes: m.notes ?? '' })
    setMatError('')
    setShowMatForm(true)
  }

  const saveSupplier = useMutation({
    mutationFn: ({ id, data }: { id: string | null; data: object }) =>
      id ? api.put(`/catalog/suppliers/${id}`, data) : api.post('/catalog/suppliers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-suppliers'] })
      setShowSupForm(false)
      setEditingSupId(null)
      setSupForm(emptySupForm)
      setSupError('')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error
      setSupError(typeof msg === 'string' ? msg : 'Erro ao salvar fornecedor. Verifique os dados e tente novamente.')
    },
  })

  const deleteSupplier = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-suppliers'] }),
  })

  const saveMaterial = useMutation({
    mutationFn: ({ id, data }: { id: string | null; data: object }) =>
      id ? api.put(`/catalog/materials/${id}`, data) : api.post('/catalog/materials', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-materials'] })
      setShowMatForm(false)
      setEditingMatId(null)
      setMatForm(emptyMatForm)
      setMatError('')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error
      setMatError(typeof msg === 'string' ? msg : 'Erro ao salvar material. Verifique os dados e tente novamente.')
    },
  })

  const deleteMaterial = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/materials/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-materials'] }),
  })

  const uploadMatImage = useMutation({
    mutationFn: ({ id, imageUrl }: { id: string; imageUrl: string }) =>
      api.patch(`/catalog/materials/${id}/image`, { imageUrl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-materials'] }),
  })

  function handleMatImageUpload(e: React.ChangeEvent<HTMLInputElement>, matId: string) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 600
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        const base64 = canvas.toDataURL('image/jpeg', 0.85)
        uploadMatImage.mutate({ id: matId, imageUrl: base64 })
      }
      img.src = ev.target!.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function submitSupplier() {
    saveSupplier.mutate({
      id: editingSupId,
      data: {
        name: supForm.name,
        subName: supForm.subName || undefined,
        category: supForm.category,
        phone: supForm.phone || undefined,
        email: supForm.email || undefined,
        contactName: supForm.contactName || undefined,
        address: supForm.address || undefined,
        notes: supForm.notes || undefined,
      },
    })
  }

  function submitMaterial() {
    saveMaterial.mutate({
      id: editingMatId,
      data: {
        name: matForm.name,
        category: matForm.category,
        defaultUnitPrice: matForm.defaultUnitPrice ? parseFloat(matForm.defaultUnitPrice) : undefined,
        preferredSupplierId: matForm.preferredSupplierId || undefined,
        notes: matForm.notes || undefined,
      },
    })
  }

  const filteredSuppliers = supCatFilter
    ? (suppliers ?? []).filter((s: any) => s.category === supCatFilter)
    : (suppliers ?? [])

  const filteredMaterials = matSupFilter
    ? (materials ?? []).filter((m: any) => m.preferredSupplierId === matSupFilter)
    : (materials ?? [])

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
          <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-[#1A1A2E] mb-4">{editingSupId ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}</h3>
            <div className="flex flex-col gap-3">
              <div><label className={labelCls}>Nome *</label>
                <input value={supForm.name} onChange={e => setSupForm(f => ({ ...f, name: e.target.value }))} className={inputCls} autoFocus /></div>
              <div><label className={labelCls}>Subnome / Apelido</label>
                <input value={supForm.subName} onChange={e => setSupForm(f => ({ ...f, subName: e.target.value }))}
                  placeholder="Ex: Filial Centro, nome fantasia" className={inputCls} /></div>
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
            {supError && <p className="text-sm text-red-500 mt-3">{supError}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowSupForm(false); setEditingSupId(null); setSupError('') }}
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
            {matError && <p className="text-sm text-red-500 mt-3">{matError}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowMatForm(false); setEditingMatId(null); setMatError('') }}
                className="flex-1 border border-black/[0.15] rounded-full py-2 text-sm text-[#6B7280] hover:bg-[#F3F2F8] transition-colors">Cancelar</button>
              <button onClick={submitMaterial} disabled={!matForm.name || saveMaterial.isPending}
                className="flex-1 bg-[#7C5CBF] text-white rounded-full py-2 text-sm font-bold disabled:opacity-50 hover:bg-[#9B7DD4] transition-colors">
                {saveMaterial.isPending ? 'Salvando...' : editingMatId ? 'Salvar alterações' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Suppliers tab ── */}
      {tab === 'suppliers' && (
        <div className="flex flex-col gap-3">
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
                <div className="p-4 flex items-start justify-between cursor-pointer select-none"
                  onClick={() => setExpandedSupId(isExpanded ? null : s.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#1A1A2E]">{s.name}</span>
                      <span className="text-xs bg-[#F3F2F8] text-[#6B7280] px-2 py-0.5 rounded-full border border-black/[0.08]">{catLabel[s.category]}</span>
                      {supMaterials.length > 0 && (
                        <span className="text-xs bg-[#EDE9F8] text-[#7C5CBF] px-2 py-0.5 rounded-full font-bold">
                          {supMaterials.length} produto{supMaterials.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {s.subName && <p className="text-xs text-[#6B7280] font-semibold mt-0.5">{s.subName}</p>}
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {s.phone && (
                        <span className="flex items-center gap-1 text-xs text-[#9CA3AF]">
                          {s.phone}
                          <WaButton phone={s.phone} onClick={e => e.stopPropagation()} />
                        </span>
                      )}
                      {s.contactName && <span className="text-xs text-[#9CA3AF]">{s.phone ? '·' : ''} {s.contactName}</span>}
                      {s.email && <span className="text-xs text-[#9CA3AF]">· {s.email}</span>}
                    </div>
                    {s.address && <p className="text-xs text-[#9CA3AF] mt-0.5">📍 {s.address}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <button onClick={e => { e.stopPropagation(); openEditSupplier(s) }}
                      className="text-xs text-[#7C5CBF] hover:text-[#9B7DD4]">✎ Editar</button>
                    <button onClick={e => { e.stopPropagation(); if (confirm('Excluir?')) deleteSupplier.mutate(s.id) }}
                      className="text-xs text-red-400 hover:text-red-500">✕ Excluir</button>
                    <span className={`text-[#9CA3AF] text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>

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
                                  : <span className="text-[#9CA3AF] font-normal">—</span>}
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

      {/* ── Materials tab ── */}
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

          {!filteredMaterials.length ? (
            <div className="text-center py-12 text-[#9CA3AF]"><p className="text-3xl mb-2">📦</p><p>Nenhum material cadastrado</p></div>
          ) : filteredMaterials.map((m: any) => {
            const isExpanded = expandedMatId === m.id
            return (
              <div key={m.id} className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] overflow-hidden hover:shadow-[0_4px_16px_rgba(124,92,191,0.12)] transition-shadow">
                {/* Header — click to expand */}
                <div className="p-4 flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setExpandedMatId(isExpanded ? null : m.id)}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {m.imageUrl && (
                      <img src={m.imageUrl} alt={m.name}
                        className="w-11 h-11 rounded-[8px] object-cover shrink-0 border border-black/[0.06]" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#1A1A2E]">{m.name}</span>
                        <span className="text-xs bg-[#F3F2F8] text-[#6B7280] px-2 py-0.5 rounded-full border border-black/[0.08]">{catLabel[m.category]}</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">
                        {m.preferredSupplier && `Fornecedor: ${m.preferredSupplier.name}`}
                        {m.defaultUnitPrice && ` · R$ ${Number(m.defaultUnitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <button onClick={e => { e.stopPropagation(); openEditMaterial(m) }} className="text-xs text-[#7C5CBF] hover:text-[#9B7DD4]">✎ Editar</button>
                    <button onClick={e => { e.stopPropagation(); if (confirm('Excluir?')) deleteMaterial.mutate(m.id) }} className="text-xs text-red-400 hover:text-red-500">✕ Excluir</button>
                    <span className={`text-[#9CA3AF] text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>

                {/* Expanded: details + image upload */}
                {isExpanded && (
                  <div className="border-t border-black/[0.06] bg-[#F8F7FC] p-4">
                    <div className="flex gap-6 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-2">Detalhes</p>
                        <dl className="flex flex-col gap-1.5 text-xs">
                          <div className="flex gap-2">
                            <dt className="text-[#9CA3AF] w-28 shrink-0">Categoria</dt>
                            <dd className="text-[#1A1A2E] font-medium">{catLabel[m.category]}</dd>
                          </div>
                          {m.preferredSupplier && (
                            <div className="flex gap-2">
                              <dt className="text-[#9CA3AF] w-28 shrink-0">Fornecedor</dt>
                              <dd className="text-[#1A1A2E] font-medium">{m.preferredSupplier.name}</dd>
                            </div>
                          )}
                          {m.defaultUnitPrice && (
                            <div className="flex gap-2">
                              <dt className="text-[#9CA3AF] w-28 shrink-0">Preço padrão</dt>
                              <dd className="text-[#7C5CBF] font-bold">R$ {Number(m.defaultUnitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</dd>
                            </div>
                          )}
                          {m.notes && (
                            <div className="flex gap-2">
                              <dt className="text-[#9CA3AF] w-28 shrink-0">Observações</dt>
                              <dd className="text-[#6B7280]">{m.notes}</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Image upload */}
                      <div className="shrink-0">
                        <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-2">Imagem</p>
                        {m.imageUrl ? (
                          <div className="flex flex-col items-center gap-2">
                            <img src={m.imageUrl} alt={m.name}
                              className="w-36 h-36 rounded-[10px] object-contain border border-black/[0.08] bg-white p-1" />
                            <label className="cursor-pointer text-xs text-[#7C5CBF] hover:text-[#9B7DD4] font-medium">
                              <input type="file" accept="image/jpeg,image/png" className="hidden"
                                onChange={e => handleMatImageUpload(e, m.id)} />
                              {uploadMatImage.isPending ? 'Enviando...' : '↻ Trocar imagem'}
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center justify-center w-36 h-36 rounded-[10px] border-2 border-dashed border-[#D1C7E8] hover:border-[#7C5CBF] hover:bg-[#EDE9F8]/30 transition-colors text-center">
                            <input type="file" accept="image/jpeg,image/png" className="hidden"
                              onChange={e => handleMatImageUpload(e, m.id)} />
                            {uploadMatImage.isPending ? (
                              <span className="text-xs text-[#9CA3AF]">Enviando...</span>
                            ) : (
                              <>
                                <svg className="w-7 h-7 text-[#C4B5E8] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs text-[#9CA3AF]">Adicionar imagem</span>
                                <span className="text-[10px] text-[#C4B5E8] mt-0.5">JPG ou PNG</span>
                              </>
                            )}
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
