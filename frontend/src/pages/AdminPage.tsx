import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'

const statusLabel: Record<string, string> = { PENDENTE: 'Pendente', APROVADO: 'Aprovado', REVOGADO: 'Revogado' }
const statusColor: Record<string, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-700',
  APROVADO: 'bg-green-100 text-green-700',
  REVOGADO: 'bg-red-100 text-red-700',
}
const roleColor: Record<string, string> = {
  MASTER: 'bg-purple-100 text-purple-700',
  CLIENT: 'bg-gray-100 text-gray-600',
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

  if (isLoading) return <p className="text-sm text-gray-400">Carregando...</p>

  const pending = users.filter((u: any) => u.status === 'PENDENTE')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Painel Administrativo</h1>

      {msg && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">{msg}</div>
      )}

      {pending.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-yellow-800 mb-1">{pending.length} usuário(s) aguardando aprovação</p>
          <div className="flex flex-col gap-1">
            {pending.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="text-yellow-900">{u.name} — {u.email}</span>
                <button onClick={() => approve.mutate(u.id)} disabled={approve.isPending}
                  className="text-green-700 hover:text-green-900 font-medium ml-4">Aprovar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
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
                <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[u.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {statusLabel[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    {!isMe && (
                      <div className="flex items-center gap-3 justify-end">
                        {u.status === 'PENDENTE' && (
                          <button onClick={() => approve.mutate(u.id)} disabled={approve.isPending}
                            className="text-xs text-green-600 hover:text-green-800 font-medium">Aprovar</button>
                        )}
                        {u.status === 'APROVADO' && u.role !== 'MASTER' && (
                          <button onClick={() => revoke.mutate(u.id)} disabled={revoke.isPending}
                            className="text-xs text-orange-500 hover:text-orange-700 font-medium">Revogar</button>
                        )}
                        {u.role !== 'MASTER' && (
                          <>
                            <button onClick={() => impersonate(u)}
                              className="text-xs text-blue-500 hover:text-blue-700 font-medium">Entrar como</button>
                            <button onClick={() => { if (confirm(`Excluir ${u.name}?`)) remove.mutate(u.id) }}
                              disabled={remove.isPending}
                              className="text-xs text-red-400 hover:text-red-600">Excluir</button>
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
          <p className="text-center text-sm text-gray-400 py-8">Nenhum usuário cadastrado</p>
        )}
      </div>
    </div>
  )
}
