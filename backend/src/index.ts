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

const app = express()
const PORT = process.env.PORT ?? 3001
const CORS_ORIGIN = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',')

app.use(cors({ origin: CORS_ORIGIN, credentials: true }))
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/events', eventRoutes)
app.use('/events', checklistRoutes)
app.use('/events', supplierRoutes)
app.use('/events', scriptRoutes)
app.use('/events', communicationRoutes)
app.use('/events', peopleRoutes)
app.use('/events', calendarRoutes)
app.use('/catalog', catalogRoutes)
app.use('/templates', templateRoutes)

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => console.log(`Backend rodando em http://localhost:${PORT}`))
