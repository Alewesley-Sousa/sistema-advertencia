import { Router } from 'express'
import { infracaoRoutes } from '../domains/infracoes/routes/infracaoRoutes'
import { configuracoesRoutes } from '../domains/configuracoes/routes/configuracoesRoutes'
import { syncRoutes } from '../domains/wialon/routes/syncRoutes'
import { devRoutes } from '../domains/infracoes/routes/devRoutes'

export const routes = Router()

// Agrupamento dos módulos com prefixos de URL
routes.use('/infracoes', infracaoRoutes)
routes.use('/configuracoes', configuracoesRoutes)
routes.use('/sincronizar', syncRoutes)
// Rotas de mock/preview existem apenas fora de produção
if (process.env.NODE_ENV !== 'production') {
  routes.use('/dev', devRoutes)
}