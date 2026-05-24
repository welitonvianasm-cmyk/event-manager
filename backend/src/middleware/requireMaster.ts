import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'

export function requireMaster(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'MASTER') {
    res.status(403).json({ error: 'Acesso restrito ao administrador' })
    return
  }
  next()
}
