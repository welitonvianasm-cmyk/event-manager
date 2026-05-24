import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

const categoryEnum = z.enum(['MATERIAL_EVENTO', 'BRINDES', 'BUFFET', 'ESPACO', 'CAPTACAO_IMAGEM', 'OUTRO'])

const supplierSchema = z.object({
  name: z.string().min(1),
  category: categoryEnum,
  phone: z.string().optional(),
  email: z.string().email().optional(),
  contactName: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

const materialSchema = z.object({
  name: z.string().min(1),
  category: categoryEnum,
  preferredSupplierId: z.string().optional().nullable(),
  defaultUnitPrice: z.number().optional().nullable(),
  notes: z.string().optional(),
})

// ─── Catalog Suppliers ────────────────────────────────────────────────────────

router.get('/suppliers', async (_req: AuthRequest, res: Response) => {
  const suppliers = await prisma.catalogSupplier.findMany({
    orderBy: { name: 'asc' },
  })
  res.json(suppliers)
})

router.post('/suppliers', async (req: AuthRequest, res: Response) => {
  const parsed = supplierSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const supplier = await prisma.catalogSupplier.create({ data: { ...parsed.data, userId: req.userId! } })
  res.status(201).json(supplier)
})

router.put('/suppliers/:id', async (req: AuthRequest, res: Response) => {
  const exists = await prisma.catalogSupplier.findFirst({ where: { id: req.params.id } })
  if (!exists) { res.status(404).json({ error: 'Fornecedor não encontrado' }); return }
  if (exists.userId !== req.userId! && req.userRole !== 'MASTER') {
    res.status(403).json({ error: 'Sem permissão para editar este fornecedor' }); return
  }
  const parsed = supplierSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const updated = await prisma.catalogSupplier.update({ where: { id: req.params.id }, data: parsed.data })
  res.json(updated)
})

router.delete('/suppliers/:id', async (req: AuthRequest, res: Response) => {
  const exists = await prisma.catalogSupplier.findFirst({ where: { id: req.params.id } })
  if (!exists) { res.status(404).json({ error: 'Fornecedor não encontrado' }); return }
  if (exists.userId !== req.userId! && req.userRole !== 'MASTER') {
    res.status(403).json({ error: 'Sem permissão para excluir este fornecedor' }); return
  }
  await prisma.catalogSupplier.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// ─── Catalog Materials ────────────────────────────────────────────────────────

router.get('/materials', async (_req: AuthRequest, res: Response) => {
  const materials = await prisma.catalogMaterial.findMany({
    include: { preferredSupplier: true },
    orderBy: { name: 'asc' },
  })
  res.json(materials)
})

router.post('/materials', async (req: AuthRequest, res: Response) => {
  const parsed = materialSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const material = await prisma.catalogMaterial.create({ data: { ...parsed.data, userId: req.userId! } })
  res.status(201).json(material)
})

router.put('/materials/:id', async (req: AuthRequest, res: Response) => {
  const exists = await prisma.catalogMaterial.findFirst({ where: { id: req.params.id } })
  if (!exists) { res.status(404).json({ error: 'Material não encontrado' }); return }
  if (exists.userId !== req.userId! && req.userRole !== 'MASTER') {
    res.status(403).json({ error: 'Sem permissão para editar este material' }); return
  }
  const parsed = materialSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const updated = await prisma.catalogMaterial.update({ where: { id: req.params.id }, data: parsed.data })
  res.json(updated)
})

router.delete('/materials/:id', async (req: AuthRequest, res: Response) => {
  const exists = await prisma.catalogMaterial.findFirst({ where: { id: req.params.id } })
  if (!exists) { res.status(404).json({ error: 'Material não encontrado' }); return }
  if (exists.userId !== req.userId! && req.userRole !== 'MASTER') {
    res.status(403).json({ error: 'Sem permissão para excluir este material' }); return
  }
  await prisma.catalogMaterial.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
