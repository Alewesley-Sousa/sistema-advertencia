// apps/detran/src/main/index.ts

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { errorHandler } from '@force/shared/server'
import { initDatabase } from './database/init'
import { routes } from './routes'

const app = express()
const PORT = Number(process.env.PORT) || 3334

/* ═══════════════════════════════════════════════════════════════
   Middlewares globais
   ═══════════════════════════════════════════════════════════════ */
// CORS_ORIGIN aceita uma lista separada por vírgulas. Sem valor, libera apenas
// o front local deste app (Vite, porta 3001 definida no vite.config.ts).
const ORIGENS_PADRAO =
  'http://localhost:3001,http://127.0.0.1:3001,http://localhost:5174,http://127.0.0.1:5174'

const origensPermitidas = (process.env.CORS_ORIGIN || ORIGENS_PADRAO)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(cors({ origin: origensPermitidas }))
app.use(express.json())

/* ═══════════════════════════════════════════════════════════════
   Banco de dados (storage/database.sqlite deste app)
   ═══════════════════════════════════════════════════════════════ */
initDatabase()

/* ═══════════════════════════════════════════════════════════════
   Healthcheck e rotas (todas sob /api)
   ═══════════════════════════════════════════════════════════════ */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.use('/api', routes)

/* ═══════════════════════════════════════════════════════════════
   Handler de erro — sempre por último
   ═══════════════════════════════════════════════════════════════ */
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[DETRAN] Servidor rodando em http://localhost:${PORT}`)
})
