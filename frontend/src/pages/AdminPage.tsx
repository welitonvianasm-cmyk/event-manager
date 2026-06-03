import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'

const statusLabel: Record<string, string> = { PENDENTE: 'Pendente', APROVADO: 'Aprovado', REVOGADO: 'Revogado' }
const statusColor: Record<string, string> = {
  PENDENTE: 'bg-[#FEF3CD] text-[#92610A]',
  APROVADO: 'bg-[#D4EDDA] text-[#155724]',
  REVOGADO: 'bg-[#FDEDEE] text-[#C0392B]',
}
const roleColor: Record<string, string> = {
  MASTER: 'bg-[#EDE9F8] text-[#7C5CBF]',
  CLIENT: 'bg-[#F8F7FC] text-[#9CA3AF] border border-black/[0.08]',
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [msg, setMsg] = useState('')

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  })

  const approve = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const revoke = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/revoke`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err: any) => alert(err?.response?.data?.error ?? 'Erro ao excluir usuário'),
  })

  async function impersonate(targetUser: any) {
    const { data } = await api.post(`/admin/impersonate/${targetUser.id}`)
    const currentToken = localStorage.getItem('token')!
    const currentUser = localStorage.getItem('user')!
    localStorage.setItem('adminToken', currentToken)
    localStorage.setItem('adminUser', currentUser)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setMsg(`Entrando como ${data.user.name}...`)
    setTimeout(() => { navigate('/'); window.location.reload() }, 500)
  }

  if (isLoading) return <p className="text-sm text-[#9CA3AF]">Carregando...</p>

  const pending = users.filter((u: any) => u.status === 'PENDENTE')

  return (
    <div>
      <h1 className="text-[22px] font-bold text-[#1A1A2E] mb-6">Painel Administrativo</h1>

      {msg && (
        <div className="mb-4 bg-[#D9F0FC] border border-[#45B5E8]/30 rounded-[10px] px-4 py-3 text-sm text-[#0C6E93]">{msg}</div>
      )}

      {pending.length > 0 && (
        <div className="mb-6 bg-[#FEF3CD] border border-[#F4C542]/30 rounded-[10px] p-4">
          <p className="text-sm font-bold text-[#92610A] mb-1">{pending.length} usuário(s) aguardando aprovação</p>
          <div className="flex flex-col gap-1">
            {pending.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="text-[#92610A]">{u.name} — {u.email}</span>
                <button onClick={() => approve.mutate(u.id)} disabled={approve.isPending}
                  className="text-[#155724] hover:text-[#0a2e12] font-bold ml-4">Aprovar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F8F7FC] border-b border-black/[0.08]">
            <tr>
              <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Usuário</th>
              <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Role</th>
              <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Status</th>
              <th className="text-left px-4 py-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Cadastro</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => {
              const isMe = u.id === user?.id
              return (
                <tr key={u.id} className="border-b border-black/[0.08] last:border-0 hover:bg-[#F8F7FC]">
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#1A1A2E]">{u.name}</p>
                    <p className="text-xs text-[#9CA3AF]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${roleColor[u.role] ?? 'bg-[#F8F7FC] text-[#9CA3AF]'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusColor[u.status] ?? 'bg-[#F8F7FC] text-[#9CA3AF]'}`}>
                      {statusLabel[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9CA3AF]">
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    {!isMe && (
                      <div className="flex items-center gap-3 justify-end">
                        {u.status === 'PENDENTE' && (
                          <button onClick={() => approve.mutate(u.id)} disabled={approve.isPending}
                            className="text-xs text-[#155724] hover:text-[#0a2e12] font-bold">Aprovar</button>
                        )}
                        {u.status === 'APROVADO' && u.role !== 'MASTER' && (
                          <button onClick={() => revoke.mutate(u.id)} disabled={revoke.isPending}
                            className="text-xs text-[#92610A] hover:text-[#5c3d07] font-bold">Revogar</button>
                        )}
                        {u.role !== 'MASTER' && (
                          <>
                            <button onClick={() => impersonate(u)}
                              className="text-xs text-[#7C5CBF] hover:text-[#9B7DD4] font-bold">Entrar como</button>
                            <button onClick={() => { if (confirm(`Excluir ${u.name}?`)) remove.mutate(u.id) }}
                              disabled={remove.isPending}
                              className="text-xs text-red-400 hover:text-red-500">Excluir</button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-center text-sm text-[#9CA3AF] py-8">Nenhum usuário cadastrado</p>
        )}
      </div>
    </div>
  )
}
