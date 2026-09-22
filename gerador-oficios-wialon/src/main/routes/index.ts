import { Router } from 'express'
import { webhookRoutes } from './webhookRoutes'
import { infracaoRoutes } from './infracaoRoutes'
import { configuracoesRoutes } from './configuracoesRoutes'
import { syncRoutes } from './syncRoutes'
import { detranRoutes } from './detranRoutes'

export const routes = Router()

// Agrupamento dos módulos com prefixos de URL
routes.use('/webhooks', webhookRoutes)
routes.use('/infracoes', infracaoRoutes)
routes.use('/configuracoes', configuracoesRoutes)
routes.use('/sincronizar', syncRoutes)
routes.use('/detran', detranRoutes)