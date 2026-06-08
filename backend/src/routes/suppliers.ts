import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

const installmentSchema = z.object({
  number: z.number().int().positive(),
  dueDate: z.string(),
  value: z.number().positive(),
  paid: z.boolean().optional(),
})

const supplierSchema = z.object({
  catalogMaterialId: z.string().optional().nullable(),
  catalogSupplierId: z.string().optional().nullable(),
  category: z.enum(['MATERIAL_EVENTO', 'BRINDES', 'BUFFET', 'ESPACO', 'CAPTACAO_IMAGEM', 'OUTRO']),
  description: z.string().min(1),
  status: z.enum(['PENDENTE', 'NEGOCIANDO', 'CONFIRMADO', 'CANCELADO']).optional(),
  paymentStatus: z.enum(['PENDENTE', 'PARCIAL', 'PAGO']).optional(),
  paymentDueDate: z.string().nullable().optional(),
  paymentType: z.enum(['PIX', 'BOLETO', 'CARTAO']).nullable().optional(),
  responsible: z.string().optional().nullable(),
  responsiblePersonId: z.string().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  supplierPhone: z.string().optional().nullable(),
  supplierContact: z.string().optional().nullable(),
  quantity: z.number().optional().nullable(),
  unitPrice: z.number().optional().nullable(),
  shippingCost: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  installments: z.array(installmentSchema).optional(),
})

async function assertEventOwner(eventId: string, userId: string, res: Response): Promise<boolean> {
  const event = await prisma.event.findFirst({ where: { id: eventId, userId } })
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return false }
  return true
}

const includeAll = {
  catalogMaterial: true,
  catalogSupplier: true,
  responsiblePerson: true,
  installments: { orderBy: { number: 'asc' as const } },
}

router.get('/:id/suppliers', async (req: AuthRequest, res: Response) => {
  if (!await assertEventOwner(req.params.id, req.userId!, res)) return
  const suppliers = await prisma.eventSupplier.findMany({
    where: { eventId: req.params.id },
    include: includeAll,
    orderBy: { createdAt: 'asc' },
  })
  res.json(suppliers)
})

router.get('/:id/suppliers/total', async (req: AuthRequest, res: Response) => {
  if (!await assertEventOwner(req.params.id, req.userId!, res)) return
  const suppliers = await prisma.eventSupplier.findMany({ where: { eventId: req.params.id } })
  const total = suppliers.reduce((sum, s) => sum + (s.quantity ?? 1) * (s.unitPrice ?? 0) + (s.shippingCost ?? 0), 0)
  res.json({ total })
})

router.post('/:id/suppliers', async (req: AuthRequest, res: Response) => {
  if (!await assertEventOwner(req.params.id, req.userId!, res)) return
  const parsed = supplierSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { installments, paymentDueDate, ...rest } = parsed.data
  const supplier = await prisma.eventSupplier.create({
    data: {
      ...rest,
      eventId: req.params.id,
      ...(paymentDueDate ? { paymentDueDate: new Date(paymentDueDate) } : {}),
      ...(installments?.length ? {
        installments: {
          create: installments.map(i => ({ ...i, dueDate: new Date(i.dueDate) })),
        },
      } : {}),
    },
    include: includeAll,
  })
  res.status(201).json(supplier)
})

router.put('/:id/suppliers/:sid', async (req: AuthRequest, res: Response) => {
  if (!await assertEventOwner(req.params.id, req.userId!, res)) return
  const parsed = supplierSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { installments, paymentDueDate, ...rest } = parsed.data

  // Replace all installments when provided
  if (installments !== undefined) {
    await prisma.supplierInstallment.deleteMany({ where: { supplierId: req.params.sid } })
  }

  const updated = await prisma.eventSupplier.update({
    where: { id: req.params.sid },
    data: {
      ...rest,
      ...(paymentDueDate !== undefined ? { paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null } : {}),
      ...(installments?.length ? {
        installments: {
          create: installments.map(i => ({ ...i, dueDate: new Date(i.dueDate) })),
        },
      } : {}),
    },
    include: includeAll,
  })
  res.json(updated)
})

// PATCH a single installment (toggle paid)
router.patch('/:id/suppliers/:sid/installments/:iid', async (req: AuthRequest, res: Response) => {
  if (!await assertEventOwner(req.params.id, req.userId!, res)) return
  const schema = z.object({ paid: z.boolean() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const inst = await prisma.supplierInstallment.update({
    where: { id: req.params.iid },
    data: parsed.data,
  })
  res.json(inst)
})

router.delete('/:id/suppliers/:sid', async (req: AuthRequest, res: Response) => {
  if (!await assertEventOwner(req.params.id, req.userId!, res)) return
  await prisma.eventSupplier.delete({ where: { id: req.params.sid } })
  res.status(204).send()
})

export default router
