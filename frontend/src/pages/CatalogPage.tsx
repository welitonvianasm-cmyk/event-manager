import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

const CATEGORIES = ['MATERIAL_EVENTO', 'BRINDES', 'BUFFET', 'ESPACO', 'CAPTACAO_IMAGEM', 'OUTRO']
const catLabel: Record<string, string> = {
  MATERIAL_EVENTO: 'Material do Evento', BRINDES: 'Brindes', BUFFET: 'Buffet',
  ESPACO: 'Espaço', CAPTACAO_IMAGEM: 'Captação de Imagem', OUTRO: 'Outro',
}

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
          <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
          <p className="text-sm text-gray-500">Materiais e fornecedores reutilizáveis em qualquer evento</p>
        </div>
        <button onClick={() => tab === 'suppliers' ? setShowSupForm(true) : setShowMatForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Cadastrar {tab === 'suppliers' ? 'Fornecedor' : 'Material'}
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('suppliers')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'suppliers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Fornecedores ({suppliers?.length ?? 0})
        </button>
        <button onClick={() => setTab('materials')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'materials' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Materiais ({materials?.length ?? 0})
        </button>
      </div>

      {/* Supplier form modal */}
      {showSupForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-900 mb-4">Cadastrar Fornecedor</h3>
            <div className="flex flex-col gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                <input value={supForm.name} onChange={e => setSupForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                <select value={supForm.category} onChange={e => setSupForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{catLabel[c]}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                  <input value={supForm.phone} onChange={e => setSupForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Nome do contato</label>
                  <input value={supForm.contactName} onChange={e => setSupForm(f => ({ ...f, contactName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                <input type="email" value={supForm.email} onChange={e => setSupForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Endereço</label>
                <input value={supForm.address} onChange={e => setSupForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Rua, número, bairro, cidade"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                <textarea value={supForm.notes} onChange={e => setSupForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowSupForm(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600">Cancelar</button>
              <button onClick={() => addSupplier.mutate(supForm)} disabled={!supForm.name || addSupplier.isPending}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {addSupplier.isPending ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Material form modal */}
      {showMatForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-900 mb-4">Cadastrar Material</h3>
            <div className="flex flex-col gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                <input value={matForm.name} onChange={e => setMatForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                <select value={matForm.category} onChange={e => setMatForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{catLabel[c]}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Fornecedor preferido</label>
                <select value={matForm.preferredSupplierId} onChange={e => setMatForm(f => ({ ...f, preferredSupplierId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">— Nenhum —</option>
                  {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Preço padrão (R$)</label>
                <input type="number" step="0.01" value={matForm.defaultUnitPrice} onChange={e => setMatForm(f => ({ ...f, defaultUnitPrice: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                <textarea value={matForm.notes} onChange={e => setMatForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowMatForm(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600">Cancelar</button>
              <button onClick={() => addMaterial.mutate({ ...matForm, defaultUnitPrice: matForm.defaultUnitPrice ? parseFloat(matForm.defaultUnitPrice) : undefined, preferredSupplierId: matForm.preferredSupplierId || undefined })}
                disabled={!matForm.name || addMaterial.isPending}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {addMaterial.isPending ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="flex flex-col gap-3">
          {!suppliers?.length ? (
            <div className="text-center py-12 text-gray-400"><p className="text-3xl mb-2">🏪</p><p>Nenhum fornecedor cadastrado</p></div>
          ) : suppliers.map(s => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{s.name}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{catLabel[s.category]}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{[s.phone, s.contactName, s.email].filter(Boolean).join(' · ')}</p>
                {s.address && <p className="text-xs text-gray-400 mt-0.5">📍 {s.address}</p>}
              </div>
              <button onClick={() => { if (confirm('Excluir?')) deleteSupplier.mutate(s.id) }} className="text-xs text-red-400 hover:text-red-600">✕ Excluir</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'materials' && (
        <div className="flex flex-col gap-3">
          {!materials?.length ? (
            <div className="text-center py-12 text-gray-400"><p className="text-3xl mb-2">📦</p><p>Nenhum material cadastrado</p></div>
          ) : materials.map(m => (
            <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{m.name}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{catLabel[m.category]}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {m.preferredSupplier && `Fornecedor: ${m.preferredSupplier.name}`}
                  {m.defaultUnitPrice && ` · R$ ${Number(m.defaultUnitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </p>
              </div>
              <button onClick={() => { if (confirm('Excluir?')) deleteMaterial.mutate(m.id) }} className="text-xs text-red-400 hover:text-red-600">✕ Excluir</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
