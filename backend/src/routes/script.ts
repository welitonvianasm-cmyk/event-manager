import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

const itemTypeEnum = z.enum(['CREDENCIAMENTO', 'ABERTURA', 'PALESTRA', 'PITCH', 'REPITCH', 'COFFEE_BREAK', 'ALMOCO', 'QUEBRA_OBJECOES', 'ENCERRAMENTO', 'OUTRO'])

const scriptItemSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  title: z.string().min(1),
  responsible: z.string().optional().nullable(),
  type: itemTypeEnum.optional(),
  notes: z.string().optional().nullable(),
  dayNumber: z.number().int().min(1).optional(),
})

function calcDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diffMin = (eh * 60 + em) - (sh * 60 + sm)
  if (diffMin <= 0) return '—'
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60
  return h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`
}

function withDuration(item: { startTime: string; endTime: string }) {
  return { ...item, duration: calcDuration(item.startTime, item.endTime) }
}

async function assertEventOwner(eventId: string, userId: string, res: Response): Promise<boolean> {
  const event = await prisma.event.findFirst({ where: { id: eventId, userId } })
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return false }
  return true
}

router.get('/:id/script', async (req: AuthRequest, res: Response) => {
  if (!await assertEventOwner(req.params.id, req.userId!, res)) return
  const days = await prisma.scriptDay.findMany({
    where: { eventId: req.params.id },
    include: { items: { orderBy: { order: 'asc' } } },
    orderBy: { dayNumber: 'asc' },
  })
  const result = days.map((d) => ({ ...d, items: d.items.map(withDuration) }))
  res.json(result)
})

router.post('/:id/script/items', async (req: AuthRequest, res: Response) => {
  if (!await assertEventOwner(req.params.id, req.userId!, res)) return
  const parsed = scriptItemSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { dayNumber = 1, ...itemData } = parsed.data
  let scriptDay = await prisma.scriptDay.findUnique({
    where: { eventId_dayNumber: { eventId: req.params.id, dayNumber } },
  })
  if (!scriptDay) {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } })
    scriptDay = await prisma.scriptDay.create({
      data: {
        eventId: req.params.id,
        dayNumber,
        label: (event?.totalDays ?? 1) > 1 ? `Dia ${dayNumber}` : undefined,
      },
    })
  }

  const count = await prisma.scriptItem.count({ where: { scriptDayId: scriptDay.id } })
  const item = await prisma.scriptItem.create({
    data: { ...itemData, scriptDayId: scriptDay.id, order: count, type: itemData.type ?? 'OUTRO' },
  })
  res.status(201).json(withDuration(item))
})

router.put('/:id/script/reorder', async (req: AuthRequest, res: Response) => {
  if (!await assertEventOwner(req.params.id, req.userId!, res)) return
  const schema = z.object({
    dayNumber: z.number().int().min(1),
    itemIds: z.array(z.string()),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { dayNumber, itemIds } = parsed.data
  await Promise.all(itemIds.map((id, order) => prisma.scriptItem.update({ where: { id }, data: { order } })))
  const day = await prisma.scriptDay.findUnique({
    where: { eventId_dayNumber: { eventId: req.params.id, dayNumber } },
    include: { items: { orderBy: { order: 'asc' } } },
  })
  res.json({ ...day, items: day?.items.map(withDuration) ?? [] })
})

router.patch('/:id/script/items/:itemId', async (req: AuthRequest, res: Response) => {
  if (!await assertEventOwner(req.params.id, req.userId!, res)) return
  const parsed = scriptItemSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { dayNumber, ...data } = parsed.data
  const item = await prisma.scriptItem.update({ where: { id: req.params.itemId }, data })
  res.json(withDuration(item))
})

router.delete('/:id/script/items/:itemId', async (req: AuthRequest, res: Response) => {
  if (!await assertEventOwner(req.params.id, req.userId!, res)) return
  await prisma.scriptItem.delete({ where: { id: req.params.itemId } })
  res.status(204).send()
})

router.patch('/:id/script/bulk', async (req: AuthRequest, res: Response) => {
  if (!await assertEventOwner(req.params.id, req.userId!, res)) return
  const schema = z.object({
    updates: z.array(z.object({
      id: z.string(),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      order: z.number().int().optional(),
    })),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  await Promise.all(
    parsed.data.updates.map(({ id, ...data }) =>
      prisma.scriptItem.update({ where: { id }, data })
    )
  )
  res.json({ ok: true })
})

export default router
