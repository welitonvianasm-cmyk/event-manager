import { PrismaClient, EventType, ScriptItemType, SupplierCategory } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Checklist data per event type ───────────────────────────────────────────

const presencialSections = [
  {
    name: '1. Estratégia do Evento',
    items: [
      'Objetivo do evento definido',
      'Público-alvo claro',
      'Promessa principal da imersão',
      'Nome do evento',
      'Número de participantes',
      'Ticket / modelo de monetização',
      'Meta de faturamento (se aplicável)',
    ],
  },
  {
    name: '2. Local & Estrutura',
    items: [
      'Local reservado',
      'Contrato assinado',
      'Capacidade compatível com o número de participantes',
      'Localização estratégica',
      'Estacionamento disponível',
      'Ar-condicionado funcionando',
      'Banheiros suficientes',
      'Limpeza do local',
      'Internet estável',
      'Acessibilidade (rampa, banheiro adaptado)',
      'Disposição das cadeiras definida',
      'Palco ou área de apresentação',
      'Mesa de apoio',
      'Espaço para networking',
      'Espaço para coffee break',
      'Sinalização interna do evento',
    ],
  },
  {
    name: '3. Equipamentos',
    items: [
      'Sistema de som (caixas + mesa)',
      'Microfone lapela',
      'Microfone de mão',
      'Projetor ou painel LED',
      'Tela de projeção',
      'Extensões e cabos',
      'Clicker para slides',
      'Iluminação adequada',
      'Teste técnico completo',
    ],
  },
  {
    name: '4. Captação (Opcional)',
    items: [
      'Filmagem contratada',
      'Fotógrafo',
      'Captação de depoimentos',
      'Áudio limpo nas gravações',
      'Storymaker / redes sociais ao vivo',
    ],
  },
  {
    name: '5. Alimentação',
    items: [
      'Coffee break manhã',
      'Coffee break tarde',
      'Água disponível continuamente',
      'Almoço definido ou indicado',
      'Restrições alimentares mapeadas',
    ],
  },
  {
    name: '6. Participantes',
    items: [
      'Lista de participantes confirmada',
      'Pagamentos conferidos',
      'Grupo de comunicação criado',
      'Informações pré-evento enviadas',
      'Sistema de check-in definido',
      'Lista VIP separada (se houver)',
    ],
  },
  {
    name: '7. Material do Evento',
    items: [
      'Credenciais / crachás',
      'Kit do participante (se houver)',
      'Bloco de anotações',
      'Canetas',
      'Slides finalizados',
      'Backup da apresentação (nuvem + pendrive)',
      'Roteiro do evento impresso',
      'Material de vendas (contrato, link de pagamento)',
    ],
  },
  {
    name: '8. Equipe',
    items: [
      'Recepção / credenciamento',
      'Suporte técnico',
      'Coordenador do evento',
      'Time de vendas (se houver oferta)',
      'Responsável pela organização geral',
      'Briefing da equipe realizado',
    ],
  },
  {
    name: '9. Marketing & Pré-evento',
    items: [
      'Página de inscrição ativa',
      'Sequência de comunicação criada',
      'Instruções claras enviadas',
      'Aquecimento da audiência realizado',
      'Confirmação enviada 24h antes',
      'Formulário de Qualificação do Evento',
      'Formulários de Avaliação do Evento',
      'Criação de Grupo de WhatsApp do Evento',
    ],
  },
  {
    name: '10. Roteiro do Evento',
    items: [
      'Minuto a minuto elaborado',
      'Minuto a minuto revisado pela equipe',
    ],
  },
  {
    name: '11. Testes (antes do evento)',
    items: [
      'Teste geral realizado',
      'Teste de slides',
      'Teste de áudio',
      'Teste de vídeo',
      'Teste de internet',
    ],
  },
  {
    name: '12. Pós-evento',
    items: [
      'Follow-up com participantes',
      'Envio de materiais',
      'Coleta de feedback / NPS',
      'Análise de resultados',
      'Postagens de prova social',
      'Aproveitamento de conteúdo gravado',
      'Reunião de retrospectiva da equipe',
      'Relatório financeiro',
    ],
  },
]

