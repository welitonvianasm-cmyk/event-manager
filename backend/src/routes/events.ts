import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { getChecklistSections, defaultScriptPresencial, defaultScriptOnline, EventTypeStr } from '../lib/event-data'

const router = Router()
router.use(requireAuth)

const eventSchema = z.object({
  name: z.string().min(2),
  eventType: z.enum(['PRESENCIAL', 'ONLINE', 'HIBRIDO']),
  totalDays: z.number().int().min(1).default(1),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string().optional(),
  onlineUrl: z.string().optional(),
  participants: z.number().int().optional(),
  templateId: z.string().optional(),
  status: z.enum(['RASCUNHO', 'EM_ANDAMENTO', 'CONCLUIDO']).optional(),
})

// ─── Aggregate financial summary (all events) ────────────────────────────────
// NOTE: must be before /:id to avoid route conflict

router.get('/all-financial', async (req: AuthRequest, res: Response) => {
  const events = await prisma.event.findMany({
    where: { userId: req.userId! },
    select: { id: true, name: true, startDate: true },
    orderBy: { startDate: 'asc' },
  })

  const summaries = await Promise.all(events.map(async (event) => {
    const [ticketSales, offerSales, suppliers] = await Promise.all([
      prisma.ticketSale.findMany({ where: { eventId: event.id } }),
      prisma.offerSale.findMany({ where: { eventId: event.id } }),
      prisma.eventSupplier.findMany({ where: { eventId: event.id } }),
    ])
    const ticketRevenue = ticketSales.reduce((s, t) => s + t.totalPrice, 0)
    const ticketSoldQty = ticketSales.filter(t => t.unitPrice > 0).reduce((s, t) => s + t.quantity, 0)
    const courtesyQty = ticketSales.filter(t => t.unitPrice === 0).reduce((s, t) => s + t.quantity, 0)

    const avistaOffers = offerSales.filter(o => !o.isEntrada && !o.installments)
    const entradaOffers = offerSales.filter(o => o.isEntrada)
    const parceladoOffers = offerSales.filter(o => !o.isEntrada && !!o.installments)
    const offerRevenue = offerSales.reduce((s, o) => s + o.value, 0)

    const totalExpenses = suppliers.reduce((s, sup) => s + (sup.quantity ?? 1) * (sup.unitPrice ?? 0) + (sup.shippingCost ?? 0), 0)
    const totalRevenue = ticketRevenue + offerRevenue

    return {
      id: event.id, name: event.name, startDate: event.startDate,
      ticketRevenue, ticketSoldQty, courtesyQty,
      offerRevenue,
      offerCount: offerSales.length,
      offerAvistaCount: avistaOffers.length,
      offerAvistaTotal: avistaOffers.reduce((s, o) => s + o.value, 0),
      offerEntradaCount: entradaOffers.length,
      offerEntradaTotal: entradaOffers.reduce((s, o) => s + o.value, 0),
      offerParceladoCount: parceladoOffers.length,
      offerParceladoTotal: parceladoOffers.reduce((s, o) => s + o.value, 0),
      totalRevenue, totalExpenses, profit: totalRevenue - totalExpenses,
    }
  }))

  res.json(summaries)
})

