// src/main/domains/infracoes/routes/infracaoRoutes.ts

import { Router } from 'express'
import {
  listarInfracoesOperacional,
  listarHistorico,
  baixarPdfInfracao,
  previewPdfOficio,            // ← novo
  enviarEmailInfracao,
  gerarOficioInfracao,
} from '../controllers/infracaoController'

export const infracaoRoutes = Router()

// Fila operacional (Curto Prazo / Painel Principal)
infracaoRoutes.get('/', listarInfracoesOperacional)

// Histórico auditável (Longo Prazo / Consulta Geral com Paginação)
infracaoRoutes.get('/historico', listarHistorico)

// ─── Rotas por ID ────────────────────────────────────────────────
// Preview inline (visualização no navegador, não salva em disco)
infracaoRoutes.get('/:id/preview', previewPdfOficio)

// Download / visualização do PDF já salvo em disco
infracaoRoutes.get('/:id/pdf', baixarPdfInfracao)

// Geração manual do PDF via frontend
infracaoRoutes.post('/:id/gerar-pdf', gerarOficioInfracao)

// Disparo manual do e-mail via frontend
infracaoRoutes.post('/:id/enviar-email', enviarEmailInfracao)