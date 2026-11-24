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
  reenviarEmailAutomacao,
  statusAutomacao,
} from '../controllers/automacaoController'

import {
  executarNovasMultasAgora,
  listarPendentesNovasMultas,
  marcarNovasMultas,
  statusNovasMultas,
} from '../controllers/novasMultasController'

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
detranRoutes.post('/automacao/reenviar', reenviarEmailAutomacao)

detranRoutes.get('/novas-multas/status', statusNovasMultas)
detranRoutes.get('/novas-multas/pendentes', listarPendentesNovasMultas)
detranRoutes.post('/novas-multas/marcar', marcarNovasMultas)
detranRoutes.post('/novas-multas/executar', executarNovasMultasAgora)
