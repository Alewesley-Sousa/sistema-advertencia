import { Router } from 'express'
import { 
  listarInfracoesOperacional, 
  listarHistorico,
  baixarPdfInfracao, 
  enviarEmailInfracao, 
  gerarOficioInfracao
} from '../controllers/infracaoController'

export const infracaoRoutes = Router()

// Fila operacional (Curto Prazo / Painel Principal)
infracaoRoutes.get('/', listarInfracoesOperacional)

// Histórico auditável (Longo Prazo / Consulta Geral com Paginação)
infracaoRoutes.get('/historico', listarHistorico)

// Obter PDF do ofício
infracaoRoutes.get('/:id/pdf', baixarPdfInfracao)

// Disparo manual do e-mail via frontend
infracaoRoutes.post('/:id/enviar-email', enviarEmailInfracao)

// Geração manual do PDF via frontend
infracaoRoutes.post('/:id/gerar-pdf', gerarOficioInfracao)