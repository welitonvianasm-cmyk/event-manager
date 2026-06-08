import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../api/client'

interface EventFinancial {
  id: string
  name: string
  startDate: string
  ticketRevenue: number
  ticketSoldQty: number
  courtesyQty: number
  offerRevenue: number
  offerCount: number
  offerAvistaCount: number
  offerAvistaTotal: number
  offerEntradaCount: number
  offerEntradaTotal: number
  offerParceladoCount: number
  offerParceladoTotal: number
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
function n(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function downloadCSV(rows: string[][], filename: string) {
  const bom = '﻿'
  const content = bom + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── RELATÓRIO COMPLETO ───────────────────────────────────────────────────────

function exportCompleteReport(data: EventFinancial[], format: 'csv' | 'pdf') {
  const filename = `relatorio_completo_${new Date().toISOString().slice(0, 10)}`

  if (format === 'csv') {
    const rows: string[][] = [
      // header
      [
        'Evento', 'Data',
        'Conv. Pagos (qtd)', 'Cortesias (qtd)', 'Total Conv. Vendidos',
        'Receita Convites (R$)',
        'Ofertas À Vista (qtd)', 'Ofertas À Vista (R$)',
        'Ofertas Entrada (qtd)', 'Ofertas Entrada (R$)',
        'Ofertas Parcelado (qtd)', 'Ofertas Parcelado (R$)',
        'Total Ofertas (qtd)', 'Receita Ofertas (R$)',
        'Total Receita (R$)', 'Gastos (R$)', 'Lucro (R$)',
      ],
    ]
    for (const f of data) {
      rows.push([
        f.name,
        fmtDate(f.startDate),
        String(f.ticketSoldQty),
        String(f.courtesyQty),
        String(f.ticketSoldQty + f.courtesyQty),
        n(f.ticketRevenue),
        String(f.offerAvistaCount),
        n(f.offerAvistaTotal),
        String(f.offerEntradaCount),
        n(f.offerEntradaTotal),
        String(f.offerParceladoCount),
        n(f.offerParceladoTotal),
        String(f.offerCount),
        n(f.offerRevenue),
        n(f.totalRevenue),
        n(f.totalExpenses),
        n(f.profit),
      ])
    }
    // totals row
    rows.push([
      'TOTAL', '',
      String(data.reduce((s, f) => s + f.ticketSoldQty, 0)),
      String(data.reduce((s, f) => s + f.courtesyQty, 0)),
      String(data.reduce((s, f) => s + f.ticketSoldQty + f.courtesyQty, 0)),
      n(data.reduce((s, f) => s + f.ticketRevenue, 0)),
      String(data.reduce((s, f) => s + f.offerAvistaCount, 0)),
      n(data.reduce((s, f) => s + f.offerAvistaTotal, 0)),
      String(data.reduce((s, f) => s + f.offerEntradaCount, 0)),
      n(data.reduce((s, f) => s + f.offerEntradaTotal, 0)),
      String(data.reduce((s, f) => s + f.offerParceladoCount, 0)),
      n(data.reduce((s, f) => s + f.offerParceladoTotal, 0)),
      String(data.reduce((s, f) => s + f.offerCount, 0)),
      n(data.reduce((s, f) => s + f.offerRevenue, 0)),
      n(data.reduce((s, f) => s + f.totalRevenue, 0)),
      n(data.reduce((s, f) => s + f.totalExpenses, 0)),
      n(data.reduce((s, f) => s + f.profit, 0)),
    ])
    downloadCSV(rows, `${filename}.csv`)
    return
  }

  // PDF
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })
  const purple: [number, number, number] = [124, 92, 191]
  const lightPurple: [number, number, number] = [237, 233, 248]

  // Title
  doc.setFontSize(18)
  doc.setTextColor(...purple)
  doc.text('Relatório Completo — Todos os Eventos', 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 23)

  // ── Tabela 1: Receita de Convites ────────────────────────────────────────────
  doc.setFontSize(11)
  doc.setTextColor(...purple)
  doc.text('1. Receita de Convites', 14, 32)

  const ticketRows = data.map(f => [
    f.name,
    fmtDate(f.startDate),
    String(f.ticketSoldQty),
    String(f.courtesyQty),
    String(f.ticketSoldQty + f.courtesyQty),
    fmt(f.ticketRevenue),
  ])
  const ticketTotals = [
    'TOTAL', '',
    String(data.reduce((s, f) => s + f.ticketSoldQty, 0)),
    String(data.reduce((s, f) => s + f.courtesyQty, 0)),
    String(data.reduce((s, f) => s + f.ticketSoldQty + f.courtesyQty, 0)),
    fmt(data.reduce((s, f) => s + f.ticketRevenue, 0)),
  ]

  autoTable(doc, {
    startY: 35,
    head: [['Evento', 'Data', 'Pagos (qtd)', 'Cortesias (qtd)', 'Total (qtd)', 'Receita (R$)']],
    body: [...ticketRows, ticketTotals],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: purple, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 247, 252] },
    columnStyles: { 0: { cellWidth: 60 }, 5: { halign: 'right' } },
    didParseCell: (data: any) => {
      if (data.row.index === ticketRows.length) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = lightPurple
      }
    },
  })

  // ── Tabela 2: Receita de Ofertas ─────────────────────────────────────────────
  const y2 = (doc as any).lastAutoTable.finalY + 8
  doc.setFontSize(11)
  doc.setTextColor(...purple)
  doc.text('2. Receita de Ofertas', 14, y2)

  const offerRows = data.map(f => [
    f.name,
    fmtDate(f.startDate),
    `${f.offerAvistaCount}x`,
    fmt(f.offerAvistaTotal),
    `${f.offerEntradaCount}x`,
    fmt(f.offerEntradaTotal),
    `${f.offerParceladoCount}x`,
    fmt(f.offerParceladoTotal),
    String(f.offerCount),
    fmt(f.offerRevenue),
  ])
  const offerTotals = [
    'TOTAL', '',
    `${data.reduce((s, f) => s + f.offerAvistaCount, 0)}x`,
    fmt(data.reduce((s, f) => s + f.offerAvistaTotal, 0)),
    `${data.reduce((s, f) => s + f.offerEntradaCount, 0)}x`,
    fmt(data.reduce((s, f) => s + f.offerEntradaTotal, 0)),
    `${data.reduce((s, f) => s + f.offerParceladoCount, 0)}x`,
    fmt(data.reduce((s, f) => s + f.offerParceladoTotal, 0)),
    String(data.reduce((s, f) => s + f.offerCount, 0)),
    fmt(data.reduce((s, f) => s + f.offerRevenue, 0)),
  ]

  autoTable(doc, {
    startY: y2 + 3,
    head: [['Evento', 'Data', 'À Vista (qtd)', 'À Vista (R$)', 'Entrada (qtd)', 'Entrada (R$)', 'Parcelado (qtd)', 'Parcelado (R$)', 'Total (qtd)', 'Total Ofertas (R$)']],
    body: [...offerRows, offerTotals],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [69, 181, 232], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 247, 252] },
    columnStyles: { 0: { cellWidth: 50 }, 3: { halign: 'right' }, 5: { halign: 'right' }, 7: { halign: 'right' }, 9: { halign: 'right' } },
    didParseCell: (data: any) => {
      if (data.row.index === offerRows.length) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [217, 240, 252]
      }
    },
  })

  // ── Tabela 3: Resumo Financeiro ──────────────────────────────────────────────
  const y3 = (doc as any).lastAutoTable.finalY + 8
  // If near bottom of page, add a new page
  if (y3 > 170) {
    doc.addPage()
    const newY = 15
    doc.setFontSize(11)
    doc.setTextColor(...purple)
    doc.text('3. Resumo Financeiro (Lucro)', 14, newY)
    renderSummaryTable(doc, data, newY + 3, purple, lightPurple)
  } else {
    doc.setFontSize(11)
    doc.setTextColor(...purple)
    doc.text('3. Resumo Financeiro (Lucro)', 14, y3)
    renderSummaryTable(doc, data, y3 + 3, purple, lightPurple)
  }

  doc.save(`${filename}.pdf`)
}

