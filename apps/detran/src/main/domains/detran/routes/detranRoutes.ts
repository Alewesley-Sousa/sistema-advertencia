// detranRoutes.ts
import { Router } from 'express'
import {
  consultarVeiculoAvulso,
  listarConsultasDetran,
  obterRelatoriosDetran,
  baixarPdfDetran,
  processarLoteDetran,
  baixarPdfMultaDetran,
  listarMultasDaConsulta,
  statusLoteDetran,
  exportarMultasDetran,
  gerarRelatorioPdf,
  previaRelatorioPdf,
} from '../controllers/infracaoDetranController'

import {
  apagarVeiculosAutomacao,
  executarAutomacaoAgora,
  importarVeiculosAutomacao,
  statusAutomacao,
} from '../controllers/automacaoController'

export const detranRoutes = Router()

// Ajustado para 'consultar-veiculo'
detranRoutes.post('/consultar', consultarVeiculoAvulso) 

// Ajustado para 'historico'
detranRoutes.get('/historico', listarConsultasDetran) 
detranRoutes.get('/relatorios', obterRelatoriosDetran)

detranRoutes.get('/pdf/:id', baixarPdfDetran)

// Ajustado para 'processar-lote' (se o frontend solicitar assim)
detranRoutes.post('/processar-lote', processarLoteDetran)

detranRoutes.get('/consultas/:id/multas', listarMultasDaConsulta)
detranRoutes.get('/multas/:id/pdf', baixarPdfMultaDetran)
detranRoutes.get('/lotes/:id/status', statusLoteDetran)

detranRoutes.post('/exportar', exportarMultasDetran)

detranRoutes.post('/relatorio-pdf', gerarRelatorioPdf)
detranRoutes.post('/relatorio-pdf/previa', previaRelatorioPdf)

detranRoutes.get('/automacao/status', statusAutomacao)
detranRoutes.put('/automacao/veiculos', importarVeiculosAutomacao)
detranRoutes.delete('/automacao/veiculos', apagarVeiculosAutomacao)
detranRoutes.post('/automacao/executar', executarAutomacaoAgora)
