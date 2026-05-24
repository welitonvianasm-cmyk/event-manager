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
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
      <span className="text-sm text-amber-800">
        Acessando como <strong>{parsed.name}</strong> ({parsed.email})
      </span>
      <button onClick={stopImpersonating}
        className="text-sm text-amber-700 hover:text-amber-900 font-medium border border-amber-300 rounded px-3 py-0.5 hover:bg-amber-100">
        Voltar para Admin
      </button>
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ImpersonationBanner />
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <nav className="flex items-center gap-6">
          <span className="font-bold text-blue-700 text-lg">EventManager</span>
          <NavLink to="/" end className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>Eventos</NavLink>
          <NavLink to="/catalog" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>Catálogo</NavLink>
          <NavLink to="/templates" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>Templates</NavLink>
          {user?.role === 'MASTER' && (
            <NavLink to="/admin" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-purple-600' : 'text-purple-500 hover:text-purple-700'}`}>Admin</NavLink>
          )}
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.name}</span>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">Sair</button>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
