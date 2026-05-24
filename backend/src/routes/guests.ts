import { Router, Response } from 'express'
import { z } from 'zod'
import https from 'https'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router({ mergeParams: true })
router.use(requireAuth)

const guestSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
})

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  confirmed: z.boolean().optional(),
  checkedIn: z.boolean().optional(),
})

async function verifyEventOwner(eventId: string, userId: string) {
  return prisma.event.findFirst({ where: { id: eventId, userId } })
}

router.get('/:id/guests', async (req: AuthRequest, res: Response) => {
  const event = await verifyEventOwner(req.params.id, req.userId!)
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return }
  const guests = await prisma.eventGuest.findMany({
    where: { eventId: req.params.id },
    orderBy: { createdAt: 'asc' },
  })
  res.json(guests)
})

router.post('/:id/guests', async (req: AuthRequest, res: Response) => {
  const event = await verifyEventOwner(req.params.id, req.userId!)
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return }
  const parsed = guestSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const guest = await prisma.eventGuest.create({ data: { ...parsed.data, eventId: req.params.id } })
  res.status(201).json(guest)
})

router.patch('/:id/guests/:gid', async (req: AuthRequest, res: Response) => {
  const event = await verifyEventOwner(req.params.id, req.userId!)
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return }
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const guest = await prisma.eventGuest.update({ where: { id: req.params.gid }, data: parsed.data })
  res.json(guest)
})

router.delete('/:id/guests/:gid', async (req: AuthRequest, res: Response) => {
  const event = await verifyEventOwner(req.params.id, req.userId!)
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return }
  await prisma.eventGuest.delete({ where: { id: req.params.gid } })
  res.status(204).send()
})

// ─── Google Sheets import ─────────────────────────────────────────────────────

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      if (resp.statusCode && resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        // Follow redirect
        fetchUrl(resp.headers.location).then(resolve).catch(reject)
        return
      }
      let data = ''
      resp.on('data', chunk => { data += chunk })
      resp.on('end', () => resolve(data))
      resp.on('error', reject)
    }).on('error', reject)
  })
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cols[i] ?? '' })
    return row
  }).filter(row => Object.values(row).some(v => v !== ''))
}

function mapColumn(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k]) return row[k]
  }
  return undefined
}

router.post('/:id/guests/import', async (req: AuthRequest, res: Response) => {
  const event = await verifyEventOwner(req.params.id, req.userId!)
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return }

  const { sheetUrl } = req.body
  if (!sheetUrl || typeof sheetUrl !== 'string') {
    res.status(400).json({ error: 'URL da planilha é obrigatória' }); return
  }

  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) { res.status(400).json({ error: 'URL do Google Sheets inválida' }); return }

  const sheetId = match[1]
  const gidMatch = sheetUrl.match(/gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : '0'
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`

  let csvData: string
  try {
    csvData = await fetchUrl(csvUrl)
  } catch {
    res.status(502).json({ error: 'Não foi possível acessar a planilha. Verifique se ela está compartilhada como pública.' }); return
  }

  const rows = parseCSV(csvData)
  const created: any[] = []
  for (const row of rows) {
    const name = mapColumn(row, ['name', 'nome', 'participante', 'convidado'])
    if (!name) continue
    const phone = mapColumn(row, ['phone', 'telefone', 'celular', 'whatsapp'])
    const email = mapColumn(row, ['email', 'e-mail'])
    const guest = await prisma.eventGuest.create({
      data: { eventId: req.params.id, name, phone, email },
    })
    created.push(guest)
  }
  res.status(201).json({ imported: created.length, guests: created })
})

// ─── CSV export ───────────────────────────────────────────────────────────────

router.get('/:id/guests/export', async (req: AuthRequest, res: Response) => {
  const event = await verifyEventOwner(req.params.id, req.userId!)
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return }
  const guests = await prisma.eventGuest.findMany({
    where: { eventId: req.params.id },
    orderBy: { createdAt: 'asc' },
  })
  const header = 'Nome,Telefone,Email,Confirmado,Credenciado'
  const rows = guests.map(g =>
    [g.name, g.phone ?? '', g.email ?? '', g.confirmed ? 'Sim' : 'Não', g.checkedIn ? 'Sim' : 'Não'].join(',')
  )
  const csv = [header, ...rows].join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="convidados-${req.params.id}.csv"`)
  res.send(csv)
})

export default router
