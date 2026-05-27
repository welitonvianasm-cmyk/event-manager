import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import NewEventPage from './pages/NewEventPage'
import EventPage from './pages/EventPage'
import ChecklistPage from './pages/ChecklistPage'
import SuppliersPage from './pages/SuppliersPage'
import ScriptPage from './pages/ScriptPage'
import CatalogPage from './pages/CatalogPage'
import TemplatesPage from './pages/TemplatesPage'
import AdminPage from './pages/AdminPage'
import GuestListPage from './pages/GuestListPage'
import TicketSalesPage from './pages/TicketSalesPage'
import Layout from './components/Layout'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function MasterRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'MASTER') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="events/new" element={<NewEventPage />} />
        <Route path="events/:id" element={<EventPage />} />
        <Route path="events/:id/checklist" element={<ChecklistPage />} />
        <Route path="events/:id/suppliers" element={<SuppliersPage />} />
        <Route path="events/:id/script" element={<ScriptPage />} />
        <Route path="events/:id/guests" element={<GuestListPage />} />
        <Route path="events/:id/sales" element={<TicketSalesPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="admin" element={<MasterRoute><AdminPage /></MasterRoute>} />
      </Route>
    </Routes>
  )
}
