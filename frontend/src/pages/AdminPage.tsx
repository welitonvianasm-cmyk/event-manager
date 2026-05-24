import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'

const statusLabel: Record<string, string> = { PENDENTE: 'Pendente', APROVADO: 'Aprovado', REVOGADO: 'Revogado' }
const statusColor: Record<string, string> = {
  PENDENTE: 'bg-amber-500/20 text-amber-400',
  APROVADO: 'bg-emerald-500/20 text-emerald-400',
  REVOGADO: 'bg-red-500/20 text-red-400',
}
const roleColor: Record<string, string> = {
  MASTER: 'bg-purple-500/20 text-purple-400',
  CLIENT: 'bg-gray-700 text-gray-400',
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

  if (isLoading) return <p className="text-sm text-gray-500">Carregando...</p>

  const pending = users.filter((u: any) => u.status === 'PENDENTE')

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Painel Administrativo</h1>

      {msg && (
        <div className="mb-4 bg-blue-900/30 border border-blue-700 rounded-xl px-4 py-3 text-sm text-blue-300">{msg}</div>
      )}

      {pending.length > 0 && (
        <div className="mb-6 bg-amber-900/30 border border-amber-700 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-300 mb-1">{pending.length} usuário(s) aguardando aprovação</p>
          <div className="flex flex-col gap-1">
            {pending.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-200">{u.name} — {u.email}</span>
                <button onClick={() => approve.mutate(u.id)} disabled={approve.isPending}
                  className="text-emerald-400 hover:text-emerald-300 font-medium ml-4">Aprovar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Usuário</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cadastro</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => {
              const isMe = u.id === user?.id
              return (
                <tr key={u.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[u.role] ?? 'bg-gray-700 text-gray-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[u.status] ?? 'bg-gray-700 text-gray-500'}`}>
                      {statusLabel[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    {!isMe && (
                      <div className="flex items-center gap-3 justify-end">
                        {u.status === 'PENDENTE' && (
                          <button onClick={() => approve.mutate(u.id)} disabled={approve.isPending}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Aprovar</button>
                        )}
                        {u.status === 'APROVADO' && u.role !== 'MASTER' && (
                          <button onClick={() => revoke.mutate(u.id)} disabled={revoke.isPending}
                            className="text-xs text-amber-400 hover:text-amber-300 font-medium">Revogar</button>
                        )}
                        {u.role !== 'MASTER' && (
                          <>
                            <button onClick={() => impersonate(u)}
                              className="text-xs text-blue-400 hover:text-blue-300 font-medium">Entrar como</button>
                            <button onClick={() => { if (confirm(`Excluir ${u.name}?`)) remove.mutate(u.id) }}
                              disabled={remove.isPending}
                              className="text-xs text-red-500 hover:text-red-400">Excluir</button>
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
          <p className="text-center text-sm text-gray-600 py-8">Nenhum usuário cadastrado</p>
        )}
      </div>
    </div>
  )
}
