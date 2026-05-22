import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api/client'

interface Event {
  id: string
  name: string
  eventType: 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'
  totalDays: number
  startDate: string
  status: 'RASCUNHO' | 'EM_ANDAMENTO' | 'CONCLUIDO'
  checklistSections: { items: { status: string }[] }[]
}

const typeLabel: Record<string, string> = { PRESENCIAL: 'Presencial', ONLINE: 'Online', HIBRIDO: 'Híbrido' }
const typeColor: Record<string, string> = {
  PRESENCIAL: 'bg-blue-100 text-blue-700',
  ONLINE: 'bg-purple-100 text-purple-700',
  HIBRIDO: 'bg-orange-100 text-orange-700',
}
const statusColor: Record<string, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-600',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDO: 'bg-green-100 text-green-700',
}
const statusLabel: Record<string, string> = { RASCUNHO: 'Rascunho', EM_ANDAMENTO: 'Em andamento', CONCLUIDO: 'Concluído' }

function calcProgress(event: Event) {
  const items = event.checklistSections.flatMap(s => s.items)
  if (!items.length) return 0
  return Math.round((items.filter(i => i.status === 'CONCLUIDO').length / items.length) * 100)
}

export default function DashboardPage() {
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then(r => r.data),
  })

  if (isLoading) return <p className="text-gray-400 text-sm">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
          <p className="text-sm text-gray-500">{events?.length ?? 0} evento(s) cadastrado(s)</p>
        </div>
        <Link to="/events/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Novo Evento
        </Link>
      </div>

      {!events?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium text-gray-600">Nenhum evento ainda</p>
          <p className="text-sm mt-1">Clique em "Novo Evento" para começar</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map(event => {
            const progress = calcProgress(event)
            return (
              <Link key={event.id} to={`/events/${event.id}`}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[event.eventType]}`}>
                    {typeLabel[event.eventType]}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[event.status]}`}>
                    {statusLabel[event.status]}
                  </span>
                </div>
                <h2 className="font-semibold text-gray-900 mb-1">{event.name}</h2>
                <p className="text-xs text-gray-400 mb-4">
                  {new Date(event.startDate).toLocaleDateString('pt-BR')} · {event.totalDays} dia(s)
                </p>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Checklist</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
