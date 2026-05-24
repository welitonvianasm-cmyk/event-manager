import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'
import eventRoutes from './routes/events'
import checklistRoutes from './routes/checklist'
import supplierRoutes from './routes/suppliers'
import scriptRoutes from './routes/script'
import catalogRoutes from './routes/catalog'
import templateRoutes from './routes/templates'
import communicationRoutes from './routes/communications'
import peopleRoutes from './routes/people'
import calendarRoutes from './routes/calendar'
import guestRoutes from './routes/guests'
import adminRoutes from './routes/admin'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/events', eventRoutes)
app.use('/events', checklistRoutes)
app.use('/events', supplierRoutes)
app.use('/events', scriptRoutes)
app.use('/events', communicationRoutes)
app.use('/events', peopleRoutes)
app.use('/events', calendarRoutes)
app.use('/events', guestRoutes)
app.use('/catalog', catalogRoutes)
app.use('/templates', templateRoutes)
app.use('/admin', adminRoutes)

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => console.log(`Backend rodando em http://localhost:${PORT}`))
