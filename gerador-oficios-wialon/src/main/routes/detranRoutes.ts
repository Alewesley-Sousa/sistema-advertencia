// detranRoutes.ts
import { Router } from 'express'
import {
  consultarVeiculoAvulso,
  listarConsultasDetran,
  baixarPdfDetran,
  processarLoteDetran,
  baixarPdfMultaDetran,
  listarMultasDaConsulta,
  statusLoteDetran
} from '../controllers/infracaoDetranController'

export const detranRoutes = Router()

// Ajustado para 'consultar-veiculo'
detranRoutes.post('/consultar', consultarVeiculoAvulso) 

// Ajustado para 'historico'
detranRoutes.get('/historico', listarConsultasDetran) 

detranRoutes.get('/pdf/:id', baixarPdfDetran)

// Ajustado para 'processar-lote' (se o frontend solicitar assim)
detranRoutes.post('/processar-lote', processarLoteDetran)

detranRoutes.get('/consultas/:id/multas', listarMultasDaConsulta)
detranRoutes.get('/multas/:id/pdf', baixarPdfMultaDetran)
detranRoutes.get('/lotes/:id/status', statusLoteDetran)