function renderSummaryTable(
  doc: jsPDF,
  data: EventFinancial[],
  startY: number,
  purple: [number, number, number],
  lightPurple: [number, number, number]
) {
  const summaryRows = data.map(f => [
    f.name,
    fmtDate(f.startDate),
    fmt(f.ticketRevenue),
    fmt(f.offerRevenue),
    fmt(f.totalRevenue),
    fmt(f.totalExpenses),
    fmt(f.profit),
  ])
  const summaryTotals = [
    'TOTAL', '',
    fmt(data.reduce((s, f) => s + f.ticketRevenue, 0)),
    fmt(data.reduce((s, f) => s + f.offerRevenue, 0)),
    fmt(data.reduce((s, f) => s + f.totalRevenue, 0)),
    fmt(data.reduce((s, f) => s + f.totalExpenses, 0)),
    fmt(data.reduce((s, f) => s + f.profit, 0)),
  ]

  autoTable(doc, {
    startY,
    head: [['Evento', 'Data', 'Receita Convites', 'Receita Ofertas', 'Total Receita', 'Gastos', 'Lucro']],
    body: [...summaryRows, summaryTotals],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: purple, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 247, 252] },
    columnStyles: { 0: { cellWidth: 55 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
    didParseCell: (data: any) => {
      if (data.row.index === summaryRows.length) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = lightPurple
      }
      // Color profit column: red if negative, green if positive
      if (data.section === 'body' && data.column.index === 6 && data.row.index < summaryRows.length) {
        const val = (data as any).row.raw[6] as string
        const isNeg = val.startsWith('-')
        data.cell.styles.textColor = isNeg ? [192, 57, 43] : [21, 87, 36]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })
}

// ─── PER-EVENT REPORTS ────────────────────────────────────────────────────────

async function exportTicketSales(eventId: string, eventName: string, format: 'csv' | 'pdf') {
  const { data: sales } = await api.get(`/events/${eventId}/ticket-sales`)
  const LOT = ['1º', '2º', '3º', '4º', '5º']
  const header = ['Convidado', 'Tipo', 'Lote', 'Qtd', 'Preço Unit.', 'Total', 'Cortesia', 'Data']
  const rows = sales.map((s: any) => [
    s.guestName, s.ticketType?.name ?? '',
    `${LOT[(s.ticketType?.lot ?? 1) - 1]} Lote`, String(s.quantity),
    n(s.unitPrice), n(s.totalPrice), s.unitPrice === 0 ? 'Sim' : 'Não', fmtDate(s.createdAt),
  ])
  const totals = ['', '', '', String(sales.reduce((s: number, t: any) => s + t.quantity, 0)), '', n(sales.reduce((s: number, t: any) => s + t.totalPrice, 0)), '', '']
  const filename = `convites_${eventName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`
  if (format === 'csv') { downloadCSV([header, ...rows, totals], `${filename}.csv`); return }
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14); doc.setTextColor(124, 92, 191)
  doc.text(`Convites — ${eventName}`, 14, 16)
  doc.setFontSize(9); doc.setTextColor(107, 114, 128)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22)
  autoTable(doc, { startY: 26, head: [header], body: [...rows, totals], styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [124, 92, 191], textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [248, 247, 252] }, didParseCell: (d: any) => { if (d.row.index === rows.length) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [237, 233, 248] } } })
  doc.save(`${filename}.pdf`)
}

