import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      const msg = err?.response?.data?.error
      if (msg === 'Aguardando aprovação do administrador') {
        setError('Seu cadastro está aguardando aprovação do administrador.')
      } else {
        setError('E-mail ou senha inválidos')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F2F8]">
      <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_24px_rgba(124,92,191,0.10)] p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#EDE9F8] rounded-[10px] flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/favicon.svg" alt="event. logo" className="w-7 h-7" />
          </div>
          <div>
            <span className="font-bold text-[#1A1A2E] text-[15px] block leading-tight">event.</span>
            <span className="text-[11px] text-[#9CA3AF]">Sistema de gestão</span>
          </div>
        </div>
        <h1 className="text-[22px] font-bold text-[#1A1A2E] mb-1">Entrar</h1>
        <p className="text-[#6B7280] text-sm mb-6">Acesse sua conta</p>
        {error && (
          <p className="text-sm mb-4 bg-[#FEF3CD] border border-[#F4C542]/30 text-[#92610A] rounded-[10px] p-3">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-white border border-black/[0.08] text-[#1A1A2E] placeholder-[#9CA3AF] rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-white border border-black/[0.08] text-[#1A1A2E] placeholder-[#9CA3AF] rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]" />
          </div>
          <button type="submit" disabled={loading}
            className="bg-[#7C5CBF] text-white rounded-full py-2.5 text-sm font-bold hover:bg-[#9B7DD4] disabled:opacity-50 transition-colors">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="text-center text-sm text-[#9CA3AF] mt-4">
          Não tem conta? <Link to="/register" className="text-[#7C5CBF] hover:text-[#9B7DD4] font-bold">Cadastre-se</Link>
        </p>
      </div>
    </div>
  )
}