const onlineSections = [
  {
    name: '1. Estratégia do Evento',
    items: [
      'Objetivo do evento definido',
      'Público-alvo claro',
      'Promessa principal',
      'Nome do evento',
      'Número de participantes',
      'Ticket / modelo de monetização',
      'Meta de faturamento (se aplicável)',
    ],
  },
  {
    name: '2. Plataforma & Configuração',
    items: [
      'Plataforma definida (Zoom, Meet, Teams, StreamYard)',
      'Sala / evento criado e configurado',
      'Link de acesso gerado',
      'Capacidade de participantes verificada',
      'Co-host configurado na plataforma',
      'Gravação habilitada',
      'Sala de espera configurada',
    ],
  },
  {
    name: '3. Técnico — Apresentador',
    items: [
      'Câmera testada (qualidade HD)',
      'Microfone / áudio testado',
      'Iluminação adequada',
      'Fundo virtual ou fundo físico organizado',
      'Internet estável (preferencialmente cabeada)',
      'Backup de internet (4G / 5G)',
      'Segundo dispositivo como backup',
    ],
  },
  {
    name: '4. Interatividade & Engajamento',
    items: [
      'Chat moderado definido',
      'Enquetes configuradas',
      'Sala de perguntas (Q&A)',
      'Breakout rooms configuradas (se necessário)',
      'Dinâmicas online planejadas',
    ],
  },
  {
    name: '5. Captação (Opcional)',
    items: [
      'Gravação local do apresentador habilitada',
      'Gravação da plataforma habilitada',
      'Editor para pós-produção contratado',
    ],
  },
  {
    name: '6. Participantes',
    items: [
      'Lista confirmada',
      'Link de acesso enviado',
      'Tutorial de acesso à plataforma enviado',
      'Lembrete 24h antes enviado',
      'Lembrete 1h antes enviado',
    ],
  },
  {
    name: '7. Material Digital',
    items: [
      'Slides finalizados',
      'Backup em PDF',
      'Materiais complementares prontos para compartilhar no chat',
      'Link de materiais pós-evento preparado',
    ],
  },
  {
    name: '8. Equipe Online',
    items: [
      'Moderador do chat definido',
      'Suporte técnico para participantes',
      'Responsável pelo backstage / bastidores',
    ],
  },
  {
    name: '9. Marketing & Pré-evento',
    items: [
      'Página de inscrição ativa',
      'Sequência de comunicação criada',
      'Instruções claras enviadas',
      'Aquecimento da audiência realizado',
      'Confirmação enviada 24h antes',
      'Formulário de Qualificação do Evento',
      'Formulários de Avaliação do Evento',
      'Criação de Grupo de WhatsApp do Evento',
    ],
  },
  {
    name: '10. Roteiro do Evento',
    items: [
      'Minuto a minuto elaborado',
      'Minuto a minuto revisado pela equipe',
    ],
  },
  {
    name: '11. Testes (antes do evento)',
    items: [
      'Teste completo da plataforma',
      'Teste de compartilhamento de tela',
      'Teste com participante externo',
      'Teste de gravação',
      'Teste de enquetes e interatividade',
    ],
  },
  {
    name: '12. Pós-evento',
    items: [
      'Gravação processada e disponibilizada',
      'Follow-up com link da gravação',
      'Materiais enviados',
      'Pesquisa de satisfação / NPS',
      'Análise de métricas (participantes, tempo médio, engajamento)',
      'Postagens de prova social',
    ],
  },
]

function buildHybridSections() {
  const hybrid: { name: string; items: string[] }[] = []

  const presMap = new Map(presencialSections.map((s) => [s.name, s]))
  const onlineMap = new Map(onlineSections.map((s) => [s.name, s]))

  // Sections unique to presencial or shared — merge online-specific sections
  const allNames = new Set([...presencialSections.map((s) => s.name)])

  for (const name of allNames) {
    const pres = presMap.get(name)
    const onl = onlineMap.get(name)
    const items = [...(pres?.items ?? [])]
    if (onl) {
      for (const item of onl.items) {
        if (!items.includes(item)) items.push(item)
      }
    }
    hybrid.push({ name, items })
  }

  // Add online-only sections not in presencial
  for (const sec of onlineSections) {
    if (!presMap.has(sec.name)) hybrid.push(sec)
  }

  return hybrid
}

const multiDayExtra: { name: string; items: string[] } = {
  name: '13. Logística Multi-dia',
  items: [
    'Hospedagem dos participantes mapeada (se aplicável)',
    'Jantar / confraternização entre os dias organizado',
    'Acomodação da equipe definida',
    'Energia e recarga de equipamentos entre os dias',
    'Programação do segundo dia revisada',
  ],
}

