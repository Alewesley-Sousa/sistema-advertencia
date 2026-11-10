// src/main/index.ts

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDatabase } from './database/init'
import { consolidarInfracoesPendentes } from './domains/infracoes/services/consolidacaoService'
import { routes } from './routes'
import { iniciarCronJobs } from './jobs/infracoesCron'
import { errorHandler } from './shared/errors/errorHandler'
import { AppError } from './shared/errors/AppError'
import { seedInfracoesDev } from './domains/infracoes/services/wialonMockService'

const app = express()
const PORT = Number(process.env.PORT) || 3333
const IS_PROD = process.env.NODE_ENV === 'production'

/* ═══════════════════════════════════════════════════════════════
   Middlewares globais
   ═══════════════════════════════════════════════════════════════ */
// CORS_ORIGIN aceita uma lista separada por vírgulas. Sem valor, libera apenas
// o front local (Vite, porta 3000 definida no vite.config.ts) em vez de qualquer origem.
const ORIGENS_PADRAO =
  'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173'

const origensPermitidas = (process.env.CORS_ORIGIN || ORIGENS_PADRAO)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(cors({ origin: origensPermitidas }))
app.use(express.json())

/* ═══════════════════════════════════════════════════════════════
   Banco de dados
   ═══════════════════════════════════════════════════════════════ */
initDatabase()
if (!IS_PROD) {
  seedInfracoesDev()
}
/* ═══════════════════════════════════════════════════════════════
   Healthcheck
   ═══════════════════════════════════════════════════════════════ */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

/* ═══════════════════════════════════════════════════════════════
   Rotas — todos os módulos ficam registrados sob /api.
   O próprio módulo `routes` já inclui o /dev (mock em dev).
   ═══════════════════════════════════════════════════════════════ */
app.use('/api', routes)

/* ═══════════════════════════════════════════════════════════════
   Rota de teste de erro — só em dev
   ═══════════════════════════════════════════════════════════════ */
if (!IS_PROD) {
  app.get('/api/test-error', (_req, _res) => {
    throw new AppError(
      'Erro de teste.',
      400,
      'TEST_ERROR'
    )
  })
}

/* ═══════════════════════════════════════════════════════════════
   Handler de erro — sempre por último
   ═══════════════════════════════════════════════════════════════ */
app.use(errorHandler)

/* ═══════════════════════════════════════════════════════════════
   Bootstrap
   ═══════════════════════════════════════════════════════════════ */
app.listen(PORT, async () => {
  console.log(`[Backend] Servidor rodando em http://localhost:${PORT}`)

  // Consolida infrações de dias anteriores automaticamente ao iniciar
  await consolidarInfracoesPendentes().catch(console.error)

  // Inicia os cron jobs
  iniciarCronJobs()
})