import { Router } from 'express'
import { handleWialonWebhook } from '../controllers/webhookController'

export const webhookRoutes = Router()

// Endpoint: POST /api/webhooks/wialon
webhookRoutes.post('/wialon', handleWialonWebhook)