async function exportOfferSales(eventId: string, eventName: string, format: 'csv' | 'pdf') {
  const { data: sales } = await api.get(`/events/${eventId}/offer-sales`)
  const header = ['Convidado', 'CPF', 'Valor', 'Pagamento', 'Parcelas', 'Entrada', 'Obs.', 'Data']
  const rows = sales.map((o: any) => [o.guestName, o.cpf ?? '', n(o.value), o.isEntrada ? 'Entrada' : o.installments ? 'Parcelado' : 'À vista', o.installments ? `${o.installments}x` : '', o.isEntrada ? 'Sim' : 'Não', o.notes ?? '', fmtDate(o.createdAt)])
  const totals = ['', '', n(sales.reduce((s: number, o: any) => s + o.value, 0)), '', '', '', '', '']
  const filename = `ofertas_${eventName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`
  if (format === 'csv') { downloadCSV([header, ...rows, totals], `${filename}.csv`); return }
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14); doc.setTextColor(69, 181, 232)
  doc.text(`Ofertas — ${eventName}`, 14, 16)
  doc.setFontSize(9); doc.setTextColor(107, 114, 128)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22)
  autoTable(doc, { startY: 26, head: [header], body: [...rows, totals], styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [69, 181, 232], textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [248, 247, 252] }, didParseCell: (d: any) => { if (d.row.index === rows.length) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [217, 240, 252] } } })
  doc.save(`${filename}.pdf`)
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [selectedEventId, setSelectedEventId] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then(r => r.data),
  })

  const { data: financials = [] } = useQuery<EventFinancial[]>({
    queryKey: ['all-financial'],
    queryFn: () => api.get('/events/all-financial').then(r => r.data),
  })

  const selectedEvent = events.find((e: any) => e.id === selectedEventId)

  async function handleExport(type: 'complete' | 'tickets' | 'offers', format: 'csv' | 'pdf') {
    const key = `${type}-${format}`
    setLoading(key)
    try {
      if (type === 'complete') {
        exportCompleteReport(financials, format)
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

  function ExportButtons({ type, disabled }: { type: 'complete' | 'tickets' | 'offers'; disabled?: boolean }) {
    return (
      <div className="flex gap-2">
        <button onClick={() => handleExport(type, 'csv')} disabled={disabled || loading !== null}
          className="flex items-center gap-2 bg-[#D4EDDA] text-[#155724] px-4 py-2 rounded-full text-sm font-bold hover:bg-[#c3e6cb] transition-colors disabled:opacity-40">
          {loading === `${type}-csv` ? '⏳ Gerando...' : '📊 Planilha (.csv)'}
        </button>
        <button onClick={() => handleExport(type, 'pdf')} disabled={disabled || loading !== null}
          className="flex items-center gap-2 bg-[#FDEDEE] text-[#C0392B] px-4 py-2 rounded-full text-sm font-bold hover:bg-[#fad7da] transition-colors disabled:opacity-40">
          {loading === `${type}-pdf` ? '⏳ Gerando...' : '📄 PDF'}
        </button>
      </div>
    )
  }

  const eventSelect = (
    <div className="mb-4">
      <label className="block text-xs font-bold text-[#6B7280] mb-1">Selecionar evento</label>
      <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
        className="w-full max-w-sm bg-white border border-black/[0.08] text-[#1A1A2E] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE9F8]">
        <option value="">— Selecione um evento —</option>
        {events.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({new Date(e.startDate).toLocaleDateString('pt-BR')})</option>)}
      </select>
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#1A1A2E]">Relatórios</h1>
        <p className="text-sm text-[#6B7280]">Exporte dados de vendas e financeiro em planilha ou PDF</p>
      </div>

      <div className="flex flex-col gap-6">

        {/* ─── Relatório Completo ──────────────────────────────────────────── */}
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#EDE9F8] flex items-center justify-center text-xl shrink-0">📋</div>
            <div>
              <h2 className="font-bold text-[#1A1A2E]">Relatório Completo — Todos os Eventos</h2>
              <p className="text-xs text-[#6B7280]">Nome, data, receita de convites (pagos + cortesias), receita de ofertas (à vista/entrada/parcelado), total de receita, gastos e lucro</p>
            </div>
          </div>

          {/* Preview table */}
          {financials.length > 0 && (
            <div className="bg-[#F8F7FC] rounded-[10px] border border-black/[0.08] overflow-x-auto mb-4">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="bg-[#EDE9F8]">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold text-[#7C5CBF]">Evento</th>
                    <th className="text-left px-3 py-2 font-bold text-[#7C5CBF]">Data</th>
                    <th className="text-right px-3 py-2 font-bold text-[#7C5CBF]">Conv. Pagos</th>
                    <th className="text-right px-3 py-2 font-bold text-[#7C5CBF]">Cortesias</th>
                    <th className="text-right px-3 py-2 font-bold text-[#7C5CBF]">R$ Convites</th>
                    <th className="text-right px-3 py-2 font-bold text-[#7C5CBF]">À Vista</th>
                    <th className="text-right px-3 py-2 font-bold text-[#7C5CBF]">Entrada</th>
                    <th className="text-right px-3 py-2 font-bold text-[#7C5CBF]">Parcelado</th>
                    <th className="text-right px-3 py-2 font-bold text-[#7C5CBF]">R$ Ofertas</th>
                    <th className="text-right px-3 py-2 font-bold text-[#7C5CBF]">Total Receita</th>
                    <th className="text-right px-3 py-2 font-bold text-[#7C5CBF]">Gastos</th>
                    <th className="text-right px-3 py-2 font-bold text-[#7C5CBF]">Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {financials.map(f => (
                    <tr key={f.id} className="border-t border-black/[0.06]">
                      <td className="px-3 py-2 font-bold text-[#1A1A2E] max-w-[140px] truncate">{f.name}</td>
                      <td className="px-3 py-2 text-[#6B7280]">{fmtDate(f.startDate)}</td>
                      <td className="px-3 py-2 text-right text-[#1A1A2E]">{f.ticketSoldQty}</td>
                      <td className="px-3 py-2 text-right text-[#7C5CBF]">{f.courtesyQty}</td>
                      <td className="px-3 py-2 text-right text-[#155724] font-bold">{fmt(f.ticketRevenue)}</td>
                      <td className="px-3 py-2 text-right text-[#6B7280]">{f.offerAvistaCount}x {fmt(f.offerAvistaTotal)}</td>
                      <td className="px-3 py-2 text-right text-[#6B7280]">{f.offerEntradaCount}x {fmt(f.offerEntradaTotal)}</td>
                      <td className="px-3 py-2 text-right text-[#6B7280]">{f.offerParceladoCount}x {fmt(f.offerParceladoTotal)}</td>
                      <td className="px-3 py-2 text-right text-[#0C6E93] font-bold">{fmt(f.offerRevenue)}</td>
                      <td className="px-3 py-2 text-right font-bold text-[#1A1A2E]">{fmt(f.totalRevenue)}</td>
                      <td className="px-3 py-2 text-right text-[#C0392B]">{fmt(f.totalExpenses)}</td>
                      <td className={`px-3 py-2 text-right font-bold ${f.profit >= 0 ? 'text-[#7C5CBF]' : 'text-[#C0392B]'}`}>{fmt(f.profit)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-[#7C5CBF]/20">
                  <tr className="bg-[#EDE9F8]">
                    <td className="px-3 py-2 font-bold text-[#7C5CBF] text-xs uppercase" colSpan={2}>Total</td>
                    <td className="px-3 py-2 text-right font-bold text-[#1A1A2E]">{financials.reduce((s, f) => s + f.ticketSoldQty, 0)}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#7C5CBF]">{financials.reduce((s, f) => s + f.courtesyQty, 0)}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#155724]">{fmt(financials.reduce((s, f) => s + f.ticketRevenue, 0))}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#6B7280]">{financials.reduce((s, f) => s + f.offerAvistaCount, 0)}x {fmt(financials.reduce((s, f) => s + f.offerAvistaTotal, 0))}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#6B7280]">{financials.reduce((s, f) => s + f.offerEntradaCount, 0)}x {fmt(financials.reduce((s, f) => s + f.offerEntradaTotal, 0))}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#6B7280]">{financials.reduce((s, f) => s + f.offerParceladoCount, 0)}x {fmt(financials.reduce((s, f) => s + f.offerParceladoTotal, 0))}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#0C6E93]">{fmt(financials.reduce((s, f) => s + f.offerRevenue, 0))}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#1A1A2E]">{fmt(totalRevenue)}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#C0392B]">{fmt(totalExpenses)}</td>
                    <td className={`px-3 py-2 text-right font-bold text-sm ${totalProfit >= 0 ? 'text-[#7C5CBF]' : 'text-[#C0392B]'}`}>{fmt(totalProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {financials.length === 0
            ? <p className="text-sm text-[#9CA3AF] italic mb-4">Nenhum evento com dados ainda</p>
            : <ExportButtons type="complete" />
          }
        </div>

        {/* ─── Relatório de Convites (por evento) ──────────────────────────── */}
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#EDE9F8] flex items-center justify-center text-xl shrink-0">🎟️</div>
            <div>
              <h2 className="font-bold text-[#1A1A2E]">Relatório de Convites — por Evento</h2>
              <p className="text-xs text-[#6B7280]">Lista detalhada de cada convite vendido (tipo, lote, valor, cortesia)</p>
            </div>
          </div>
          {eventSelect}
          {!selectedEventId
            ? <p className="text-sm text-[#9CA3AF] italic">Selecione um evento para habilitar o download</p>
            : <ExportButtons type="tickets" />
          }
        </div>

        {/* ─── Relatório de Ofertas (por evento) ───────────────────────────── */}
        <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_1px_3px_rgba(124,92,191,0.08)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#D9F0FC] flex items-center justify-center text-xl shrink-0">💰</div>
            <div>
              <h2 className="font-bold text-[#1A1A2E]">Relatório de Ofertas — por Evento</h2>
              <p className="text-xs text-[#6B7280]">Lista de ofertas com CPF, valor, forma de pagamento e observações</p>
            </div>
          </div>
          {eventSelect}
          {!selectedEventId
            ? <p className="text-sm text-[#9CA3AF] italic">Selecione um evento para habilitar o download</p>
            : <ExportButtons type="offers" />
          }
        </div>

      </div>
    </div>
  )
}
