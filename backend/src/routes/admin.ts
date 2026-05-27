import { Router, Response } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireMaster } from '../middleware/requireMaster'

const router = Router()
router.use(requireAuth)
router.use(requireMaster)

router.get('/users', async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json(users)
})

router.patch('/users/:id/approve', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return }
  if (user.role === 'MASTER') { res.status(400).json({ error: 'Não é possível modificar o master' }); return }
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: 'APROVADO' },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  })
  res.json(updated)
})

router.patch('/users/:id/revoke', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return }
  if (user.role === 'MASTER') { res.status(400).json({ error: 'Não é possível modificar o master' }); return }
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: 'REVOGADO' },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  })
  res.json(updated)
})

router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return }
  if (user.role === 'MASTER') { res.status(400).json({ error: 'Não é possível excluir o master' }); return }

  await prisma.$transaction(async (tx) => {
    // Null out catalog references in any event supplier before deleting catalog items
    const supplierIds = (await tx.catalogSupplier.findMany({ where: { userId: req.params.id }, select: { id: true } })).map(s => s.id)
    const materialIds = (await tx.catalogMaterial.findMany({ where: { userId: req.params.id }, select: { id: true } })).map(m => m.id)
    if (supplierIds.length) await tx.eventSupplier.updateMany({ where: { catalogSupplierId: { in: supplierIds } }, data: { catalogSupplierId: null } })
    if (materialIds.length) await tx.eventSupplier.updateMany({ where: { catalogMaterialId: { in: materialIds } }, data: { catalogMaterialId: null } })
    await tx.catalogMaterial.deleteMany({ where: { userId: req.params.id } })
    await tx.catalogSupplier.deleteMany({ where: { userId: req.params.id } })
    // Sales records don't cascade automatically from user — delete before events
    await tx.offerSale.deleteMany({ where: { event: { userId: req.params.id } } })
    await tx.ticketSale.deleteMany({ where: { event: { userId: req.params.id } } })
    await tx.ticketType.deleteMany({ where: { event: { userId: req.params.id } } })
    // Events and templates cascade to their children automatically
    await tx.event.deleteMany({ where: { userId: req.params.id } })
    await tx.eventTemplate.deleteMany({ where: { userId: req.params.id } })
    await tx.user.delete({ where: { id: req.params.id } })
  })

  res.status(204).send()
})

router.post('/impersonate/:userId', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: { id: true, name: true, email: true, role: true, status: true },
  })
  if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return }
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET ?? 'secret',
    { expiresIn: '7d' }
  )
  res.json({ token, user })
})

export default router
