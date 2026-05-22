import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const typeLabel: Record<string, string> = { PRESENCIAL: 'Presencial', ONLINE: 'Online', HIBRIDO: 'Híbrido' }
const typeColor: Record<string, string> = {
  PRESENCIAL: 'bg-blue-100 text-blue-700',
  ONLINE: 'bg-purple-100 text-purple-700',
  HIBRIDO: 'bg-orange-100 text-orange-700',
}

export default function TemplatesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: templates } = useQuery<any[]>({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  })

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-sm text-gray-500">Estruturas salvas de eventos anteriores</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700">
        Para salvar um evento como template, acesse o evento e clique em "Salvar como template" na visão geral.
      </div>

      {!templates?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium text-gray-600">Nenhum template ainda</p>
          <p className="text-sm mt-1">Crie eventos e salve-os como template para reutilizar</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[t.eventType]}`}>
                  {typeLabel[t.eventType]}
                </span>
                <span className="text-xs text-gray-400">{t.totalDays} dia(s)</span>
              </div>
              <h2 className="font-semibold text-gray-900 mb-1">{t.name}</h2>
              <p className="text-xs text-gray-400 mb-4">
                {t.sections?.length ?? 0} seções · {t.scriptDays?.length ?? 0} dia(s) de roteiro
              </p>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/events/new?templateId=${t.id}`)}
                  className="flex-1 text-sm bg-blue-50 text-blue-700 rounded-lg py-1.5 font-medium hover:bg-blue-100">
                  Usar template
                </button>
                <button onClick={() => { if (confirm('Excluir template?')) deleteTemplate.mutate(t.id) }}
                  className="text-sm text-red-400 hover:text-red-600 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
