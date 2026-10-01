import { Router } from 'express'
import { configuracoesController } from '../controllers/configuracoesController'
export const configuracoesRoutes = Router()


configuracoesRoutes.get('/', configuracoesController.listar)
configuracoesRoutes.post('/', configuracoesController.salvar)
configuracoesRoutes.delete('/:chave', configuracoesController.deletar)
