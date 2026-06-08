import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../api/client'

interface EventSummary {
  id: string
  name: string
  startDate: string
  ticketRevenue: number
  offerRevenue: number
  totalRevenue: number
  totalExpenses: number
  profit: number
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}
function fmtNum(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function downloadCSV(rows: string[][], filename: string) {
  const bom = '﻿' // UTF-8 BOM for Excel
  const content = bom + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────

function createPdf(title: string): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16)
  doc.setTextColor(28, 28, 46) // #1A1A2E approx
  doc.text(title, 14, 18)
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128) // #6B7280
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 25)
  return doc
}

// ─── Relatório de Convites ────────────────────────────────────────────────────

async function exportTicketSales(eventId: string, eventName: string, format: 'csv' | 'pdf') {
  const { data: sales } = await api.get(`/events/${eventId}/ticket-sales`)
  const LOT = ['1º', '2º', '3º', '4º', '5º']

  const header = ['Convidado', 'Tipo de Convite', 'Lote', 'Qtd', 'Preço Unit.', 'Total', 'Cortesia', 'Data']
  const rows = sales.map((s: any) => [
    s.guestName,
    s.ticketType?.name ?? '',
    `${LOT[(s.ticketType?.lot ?? 1) - 1]} Lote`,
    String(s.quantity),
    fmtNum(s.unitPrice),
    fmtNum(s.totalPrice),
    s.unitPrice === 0 ? 'Sim' : 'Não',
    fmtDate(s.createdAt),
  ])

  const totals = [
    '', '', '',
    String(sales.reduce((s: number, t: any) => s + t.quantity, 0)),
    '',
    fmtNum(sales.reduce((s: number, t: any) => s + t.totalPrice, 0)),
    '', '',
  ]

  const filename = `convites_${eventName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`

  if (format === 'csv') {
    downloadCSV([header, ...rows, totals], `${filename}.csv`)
  } else {
    const doc = createPdf(`Relatório de Convites — ${eventName}`)
    autoTable(doc, {
      startY: 30,
      head: [header],
      body: [...rows, totals],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [124, 92, 191], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [237, 233, 248], textColor: [28, 28, 46], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 247, 252] },
      didParseCell: (data: any) => {
        if (data.row.index === rows.length) data.cell.styles.fontStyle = 'bold'
      },
    })
    doc.save(`${filename}.pdf`)
  }
}

// ─── Relatório de Ofertas ─────────────────────────────────────────────────────

async function exportOfferSales(eventId: string, eventName: string, format: 'csv' | 'pdf') {
  const { data: sales } = await api.get(`/events/${eventId}/offer-sales`)

  const header = ['Convidado', 'CPF', 'Valor', 'Forma Pagamento', 'Parcelas', 'Entrada', 'Observações', 'Data']
  const rows = sales.map((o: any) => [
    o.guestName,
    o.cpf ?? '',
    fmtNum(o.value),
    o.isEntrada ? 'Entrada + negociar' : o.installments ? 'Parcelado' : 'À vista',
    o.installments ? `${o.installments}x` : '',
    o.isEntrada ? 'Sim' : 'Não',
    o.notes ?? '',
    fmtDate(o.createdAt),
  ])

  const total = sales.reduce((s: number, o: any) => s + o.value, 0)
  const totals = ['', '', fmtNum(total), '', '', '', '', '']

  const filename = `ofertas_${eventName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`

  if (format === 'csv') {
    downloadCSV([header, ...rows, totals], `${filename}.csv`)
  } else {
    const doc = createPdf(`Relatório de Ofertas — ${eventName}`)
    autoTable(doc, {
      startY: 30,
      head: [header],
      body: [...rows, totals],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [124, 92, 191], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 247, 252] },
      didParseCell: (data: any) => {
        if (data.row.index === rows.length) data.cell.styles.fontStyle = 'bold'
      },
    })
    doc.save(`${filename}.pdf`)
  }
}

// ─── Relatório Financeiro Geral ───────────────────────────────────────────────

