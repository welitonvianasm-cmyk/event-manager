import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// Returns all deadlines for an event: checklist items with dueDate + supplier payment deadlines
router.get('/:id/calendar', async (req: AuthRequest, res: Response) => {
  const event = await prisma.event.findFirst({ where: { id: req.params.id, userId: req.userId! } })
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return }

  const [sections, suppliers] = await Promise.all([
    prisma.checklistSection.findMany({
      where: { eventId: req.params.id },
      include: {
        items: {
          where: { dueDate: { not: null } },
          include: { person: true },
          orderBy: { dueDate: 'asc' },
        },
      },
    }),
    prisma.eventSupplier.findMany({
      where: { eventId: req.params.id, paymentDueDate: { not: null } },
      orderBy: { paymentDueDate: 'asc' },
    }),
  ])

  const checklistDeadlines = sections.flatMap(sec =>
    sec.items.map(item => ({
      id: item.id,
      type: 'CHECKLIST' as const,
      title: item.title,
      section: sec.name,
      date: item.dueDate!,
      status: item.status,
      person: item.person?.name ?? item.assignee ?? null,
    }))
  )

  const supplierDeadlines = suppliers.map(s => ({
    id: s.id,
    type: 'PAGAMENTO' as const,
    title: s.description,
    section: 'Fornecedores',
    date: s.paymentDueDate!,
    status: s.paymentStatus,
    person: s.supplierName ?? null,
  }))

  const all = [...checklistDeadlines, ...supplierDeadlines].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  res.json(all)
})

export default router
