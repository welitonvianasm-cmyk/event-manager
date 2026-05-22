import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

const personSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().optional(),
})

async function assertOwner(eventId: string, userId: string, res: Response): Promise<boolean> {
  const event = await prisma.event.findFirst({ where: { id: eventId, userId } })
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return false }
  return true
}

router.get('/:id/people', async (req: AuthRequest, res: Response) => {
  if (!await assertOwner(req.params.id, req.userId!, res)) return
  const people = await prisma.eventPerson.findMany({
    where: { eventId: req.params.id },
    orderBy: { name: 'asc' },
  })
  res.json(people)
})

router.post('/:id/people', async (req: AuthRequest, res: Response) => {
  if (!await assertOwner(req.params.id, req.userId!, res)) return
  const parsed = personSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { email, ...rest } = parsed.data
  const person = await prisma.eventPerson.create({
    data: { ...rest, email: email || undefined, eventId: req.params.id },
  })
  res.status(201).json(person)
})

router.put('/:id/people/:personId', async (req: AuthRequest, res: Response) => {
  if (!await assertOwner(req.params.id, req.userId!, res)) return
  const parsed = personSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { email, ...rest } = parsed.data
  const person = await prisma.eventPerson.update({
    where: { id: req.params.personId },
    data: { ...rest, ...(email !== undefined ? { email: email || null } : {}) },
  })
  res.json(person)
})

router.delete('/:id/people/:personId', async (req: AuthRequest, res: Response) => {
  if (!await assertOwner(req.params.id, req.userId!, res)) return
  await prisma.eventPerson.delete({ where: { id: req.params.personId } })
  res.status(204).send()
})

export default router