function exportFinancialReport(summaries: EventSummary[], format: 'csv' | 'pdf') {
  const header = ['Evento', 'Data', 'Receita Convites', 'Receita Ofertas', 'Total Receita', 'Gastos', 'Lucro']
  const rows = summaries.map(s => [
    s.name,
    fmtDate(s.startDate),
    fmtNum(s.ticketRevenue),
    fmtNum(s.offerRevenue),
    fmtNum(s.totalRevenue),
    fmtNum(s.totalExpenses),
    fmtNum(s.profit),
  ])

  const totals = [
    'TOTAL', '',
    fmtNum(summaries.reduce((s, f) => s + f.ticketRevenue, 0)),
    fmtNum(summaries.reduce((s, f) => s + f.offerRevenue, 0)),
    fmtNum(summaries.reduce((s, f) => s + f.totalRevenue, 0)),
    fmtNum(summaries.reduce((s, f) => s + f.totalExpenses, 0)),
    fmtNum(summaries.reduce((s, f) => s + f.profit, 0)),
  ]

  const filename = `relatorio_financeiro_${new Date().toISOString().slice(0, 10)}`

  if (format === 'csv') {
    downloadCSV([header, ...rows, totals], `${filename}.csv`)
  } else {
    const doc = createPdf('Relatório Financeiro Geral')
    autoTable(doc, {
      startY: 30,
      head: [header],
      body: [...rows, totals],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [124, 92, 191], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 247, 252] },
      didParseCell: (data: any) => {
        if (data.row.index === rows.length) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [237, 233, 248]
        }
        if (data.section === 'body' && data.column.index >= 6) {
          const val = summaries[data.row.index]?.profit ?? 0
          if (val < 0) data.cell.styles.textColor = [192, 57, 43]
          else if (val > 0) data.cell.styles.textColor = [21, 87, 36]
        }
      },
    })
    doc.save(`${filename}.pdf`)
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [selectedEventId, setSelectedEventId] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then(r => r.data),
  })

  const { data: financials = [] } = useQuery<EventSummary[]>({
    queryKey: ['all-financial'],
    queryFn: () => api.get('/events/all-financial').then(r => r.data),
  })

  const selectedEvent = events.find((e: any) => e.id === selectedEventId)

  async function handleExport(type: 'tickets' | 'offers' | 'financial', format: 'csv' | 'pdf') {
    const key = `${type}-${format}`
    setLoading(key)
    try {
      if (type === 'financial') {
        exportFinancialReport(financials, format)
      } else if (selectedEventId && selectedEvent) {
        if (type === 'tickets') await exportTicketSales(selectedEventId, selectedEvent.name, format)
        if (type === 'offers') await exportOfferSales(selectedEventId, selectedEvent.name, format)
      }
    } finally {
      setLoading(null)
    }
  }

  const totalRevenue = financials.reduce((s, f) => s + f.totalRevenue, 0)
  const totalExpenses = financials.reduce((s, f) => s + f.totalExpenses, 0)
  const totalProfit = totalRevenue - totalExpenses

  function ExportButtons({ type, disabled }: { type: 'tickets' | 'offers' | 'financial'; disabled?: boolean }) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => handleExport(type, 'csv')}
          disabled={disabled || loading !== null}
          className="flex items-center gap-2 bg-[#D4EDDA] text-[#155724] px-4 py-2 rounded-full text-sm font-bold hover:bg-[#c3e6cb] transition-colors disabled:opacity-40">
          {loading === `${type}-csv` ? '⏳ Gerando...' : '📊 Planilha (.csv)'}
        </button>
        <button
          onClick={() => handleExport(type, 'pdf')}
          disabled={disabled || loading !== null}
          className="flex items-center gap-2 bg-[#FDEDEE] text-[#C0392B] px-4 py-2 rounded-full text-sm font-bold hover:bg-[#fad7da] transition-colors disabled:opacity-40">
          {loading === `${type}-pdf` ? '⏳ Gerando...' : '📄 PDF'}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#1A1A2E]">Relatórios</h1>
        <p className="text-sm text-[#6B7280]">Exporte dados de vendas e financeiro em planilha ou PDF</p>
      </div>

      <div className="flex flex-col gap-6">

        {/* ─── Relatório de Vendas por Evento ─────────────────────────────── */}
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#EDE9F8] flex items-center justify-center text-xl shrink-0">🎟️</div>
            <div>
              <h2 className="font-bold text-[#1A1A2E]">Relatório de Vendas — Convites</h2>
              <p className="text-xs text-[#6B7280]">Lista completa de convites vendidos com valores, lotes e cortesias</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Selecionar evento</label>
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              className="w-full max-w-sm bg-white border border-black/[0.08] text-[#1A1A2E] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]">
              <option value="">— Selecione um evento —</option>
              {events.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({new Date(e.startDate).toLocaleDateString('pt-BR')})
                </option>
              ))}
            </select>
          </div>

          {!selectedEventId ? (
            <p className="text-sm text-[#9CA3AF] italic">Selecione um evento para habilitar o download</p>
          ) : (
            <ExportButtons type="tickets" disabled={!selectedEventId} />
          )}
        </div>

        {/* ─── Relatório de Vendas de Ofertas ─────────────────────────────── */}
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#D9F0FC] flex items-center justify-center text-xl shrink-0">💰</div>
            <div>
              <h2 className="font-bold text-[#1A1A2E]">Relatório de Vendas — Ofertas do Evento</h2>
              <p className="text-xs text-[#6B7280]">Lista de ofertas com CPF, valor, forma de pagamento e observações</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Selecionar evento</label>
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              className="w-full max-w-sm bg-white border border-black/[0.08] text-[#1A1A2E] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]">
              <option value="">— Selecione um evento —</option>
              {events.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({new Date(e.startDate).toLocaleDateString('pt-BR')})
                </option>
              ))}
            </select>
          </div>

          {!selectedEventId ? (
            <p className="text-sm text-[#9CA3AF] italic">Selecione um evento para habilitar o download</p>
          ) : (
            <ExportButtons type="offers" disabled={!selectedEventId} />
          )}
        </div>

        {/* ─── Relatório Financeiro Geral ──────────────────────────────────── */}
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#FEF3CD] flex items-center justify-center text-xl shrink-0">📊</div>
            <div>
              <h2 className="font-bold text-[#1A1A2E]">Relatório Financeiro Geral</h2>
              <p className="text-xs text-[#6B7280]">Resumo consolidado de todos os eventos: receitas, gastos e lucro</p>
            </div>
          </div>

          {/* Preview mini-table */}
          {financials.length > 0 && (
            <div className="bg-[#F8F7FC] rounded-[10px] border border-black/[0.08] overflow-hidden mb-4">
              <table className="w-full text-xs">
                <thead className="bg-[#EDE9F8]">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold text-[#7C5CBF]">Evento</th>
                    <th className="text-right px-3 py-2 font-bold text-[#7C5CBF]">Receita</th>
                    <th className="text-right px-3 py-2 font-bold text-[#7C5CBF]">Gastos</th>
                    <th className="text-right px-3 py-2 font-bold text-[#7C5CBF]">Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {financials.map(f => (
                    <tr key={f.id} className="border-t border-black/[0.06]">
                      <td className="px-3 py-2 text-[#1A1A2E] font-bold truncate max-w-[180px]">{f.name}</td>
                      <td className="px-3 py-2 text-right text-[#155724]">{fmt(f.totalRevenue)}</td>
                      <td className="px-3 py-2 text-right text-[#C0392B]">{fmt(f.totalExpenses)}</td>
                      <td className={`px-3 py-2 text-right font-bold ${f.profit >= 0 ? 'text-[#7C5CBF]' : 'text-[#C0392B]'}`}>
                        {fmt(f.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-[#7C5CBF]/20">
                  <tr className="bg-[#EDE9F8]">
                    <td className="px-3 py-2 font-bold text-[#7C5CBF] text-xs uppercase tracking-wide">Total</td>
                    <td className="px-3 py-2 text-right font-bold text-[#155724]">{fmt(totalRevenue)}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#C0392B]">{fmt(totalExpenses)}</td>
                    <td className={`px-3 py-2 text-right font-bold text-sm ${totalProfit >= 0 ? 'text-[#7C5CBF]' : 'text-[#C0392B]'}`}>
                      {fmt(totalProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {financials.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] italic mb-4">Nenhum evento com dados financeiros ainda</p>
          ) : (
            <ExportButtons type="financial" />
          )}
        </div>

      </div>
    </div>
  )
}
