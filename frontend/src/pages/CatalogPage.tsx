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

export default function CatalogPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'suppliers' | 'materials'>('suppliers')

  const { data: suppliers } = useQuery<any[]>({ queryKey: ['catalog-suppliers'], queryFn: () => api.get('/catalog/suppliers').then(r => r.data) })
  const { data: materials } = useQuery<any[]>({ queryKey: ['catalog-materials'], queryFn: () => api.get('/catalog/materials').then(r => r.data) })

  const [supForm, setSupForm] = useState({ name: '', category: 'MATERIAL_EVENTO', phone: '', email: '', contactName: '', address: '', notes: '' })
  const [matForm, setMatForm] = useState({ name: '', category: 'MATERIAL_EVENTO', preferredSupplierId: '', defaultUnitPrice: '', notes: '' })
  const [showSupForm, setShowSupForm] = useState(false)
  const [showMatForm, setShowMatForm] = useState(false)

  const addSupplier = useMutation({
    mutationFn: (data: object) => api.post('/catalog/suppliers', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalog-suppliers'] }); setShowSupForm(false); setSupForm({ name: '', category: 'MATERIAL_EVENTO', phone: '', email: '', contactName: '', address: '', notes: '' }) },
  })
  const deleteSupplier = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-suppliers'] }),
  })
  const addMaterial = useMutation({
    mutationFn: (data: object) => api.post('/catalog/materials', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalog-materials'] }); setShowMatForm(false); setMatForm({ name: '', category: 'MATERIAL_EVENTO', preferredSupplierId: '', defaultUnitPrice: '', notes: '' }) },
  })
  const deleteMaterial = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/materials/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-materials'] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1A2E]">Catálogo</h1>
          <p className="text-sm text-[#6B7280]">Materiais e fornecedores reutilizáveis em qualquer evento</p>
        </div>
        <button onClick={() => tab === 'suppliers' ? setShowSupForm(true) : setShowMatForm(true)}
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
            <h3 className="font-bold text-[#1A1A2E] mb-4">Cadastrar Fornecedor</h3>
            <div className="flex flex-col gap-3">
              <div><label className={labelCls}>Nome *</label>
                <input value={supForm.name} onChange={e => setSupForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
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
              <button onClick={() => setShowSupForm(false)} className="flex-1 border border-black/[0.15] rounded-full py-2 text-sm text-[#6B7280] hover:bg-[#F3F2F8] transition-colors">Cancelar</button>
              <button onClick={() => addSupplier.mutate(supForm)} disabled={!supForm.name || addSupplier.isPending}
                className="flex-1 bg-[#7C5CBF] text-white rounded-full py-2 text-sm font-bold disabled:opacity-50 hover:bg-[#9B7DD4] transition-colors">
                {addSupplier.isPending ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Material form modal */}
      {showMatForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-6 w-full max-w-md">
            <h3 className="font-bold text-[#1A1A2E] mb-4">Cadastrar Material</h3>
            <div className="flex flex-col gap-3">
              <div><label className={labelCls}>Nome *</label>
                <input value={matForm.name} onChange={e => setMatForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
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
              <button onClick={() => setShowMatForm(false)} className="flex-1 border border-black/[0.15] rounded-full py-2 text-sm text-[#6B7280] hover:bg-[#F3F2F8] transition-colors">Cancelar</button>
              <button onClick={() => addMaterial.mutate({ ...matForm, defaultUnitPrice: matForm.defaultUnitPrice ? parseFloat(matForm.defaultUnitPrice) : undefined, preferredSupplierId: matForm.preferredSupplierId || undefined })}
                disabled={!matForm.name || addMaterial.isPending}
                className="flex-1 bg-[#7C5CBF] text-white rounded-full py-2 text-sm font-bold disabled:opacity-50 hover:bg-[#9B7DD4] transition-colors">
                {addMaterial.isPending ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="flex flex-col gap-3">
          {!suppliers?.length ? (
            <div className="text-center py-12 text-[#9CA3AF]"><p className="text-3xl mb-2">🏪</p><p>Nenhum fornecedor cadastrado</p></div>
          ) : suppliers.map(s => (
            <div key={s.id} className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-4 flex items-center justify-between hover:shadow-[0_4px_16px_rgba(124,92,191,0.12)] transition-shadow">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1A1A2E]">{s.name}</span>
                  <span className="text-xs bg-[#F3F2F8] text-[#6B7280] px-2 py-0.5 rounded-full border border-black/[0.08]">{catLabel[s.category]}</span>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-0.5">{[s.phone, s.contactName, s.email].filter(Boolean).join(' · ')}</p>
                {s.address && <p className="text-xs text-[#9CA3AF] mt-0.5">📍 {s.address}</p>}
              </div>
              <button onClick={() => { if (confirm('Excluir?')) deleteSupplier.mutate(s.id) }} className="text-xs text-red-400 hover:text-red-500">✕ Excluir</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'materials' && (
        <div className="flex flex-col gap-3">
          {!materials?.length ? (
            <div className="text-center py-12 text-[#9CA3AF]"><p className="text-3xl mb-2">📦</p><p>Nenhum material cadastrado</p></div>
          ) : materials.map(m => (
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
              <button onClick={() => { if (confirm('Excluir?')) deleteMaterial.mutate(m.id) }} className="text-xs text-red-400 hover:text-red-500">✕ Excluir</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
