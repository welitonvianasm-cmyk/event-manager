import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import prisma from '../lib/prisma'

const router = Router()
const MASTER_EMAIL = 'welitonviana.sm@gmail.com'

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }
  const { name, email, password } = parsed.data
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    res.status(409).json({ error: 'E-mail já cadastrado' })
    return
  }
  const hash = await bcrypt.hash(password, 10)
  const isMaster = email === MASTER_EMAIL
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      role: isMaster ? 'MASTER' : 'CLIENT',
      status: isMaster ? 'APROVADO' : 'PENDENTE',
    },
  })

  if (!isMaster) {
    res.status(201).json({ message: 'Cadastro realizado. Aguarde a aprovação do administrador.' })
    return
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET ?? 'secret',
    { expiresIn: '7d' }
  )
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } })
})

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }
  const { email, password } = parsed.data
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Credenciais inválidas' })
    return
  }

  // Bootstrap: auto-upgrade master email if role wasn't set correctly (first migration)
  if (user.email === MASTER_EMAIL && user.role !== 'MASTER') {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'MASTER', status: 'APROVADO' },
    })
  }

  if (user.role !== 'MASTER' && user.status !== 'APROVADO') {
    res.status(403).json({ error: 'Aguardando aprovação do administrador' })
    return
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET ?? 'secret',
    { expiresIn: '7d' }
  )
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } })
})

export default router
