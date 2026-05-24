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
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a]">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-white text-lg">EventManager</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">Criar conta</h1>
        <p className="text-gray-500 text-sm mb-6">Preencha seus dados para se cadastrar</p>
        {error && (
          <p className="text-red-400 text-sm mb-4 bg-red-900/30 border border-red-800 rounded-lg p-3">{error}</p>
        )}
        {success && (
          <div className="mb-4 bg-emerald-900/30 border border-emerald-700 rounded-lg p-3">
            <p className="text-sm text-emerald-400">{success}</p>
            <p className="text-xs text-emerald-500 mt-1">
              <Link to="/login" className="underline font-medium">Voltar ao login</Link>
            </p>
          </div>
        )}
        {!success && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Senha (mín. 6 caracteres)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading}
              className="bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        )}
        <p className="text-center text-sm text-gray-500 mt-4">
          Já tem conta? <Link to="/login" className="text-blue-400 hover:text-blue-300">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
