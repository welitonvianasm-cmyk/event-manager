import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', async (req: AuthRequest, res: Response) => {
  const templates = await prisma.eventTemplate.findMany({
    where: { userId: req.userId! },
    include: {
      sections: { include: { items: true }, orderBy: { order: 'asc' } },
      scriptDays: { include: { items: true }, orderBy: { dayNumber: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(templates)
})

const templateSchema = z.object({
  name: z.string().min(2),
  eventType: z.enum(['PRESENCIAL', 'ONLINE', 'HIBRIDO']),
  totalDays: z.number().int().min(1).default(1),
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = templateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const template = await prisma.eventTemplate.create({ data: { ...parsed.data, userId: req.userId! } })
  res.status(201).json(template)
})

// Save event as template
router.post('/from-event/:eventId', async (req: AuthRequest, res: Response) => {
  const event = await prisma.event.findFirst({
    where: { id: req.params.eventId, userId: req.userId! },
    include: {
      checklistSections: { include: { items: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
      scriptDays: { include: { items: { orderBy: { order: 'asc' } } }, orderBy: { dayNumber: 'asc' } },
    },
  })
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return }

  const nameSchema = z.object({ name: z.string().min(2) })
  const parsed = nameSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const template = await prisma.eventTemplate.create({
    data: { name: parsed.data.name, eventType: event.eventType, totalDays: event.totalDays, userId: req.userId! },
  })

  for (const [si, sec] of event.checklistSections.entries()) {
    const tSec = await prisma.templateSection.create({
      data: { templateId: template.id, name: sec.name, order: si },
    })
    for (const [ii, item] of sec.items.entries()) {
      await prisma.templateItem.create({
        data: { sectionId: tSec.id, title: item.title, description: item.description, order: ii },
      })
    }
  }

  for (const day of event.scriptDays) {
    const tDay = await prisma.templateScriptDay.create({
      data: { templateId: template.id, dayNumber: day.dayNumber, label: day.label },
    })
    for (const [ii, item] of day.items.entries()) {
      await prisma.templateScriptItem.create({
        data: {
          scriptDayId: tDay.id,
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

  const full = await prisma.eventTemplate.findUnique({
    where: { id: template.id },
    include: { sections: { include: { items: true } }, scriptDays: { include: { items: true } } },
  })
  res.status(201).json(full)
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const exists = await prisma.eventTemplate.findFirst({ where: { id: req.params.id, userId: req.userId! } })
  if (!exists) { res.status(404).json({ error: 'Template não encontrado' }); return }
  await prisma.eventTemplate.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
