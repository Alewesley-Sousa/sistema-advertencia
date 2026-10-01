// src/main/routes/devRoutes.ts

import { Router } from 'express'
import {
  gerarInfracoesMock,
  limparInfracoesMock,
  type MockOptions,
} from '../services/wialonMockService'
import { gerarPdfOficioBuffer } from '../../../services/pdfService'
import type { OficioTemplateData } from '../templates/oficioTemplate'

/* ═══════════════════════════════════════════════════════════════
   DADOS DE TESTE DO OFÍCIO
   ─────────────────────────────────────────────────────────────
   Edite estes valores livremente para visualizar o template com
   dados realistas. Query params na URL sobrescrevem campo a campo.

   Exemplos:
     /api/dev/oficio/preview                              → usa tudo daqui
     /api/dev/oficio/preview?velocidade=155               → troca só velocidade
     /api/dev/oficio/preview?placa=XYZ9A87&condutor=MARIA → troca vários
   ═══════════════════════════════════════════════════════════════ */

const OFICIO_PREVIEW_MOCK: OficioTemplateData = {
  id: 1,
  placa: 'ABC1D67',
  condutor: 'DAVINO',
  velocidade: 118,
  endereco: 'Avenida Bezerra de Menezes, 961, São Gerardo, Fortaleza, CE',
  data_hora: '2026-05-12T16:20:00.000Z',
  cpf: '624.229.553-98',
  cargo: 'MOTORISTA (CATEGORIA B)',
  cidadeEmissao: 'Aquiraz, Ce',
}

/* ═══════════════════════════════════════════════════════════════
   Router de desenvolvimento
   ═══════════════════════════════════════════════════════════════ */

export const devRoutes = Router()

/**
 * Middleware: bloqueia rotas /dev em produção.
 * Retorna 404 em vez de 403 pra não expor a existência da rota.
 */
function apenasDesenvolvimento(_req: any, res: any, next: any) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }
  next()
}

devRoutes.use(apenasDesenvolvimento)

/* ═══════════════════════════════════════════════════════════════
   POST /api/dev/mock-wialon
   ─────────────────────────────────────────────────────────────
   Popula o banco com infrações simulando o webhook da Wialon.
   Body (todos opcionais):
     { quantidade?, distribuicao?, concentrarHoje?, placaFixa?, condutorFixo? }
   ═══════════════════════════════════════════════════════════════ */

devRoutes.post('/mock-wialon', (req, res) => {
  const body = req.body as MockOptions
  const resultado = gerarInfracoesMock(body)
  res.json({
    ok: true,
    ...resultado,
    mensagem: `${resultado.total} infrações mock criadas.`,
  })
})

/* ═══════════════════════════════════════════════════════════════
   POST /api/dev/mock-wialon/limpar
   ─────────────────────────────────────────────────────────────
   Remove infrações criadas nas últimas 24h (útil para reset rápido).
   ═══════════════════════════════════════════════════════════════ */

devRoutes.post('/mock-wialon/limpar', (_req, res) => {
  const removidas = limparInfracoesMock()
  res.json({
    ok: true,
    removidas,
    mensagem: `${removidas} infrações removidas.`,
  })
})

/* ═══════════════════════════════════════════════════════════════
   GET /api/dev/oficio/preview
   ─────────────────────────────────────────────────────────────
   Gera o PDF do ofício com dados arbitrários via query string.
   Abra a URL direto no navegador para visualizar sem salvar nada.
   ═══════════════════════════════════════════════════════════════ */

devRoutes.get('/oficio/preview', async (req, res, next) => {
  try {
    const q = req.query

    /*
     * Aplica os query params SOBRE os defaults do OFICIO_PREVIEW_MOCK.
     * Se um campo não vier na URL, o default é usado.
     *
     * O padrão `q.x !== undefined && { x: ... }` (em vez de `??` ou `||`)
     * preserva valores falsy válidos, como velocidade=0.
     */
    const dados: OficioTemplateData = {
      ...OFICIO_PREVIEW_MOCK,
      ...(q.id !== undefined && { id: Number(q.id) }),
      ...(q.placa !== undefined && { placa: String(q.placa) }),
      ...(q.condutor !== undefined && { condutor: String(q.condutor) }),
      ...(q.velocidade !== undefined && { velocidade: Number(q.velocidade) }),
      ...(q.endereco !== undefined && { endereco: String(q.endereco) }),
      ...(q.data_hora !== undefined && { data_hora: String(q.data_hora) }),
      ...(q.cpf !== undefined && { cpf: String(q.cpf) }),
      ...(q.cargo !== undefined && { cargo: String(q.cargo) }),
      ...(q.cidade !== undefined && { cidadeEmissao: String(q.cidade) }),
    }

    const buffer = await gerarPdfOficioBuffer(dados)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      'inline; filename="preview_oficio.pdf"'
    )
    // Sem cache — sempre que você ajustar o template e recarregar
    // (F5), o PDF é regenerado do zero.
    res.setHeader('Cache-Control', 'no-store, max-age=0')

    return res.send(Buffer.from(buffer))
  } catch (error) {
    console.error('[Dev Preview Oficio Error]', error)
    return next(error)
  }
})