export function getChecklistSections(eventType: EventType, totalDays: number) {
  let sections: { name: string; items: string[] }[]

  if (eventType === 'PRESENCIAL') sections = presencialSections
  else if (eventType === 'ONLINE') sections = onlineSections
  else sections = buildHybridSections()

  if (totalDays > 1) sections = [...sections, multiDayExtra]

  return sections
}

// ─── Default script (1 day presencial template) ───────────────────────────────

export const defaultScriptPresencial = [
  { startTime: '08:00', endTime: '09:00', title: 'Credenciamento + Welcome Coffee', type: 'CREDENCIAMENTO' as ScriptItemType },
  { startTime: '09:00', endTime: '09:15', title: 'Abertura do Evento', type: 'ABERTURA' as ScriptItemType },
  { startTime: '09:15', endTime: '09:55', title: 'Palestra 1', type: 'PALESTRA' as ScriptItemType },
  { startTime: '09:55', endTime: '10:05', title: 'Palestra 2', type: 'PALESTRA' as ScriptItemType },
  { startTime: '10:05', endTime: '10:50', title: 'Palestra 3', type: 'PALESTRA' as ScriptItemType },
  { startTime: '10:50', endTime: '11:50', title: 'Palestra 4', type: 'PALESTRA' as ScriptItemType },
  { startTime: '11:50', endTime: '12:30', title: 'Pitch de Vendas', type: 'PITCH' as ScriptItemType },
  { startTime: '12:30', endTime: '14:00', title: 'Almoço', type: 'ALMOCO' as ScriptItemType },
  { startTime: '14:00', endTime: '14:10', title: 'Abertura Animada — retorno', type: 'ABERTURA' as ScriptItemType },
  { startTime: '14:10', endTime: '15:10', title: 'Palestra 5', type: 'PALESTRA' as ScriptItemType },
  { startTime: '15:10', endTime: '16:00', title: 'Palestra 6', type: 'PALESTRA' as ScriptItemType },
  { startTime: '16:00', endTime: '16:45', title: 'Conteúdo pré-repitch', type: 'PALESTRA' as ScriptItemType },
  { startTime: '16:45', endTime: '17:15', title: 'Repitch', type: 'REPITCH' as ScriptItemType },
  { startTime: '17:15', endTime: '17:45', title: 'Coffee Break', type: 'COFFEE_BREAK' as ScriptItemType },
  { startTime: '17:45', endTime: '18:45', title: 'Palestra 7', type: 'PALESTRA' as ScriptItemType },
  { startTime: '18:45', endTime: '19:05', title: 'Quebra de Objeções', type: 'QUEBRA_OBJECOES' as ScriptItemType },
  { startTime: '19:05', endTime: '19:25', title: 'Encerramento', type: 'ENCERRAMENTO' as ScriptItemType },
]

export const defaultScriptOnline = [
  { startTime: '08:45', endTime: '09:00', title: 'Abertura da sala e boas-vindas no chat', type: 'CREDENCIAMENTO' as ScriptItemType },
  { startTime: '09:00', endTime: '09:15', title: 'Abertura do Evento', type: 'ABERTURA' as ScriptItemType },
  { startTime: '09:15', endTime: '10:00', title: 'Palestra 1', type: 'PALESTRA' as ScriptItemType },
  { startTime: '10:00', endTime: '10:10', title: 'Quebra / Dinâmica online', type: 'OUTRO' as ScriptItemType },
  { startTime: '10:10', endTime: '11:00', title: 'Palestra 2', type: 'PALESTRA' as ScriptItemType },
  { startTime: '11:00', endTime: '11:45', title: 'Pitch de Vendas', type: 'PITCH' as ScriptItemType },
  { startTime: '11:45', endTime: '12:30', title: 'Sessão de Perguntas (Q&A)', type: 'OUTRO' as ScriptItemType },
  { startTime: '12:30', endTime: '12:45', title: 'Encerramento', type: 'ENCERRAMENTO' as ScriptItemType },
]

// ─── Catalog default suppliers (based on spreadsheet) ────────────────────────

async function main() {
  console.log('Seed iniciado...')

  // Seed only runs if no users exist (idempotent)
  const count = await prisma.user.count()
  if (count > 0) {
    console.log('Banco já populado — seed ignorado.')
    return
  }

  console.log('Banco vazio — criando dados iniciais...')
  // No default user — users register via API
  console.log('Seed finalizado.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
