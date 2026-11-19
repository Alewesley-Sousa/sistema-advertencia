import { Router } from 'express'
import { detranRoutes } from '../domains/detran/routes/detranRoutes'

export const routes = Router()

// Mantém o prefixo /detran (contrato de URL usado pelo front)
routes.use('/detran', detranRoutes)
