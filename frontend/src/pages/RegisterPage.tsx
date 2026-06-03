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
    <div className="min-h-screen flex items-center justify-center bg-[#F3F2F8]">
      <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_24px_rgba(124,92,191,0.10)] p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#7C5CBF] rounded-[10px] flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
              <polyline points="4,26 13,16 20,22 30,10" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="26,10 34,10 34,18" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <span className="font-bold text-[#1A1A2E] text-[15px] block leading-tight">EventManager</span>
            <span className="text-[11px] text-[#9CA3AF]">Sistema de Gestão</span>
          </div>
        </div>
        <h1 className="text-[22px] font-bold text-[#1A1A2E] mb-1">Criar conta</h1>
        <p className="text-[#6B7280] text-sm mb-6">Preencha seus dados para se cadastrar</p>
        {error && (
          <p className="text-sm mb-4 bg-[#FDEDEE] border border-[#FF6B8A]/30 text-[#C0392B] rounded-[10px] p-3">{error}</p>
        )}
        {success && (
          <div className="mb-4 bg-[#D4EDDA] border border-[#4CD080]/30 rounded-[10px] p-3">
            <p className="text-sm text-[#155724] font-bold">{success}</p>
            <p className="text-xs text-[#155724] mt-1">
              <Link to="/login" className="underline font-bold">Voltar ao login</Link>
            </p>
          </div>
        )}
        {!success && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Nome</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                className="w-full bg-white border border-black/[0.08] text-[#1A1A2E] placeholder-[#9CA3AF] rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-white border border-black/[0.08] text-[#1A1A2E] placeholder-[#9CA3AF] rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Senha (mín. 6 caracteres)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full bg-white border border-black/[0.08] text-[#1A1A2E] placeholder-[#9CA3AF] rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]" />
            </div>
            <button type="submit" disabled={loading}
              className="bg-[#7C5CBF] text-white rounded-full py-2.5 text-sm font-bold hover:bg-[#9B7DD4] disabled:opacity-50 transition-colors">
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        )}
        <p className="text-center text-sm text-[#9CA3AF] mt-4">
          Já tem conta? <Link to="/login" className="text-[#7C5CBF] hover:text-[#9B7DD4] font-bold">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
