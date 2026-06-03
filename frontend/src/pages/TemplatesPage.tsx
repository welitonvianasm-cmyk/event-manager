import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const typeLabel: Record<string, string> = { PRESENCIAL: 'Presencial', ONLINE: 'Online', HIBRIDO: 'Híbrido' }
const typeColor: Record<string, string> = {
  PRESENCIAL: 'bg-[#EDE9F8] text-[#7C5CBF]',
  ONLINE: 'bg-[#D9F0FC] text-[#0C6E93]',
  HIBRIDO: 'bg-[#FEF3CD] text-[#92610A]',
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
          <h1 className="text-[22px] font-bold text-[#1A1A2E]">Templates</h1>
          <p className="text-sm text-[#6B7280]">Estruturas salvas de eventos anteriores</p>
        </div>
      </div>

      <div className="bg-[#D9F0FC] border border-[#45B5E8]/30 rounded-[10px] p-4 mb-6 text-sm text-[#0C6E93]">
        Para salvar um evento como template, acesse o evento e clique em "Salvar como template" na visão geral.
      </div>

      {!templates?.length ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-bold text-[#1A1A2E]">Nenhum template ainda</p>
          <p className="text-sm mt-1 text-[#9CA3AF]">Crie eventos e salve-os como template para reutilizar</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-5 hover:shadow-[0_4px_16px_rgba(124,92,191,0.12)] transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${typeColor[t.eventType]}`}>
                  {typeLabel[t.eventType]}
                </span>
                <span className="text-xs text-[#9CA3AF]">{t.totalDays} dia(s)</span>
              </div>
              <h2 className="font-bold text-[#1A1A2E] mb-1">{t.name}</h2>
              <p className="text-xs text-[#9CA3AF] mb-4">
                {t.sections?.length ?? 0} seções · {t.scriptDays?.length ?? 0} dia(s) de roteiro
              </p>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/events/new?templateId=${t.id}`)}
                  className="flex-1 text-sm bg-[#EDE9F8] text-[#7C5CBF] border border-[#7C5CBF]/20 rounded-full py-1.5 font-bold hover:bg-[#7C5CBF] hover:text-white transition-colors">
                  Usar template
                </button>
                <button onClick={() => { if (confirm('Excluir template?')) deleteTemplate.mutate(t.id) }}
                  className="text-sm text-red-400 hover:text-red-500 px-3 py-1.5 border border-red-200 rounded-full hover:bg-red-50 transition-colors">
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
