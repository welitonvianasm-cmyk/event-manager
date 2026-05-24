import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const result = await register(name, email, password)
      if (result.needsApproval) {
        setSuccess('Cadastro realizado! Aguarde a aprovação do administrador para acessar o sistema.')
        setName(''); setEmail(''); setPassword('')
      } else {
        navigate('/')
      }
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">EventManager</h1>
        <p className="text-gray-500 text-sm mb-6">Crie sua conta</p>
        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg p-3">{error}</p>}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">{success}</p>
            <p className="text-xs text-green-600 mt-1">
              <Link to="/login" className="underline font-medium">Voltar ao login</Link>
            </p>
          </div>
        )}
        {!success && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha (mín. 6 caracteres)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading}
              className="bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        )}
        <p className="text-center text-sm text-gray-500 mt-4">
          Já tem conta? <Link to="/login" className="text-blue-600 hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
