// src/main/index.ts

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDatabase } from './database/init'
import { consolidarInfracoesPendentes } from './domains/infracoes/services/consolidaçãoService'
import { routes } from './routes'
import { iniciarCronJobs } from './jobs/infracoesCron'
import { errorHandler } from './shared/errors/errorHandler'
import { AppError } from './shared/errors/AppError'
import { seedInfracoesDev } from './domains/infracoes/services/wialonMockService'

const app = express()
const PORT = 3333

/* ═══════════════════════════════════════════════════════════════
   Middlewares globais
   ═══════════════════════════════════════════════════════════════ */
app.use(cors())
app.use(express.json())

/* ═══════════════════════════════════════════════════════════════
   Banco de dados
   ═══════════════════════════════════════════════════════════════ */
initDatabase()
seedInfracoesDev()
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
if (process.env.NODE_ENV !== 'production') {
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