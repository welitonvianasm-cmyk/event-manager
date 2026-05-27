import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// ─── helpers ──────────────────────────────────────────────────────────────────

async function eventBelongsToUser(eventId: string, userId: string) {
  const ev = await prisma.event.findFirst({ where: { id: eventId, userId } })
  return !!ev
}

// ─── Ticket Types ─────────────────────────────────────────────────────────────

const ticketTypeSchema = z.object({
  name: z.string().min(1),
  lot: z.number().int().min(1).max(5).default(1),
  price: z.number().min(0),
  isCourtesy: z.boolean().default(false),
})

router.get('/:id/ticket-types', async (req: AuthRequest, res: Response) => {
  if (!(await eventBelongsToUser(req.params.id, req.userId!))) {
    res.status(404).json({ error: 'Evento não encontrado' }); return
  }
  const types = await prisma.ticketType.findMany({
    where: { eventId: req.params.id },
    orderBy: [{ lot: 'asc' }, { name: 'asc' }],
  })
  res.json(types)
})

router.post('/:id/ticket-types', async (req: AuthRequest, res: Response) => {
  if (!(await eventBelongsToUser(req.params.id, req.userId!))) {
    res.status(404).json({ error: 'Evento não encontrado' }); return
  }
  const parsed = ticketTypeSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { isCourtesy, price, ...rest } = parsed.data
  const tt = await prisma.ticketType.create({
    data: { eventId: req.params.id, isCourtesy, price: isCourtesy ? 0 : price, ...rest },
  })
  res.status(201).json(tt)
})

router.put('/:id/ticket-types/:tid', async (req: AuthRequest, res: Response) => {
  if (!(await eventBelongsToUser(req.params.id, req.userId!))) {
    res.status(404).json({ error: 'Evento não encontrado' }); return
  }
  const parsed = ticketTypeSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { isCourtesy, price, ...rest } = parsed.data
  const updated = await prisma.ticketType.update({
    where: { id: req.params.tid },
    data: {
      ...rest,
      ...(isCourtesy !== undefined ? { isCourtesy } : {}),
      ...(price !== undefined || isCourtesy ? { price: isCourtesy ? 0 : (price ?? 0) } : {}),
    },
  })
  res.json(updated)
})

router.delete('/:id/ticket-types/:tid', async (req: AuthRequest, res: Response) => {
  if (!(await eventBelongsToUser(req.params.id, req.userId!))) {
    res.status(404).json({ error: 'Evento não encontrado' }); return
  }
  await prisma.ticketType.delete({ where: { id: req.params.tid } })
  res.status(204).send()
})

// ─── Ticket Sales ─────────────────────────────────────────────────────────────

const ticketSaleSchema = z.object({
  ticketTypeId: z.string(),
  guestId: z.string().optional(),
  guestName: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
})

router.get('/:id/ticket-sales', async (req: AuthRequest, res: Response) => {
  if (!(await eventBelongsToUser(req.params.id, req.userId!))) {
    res.status(404).json({ error: 'Evento não encontrado' }); return
  }
  const sales = await prisma.ticketSale.findMany({
    where: { eventId: req.params.id },
    include: { ticketType: true, guest: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(sales)
})

router.post('/:id/ticket-sales', async (req: AuthRequest, res: Response) => {
  if (!(await eventBelongsToUser(req.params.id, req.userId!))) {
    res.status(404).json({ error: 'Evento não encontrado' }); return
  }
  const parsed = ticketSaleSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { ticketTypeId, guestId, guestName, quantity, unitPrice } = parsed.data
  const sale = await prisma.ticketSale.create({
    data: {
      eventId: req.params.id,
      ticketTypeId,
      guestId: guestId ?? null,
      guestName,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
    },
    include: { ticketType: true, guest: true },
  })
  res.status(201).json(sale)
})

router.delete('/:id/ticket-sales/:sid', async (req: AuthRequest, res: Response) => {
  if (!(await eventBelongsToUser(req.params.id, req.userId!))) {
    res.status(404).json({ error: 'Evento não encontrado' }); return
  }
  await prisma.ticketSale.delete({ where: { id: req.params.sid } })
  res.status(204).send()
})

// ─── Offer Sales ──────────────────────────────────────────────────────────────

const offerSaleSchema = z.object({
  guestId: z.string().optional(),
  guestName: z.string().min(1),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  address: z.string().optional(),
  value: z.number().min(0),
  installments: z.number().int().min(1).optional(),
  isEntrada: z.boolean().default(false),
  notes: z.string().optional(),
})

router.get('/:id/offer-sales', async (req: AuthRequest, res: Response) => {
  if (!(await eventBelongsToUser(req.params.id, req.userId!))) {
    res.status(404).json({ error: 'Evento não encontrado' }); return
  }
  const sales = await prisma.offerSale.findMany({
    where: { eventId: req.params.id },
    include: { guest: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(sales)
})

router.post('/:id/offer-sales', async (req: AuthRequest, res: Response) => {
  if (!(await eventBelongsToUser(req.params.id, req.userId!))) {
    res.status(404).json({ error: 'Evento não encontrado' }); return
  }
  const parsed = offerSaleSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { guestId, ...rest } = parsed.data
  const sale = await prisma.offerSale.create({
    data: { eventId: req.params.id, guestId: guestId ?? null, ...rest },
    include: { guest: true },
  })
  res.status(201).json(sale)
})

router.patch('/:id/offer-sales/:oid', async (req: AuthRequest, res: Response) => {
  if (!(await eventBelongsToUser(req.params.id, req.userId!))) {
    res.status(404).json({ error: 'Evento não encontrado' }); return
  }
  const parsed = offerSaleSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { guestId, ...rest } = parsed.data
  const updated = await prisma.offerSale.update({
    where: { id: req.params.oid },
    data: { ...rest, ...(guestId !== undefined ? { guestId } : {}) },
    include: { guest: true },
  })
  res.json(updated)
})

router.delete('/:id/offer-sales/:oid', async (req: AuthRequest, res: Response) => {
  if (!(await eventBelongsToUser(req.params.id, req.userId!))) {
    res.status(404).json({ error: 'Evento não encontrado' }); return
  }
  await prisma.offerSale.delete({ where: { id: req.params.oid } })
  res.status(204).send()
})

// ─── Sales Summary ────────────────────────────────────────────────────────────

router.get('/:id/sales-summary', async (req: AuthRequest, res: Response) => {
  if (!(await eventBelongsToUser(req.params.id, req.userId!))) {
    res.status(404).json({ error: 'Evento não encontrado' }); return
  }

  const [ticketSales, offerSales, suppliers] = await Promise.all([
    prisma.ticketSale.findMany({ where: { eventId: req.params.id } }),
    prisma.offerSale.findMany({ where: { eventId: req.params.id } }),
    prisma.eventSupplier.findMany({ where: { eventId: req.params.id } }),
  ])

  const ticketRevenue = ticketSales.reduce((s, t) => s + t.totalPrice, 0)
  const offerRevenue = offerSales.reduce((s, o) => s + o.value, 0)
  const totalExpenses = suppliers.reduce((s, sup) => {
    const qty = sup.quantity ?? 1
    const price = sup.unitPrice ?? 0
    return s + qty * price
  }, 0)

  res.json({
    ticketRevenue,
    offerRevenue,
    totalRevenue: ticketRevenue + offerRevenue,
    totalExpenses,
    ticketCount: ticketSales.reduce((s, t) => s + t.quantity, 0),
    offerCount: offerSales.length,
    courtesyCount: ticketSales.filter(t => t.unitPrice === 0).reduce((s, t) => s + t.quantity, 0),
  })
})

export default router
