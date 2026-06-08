import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function ImpersonationBanner() {
  const navigate = useNavigate()
  const adminUser = localStorage.getItem('adminUser')
  if (!adminUser) return null
  const parsed = JSON.parse(adminUser)

  function stopImpersonating() {
    const adminToken = localStorage.getItem('adminToken')
    if (adminToken) {
      localStorage.setItem('token', adminToken)
      localStorage.setItem('user', adminUser!)
    }
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    navigate('/admin')
    window.location.reload()
  }

  return (
    <div className="bg-[#FEF3CD] border-b border-[#F4C542]/40 px-6 py-2 flex items-center justify-between">
      <span className="text-sm text-[#92610A]">
        Acessando como <strong>{parsed.name}</strong> ({parsed.email})
      </span>
      <button onClick={stopImpersonating}
        className="text-sm text-[#92610A] font-bold border border-[#F4C542]/60 rounded-full px-4 py-0.5 hover:bg-[#F4C542]/20 transition-colors">
        Voltar para Admin
      </button>
    </div>
  )
}

const navItems = [
  { to: '/', label: 'Eventos', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ), end: true },
  { to: '/catalog', label: 'Catálogo', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ) },
  { to: '/templates', label: 'Templates', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ) },
  { to: '/reports', label: 'Relatórios', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ) },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-[#7C5CBF] flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-[10px] flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
                <polyline points="4,26 13,16 20,22 30,10" stroke="#7C5CBF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="26,10 34,10 34,18" stroke="#7C5CBF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <span className="font-bold text-white text-[15px] block leading-tight">EventManager</span>
              <span className="text-[10px] text-white/60">Sistema de Gestão</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.1em] px-3 mb-2 mt-1">Menu</p>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm transition-colors ${
                  isActive
                    ? 'bg-white text-[#7C5CBF] font-bold'
                    : 'text-white/65 hover:bg-white/10 hover:text-white font-normal'
                }`
              }>
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {user?.role === 'MASTER' && (
            <>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.1em] px-3 mb-2 mt-5">Outros</p>
              <NavLink to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm transition-colors ${
                    isActive
                      ? 'bg-white text-[#7C5CBF] font-bold'
                      : 'text-white/65 hover:bg-white/10 hover:text-white font-normal'
                  }`
                }>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Admin
              </NavLink>
            </>
          )}
        </nav>

        {/* User info */}
        <div className="px-3 py-4 border-t border-white/15">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-white/25 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-white/60 truncate">{user?.role === 'MASTER' ? 'Administrador' : 'Cliente'}</p>
            </div>
            <button onClick={handleLogout} title="Sair"
              className="text-white/50 hover:text-white transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-auto bg-[#F3F2F8]">
        <ImpersonationBanner />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
