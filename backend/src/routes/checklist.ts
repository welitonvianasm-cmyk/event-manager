import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

async function assertOwner(eventId: string, userId: string, res: Response): Promise<boolean> {
  const event = await prisma.event.findFirst({ where: { id: eventId, userId } })
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return false }
  return true
}

// GET all sections with items
router.get('/:id/checklist', async (req: AuthRequest, res: Response) => {
  if (!await assertOwner(req.params.id, req.userId!, res)) return
  const sections = await prisma.checklistSection.findMany({
    where: { eventId: req.params.id },
    include: { items: { include: { person: true }, orderBy: { order: 'asc' } } },
    orderBy: { order: 'asc' },
  })
  res.json(sections)
})

// POST add a new section
router.post('/:id/checklist/sections', async (req: AuthRequest, res: Response) => {
  if (!await assertOwner(req.params.id, req.userId!, res)) return
  const schema = z.object({ name: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const count = await prisma.checklistSection.count({ where: { eventId: req.params.id } })
  const section = await prisma.checklistSection.create({
    data: { eventId: req.params.id, name: parsed.data.name, order: count },
    include: { items: true },
  })
  res.status(201).json(section)
})

// PUT rename a section
router.put('/:id/checklist/sections/:sectionId', async (req: AuthRequest, res: Response) => {
  if (!await assertOwner(req.params.id, req.userId!, res)) return
  const schema = z.object({ name: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const section = await prisma.checklistSection.update({
    where: { id: req.params.sectionId },
    data: { name: parsed.data.name },
    include: { items: true },
  })
  res.json(section)
})

// DELETE a section (and all its items via cascade)
router.delete('/:id/checklist/sections/:sectionId', async (req: AuthRequest, res: Response) => {
  if (!await assertOwner(req.params.id, req.userId!, res)) return
  await prisma.checklistSection.delete({ where: { id: req.params.sectionId } })
  res.status(204).send()
})

// POST add item to a section
router.post('/:id/checklist/sections/:sectionId/items', async (req: AuthRequest, res: Response) => {
  if (!await assertOwner(req.params.id, req.userId!, res)) return
  const schema = z.object({ title: z.string().min(1), description: z.string().optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const count = await prisma.checklistItem.count({ where: { sectionId: req.params.sectionId } })
  const item = await prisma.checklistItem.create({
    data: { ...parsed.data, sectionId: req.params.sectionId, order: count },
    include: { person: true },
  })
  res.status(201).json(item)
})

// PATCH update item (status, dueDate, personId, assignee)
router.patch('/:id/checklist/:itemId', async (req: AuthRequest, res: Response) => {
  if (!await assertOwner(req.params.id, req.userId!, res)) return
  const schema = z.object({
    status: z.enum(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO']).optional(),
    dueDate: z.string().nullable().optional(),
    personId: z.string().nullable().optional(),
    assignee: z.string().nullable().optional(),
    title: z.string().min(1).optional(),
    notes: z.string().nullable().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { dueDate, ...rest } = parsed.data
  const item = await prisma.checklistItem.update({
    where: { id: req.params.itemId },
    data: {
      ...rest,
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
    },
    include: { person: true },
  })
  res.json(item)
})

// DELETE item
router.delete('/:id/checklist/:itemId', async (req: AuthRequest, res: Response) => {
  if (!await assertOwner(req.params.id, req.userId!, res)) return
  await prisma.checklistItem.delete({ where: { id: req.params.itemId } })
  res.status(204).send()
})

export default router
