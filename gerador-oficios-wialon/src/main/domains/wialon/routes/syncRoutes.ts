// src/routes/syncRoutes.ts
import { Router } from 'express'
import { handleSincronizarDados } from '../controllers/syncController'

export const syncRoutes = Router()

// POST /api/sincronizar
syncRoutes.post('/', handleSincronizarDados)