router.get('/', async (req: AuthRequest, res: Response) => {
  const events = await prisma.event.findMany({
    where: { userId: req.userId! },
    include: {
      checklistSections: { include: { items: true } },
      _count: { select: { eventSuppliers: true, scriptDays: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(events)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = eventSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }
  const { name, eventType, totalDays, startDate, endDate, location, onlineUrl, participants, templateId } = parsed.data

  const event = await prisma.event.create({
    data: {
      userId: req.userId!,
      name,
      eventType,
      totalDays,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      location,
      onlineUrl,
      participants,
      templateId,
    },
  })

  if (templateId) {
    // Clone from template
    const template = await prisma.eventTemplate.findUnique({
      where: { id: templateId },
      include: {
        sections: { include: { items: true } },
        scriptDays: { include: { items: true } },
      },
    })
    if (template) {
      for (const [si, sec] of template.sections.entries()) {
        const section = await prisma.checklistSection.create({
          data: { eventId: event.id, name: sec.name, order: si },
        })
        for (const [ii, item] of sec.items.entries()) {
          await prisma.checklistItem.create({
            data: { sectionId: section.id, title: item.title, description: item.description, order: ii },
          })
        }
      }
      for (const day of template.scriptDays) {
        const scriptDay = await prisma.scriptDay.create({
          data: { eventId: event.id, dayNumber: day.dayNumber, label: day.label },
        })
        for (const [ii, item] of day.items.entries()) {
          await prisma.scriptItem.create({
            data: {
              scriptDayId: scriptDay.id,
              order: ii,
              startTime: item.startTime,
              endTime: item.endTime,
              title: item.title,
              responsible: item.responsible,
              type: item.type,
              notes: item.notes,
            },
          })
        }
      }
    }
  } else {
    // Generate checklist from event type + totalDays
    const sections = getChecklistSections(eventType as EventTypeStr, totalDays)
    for (const [si, sec] of sections.entries()) {
      const section = await prisma.checklistSection.create({
        data: { eventId: event.id, name: sec.name, order: si },
      })
      for (const [ii, title] of sec.items.entries()) {
        await prisma.checklistItem.create({
          data: { sectionId: section.id, title, order: ii },
        })
      }
    }

    // Generate default script days
    const defaultScript = eventType === 'ONLINE' ? defaultScriptOnline : defaultScriptPresencial
    for (let day = 1; day <= totalDays; day++) {
      const scriptDay = await prisma.scriptDay.create({
        data: {
          eventId: event.id,
          dayNumber: day,
          label: totalDays > 1 ? `Dia ${day}` : undefined,
        },
      })
      for (const [ii, item] of defaultScript.entries()) {
        await prisma.scriptItem.create({
          data: {
            scriptDayId: scriptDay.id,
            order: ii,
            startTime: item.startTime,
            endTime: item.endTime,
            title: item.title,
            type: item.type,
          },
        })
      }
    }
  }

  const full = await prisma.event.findUnique({
    where: { id: event.id },
    include: { checklistSections: { include: { items: true } }, scriptDays: { include: { items: true } } },
  })
  res.status(201).json(full)
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const event = await prisma.event.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: {
      checklistSections: { include: { items: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
      eventSuppliers: true,
      scriptDays: { include: { items: { orderBy: { order: 'asc' } } }, orderBy: { dayNumber: 'asc' } },
    },
  })
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return }
  res.json(event)
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const exists = await prisma.event.findFirst({ where: { id: req.params.id, userId: req.userId! } })
  if (!exists) { res.status(404).json({ error: 'Evento não encontrado' }); return }

  const parsed = eventSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { startDate, endDate, ...rest } = parsed.data
  const updated = await prisma.event.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
    },
  })

  // Sync script days when totalDays changed
  if (parsed.data.totalDays !== undefined && parsed.data.totalDays !== exists.totalDays) {
    const newTotal = parsed.data.totalDays
    const oldTotal = exists.totalDays
    const eventType = (parsed.data.eventType ?? exists.eventType) as string
    const defaultScript = eventType === 'ONLINE' ? defaultScriptOnline : defaultScriptPresencial

    if (newTotal > oldTotal) {
      // Going multi-day: add label to day 1 if it didn't have one
      if (oldTotal === 1) {
        await prisma.scriptDay.updateMany({
          where: { eventId: req.params.id, dayNumber: 1 },
          data: { label: 'Dia 1' },
        })
      }
      // Create missing days with default script
      for (let day = oldTotal + 1; day <= newTotal; day++) {
        const existing = await prisma.scriptDay.findUnique({
          where: { eventId_dayNumber: { eventId: req.params.id, dayNumber: day } },
        })
        if (!existing) {
          const scriptDay = await prisma.scriptDay.create({
            data: { eventId: req.params.id, dayNumber: day, label: `Dia ${day}` },
          })
          for (const [ii, item] of defaultScript.entries()) {
            await prisma.scriptItem.create({
              data: { scriptDayId: scriptDay.id, order: ii, startTime: item.startTime, endTime: item.endTime, title: item.title, type: item.type },
            })
          }
        }
      }
    } else {
      // Remove extra days (ScriptItems cascade automatically)
      await prisma.scriptDay.deleteMany({
        where: { eventId: req.params.id, dayNumber: { gt: newTotal } },
      })
      // Back to single day: clear label
      if (newTotal === 1) {
        await prisma.scriptDay.updateMany({
          where: { eventId: req.params.id, dayNumber: 1 },
          data: { label: null },
        })
      }
    }
  }

  res.json(updated)
})

// ─── NPS Pós-Evento ───────────────────────────────────────────────────────────

const npsSchema = z.object({
  npsFormUrl: z.string().nullable().optional(),
  npsOverallRating: z.number().min(0).max(10).nullable().optional(),
  npsSatisfaction: z.number().min(0).max(10).nullable().optional(),
})

router.patch('/:id/nps', async (req: AuthRequest, res: Response) => {
  const exists = await prisma.event.findFirst({ where: { id: req.params.id, userId: req.userId! } })
  if (!exists) { res.status(404).json({ error: 'Evento não encontrado' }); return }
  const parsed = npsSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const updated = await prisma.event.update({ where: { id: req.params.id }, data: parsed.data })
  res.json(updated)
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const exists = await prisma.event.findFirst({ where: { id: req.params.id, userId: req.userId! } })
  if (!exists) { res.status(404).json({ error: 'Evento não encontrado' }); return }
  await prisma.event.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
