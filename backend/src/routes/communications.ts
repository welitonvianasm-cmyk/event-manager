import { Router, Response } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'

// Communications module — schema ready, UI pending
const router = Router()
router.use(requireAuth)

const notImplemented = (_req: AuthRequest, res: Response) => {
  res.status(501).json({ error: 'Communications module — UI pending' })
}

router.get('/:id/communications', notImplemented)
router.post('/:id/communications', notImplemented)
router.patch('/:id/communications/:cid', notImplemented)
router.delete('/:id/communications/:cid', notImplemented)

export default router
