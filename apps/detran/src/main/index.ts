// apps/detran/src/main/index.ts

import 'dotenv/config'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import cors from 'cors'
import { errorHandler } from './shared/errors/errorHandler'
import { initDatabase } from './database/init'
import { routes } from './routes'
import { iniciarAutomacao } from './domains/detran/automacao/scheduler'

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
app.use(express.json({ limit: '2mb' }))

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
   Interface web (build do Vite em ./dist) — só se `npm run build` foi executado.
   Em desenvolvimento a interface continua vindo do Vite (porta 3001).
   ═══════════════════════════════════════════════════════════════ */
const pastaInterface = path.resolve(process.cwd(), 'dist')
if (fs.existsSync(path.join(pastaInterface, 'index.html'))) {
  app.use(express.static(pastaInterface, { index: 'index.html', maxAge: '1h' }))
  // SPA: qualquer rota que não seja /api devolve o index.html
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(pastaInterface, 'index.html'))
  })
  console.log(`[DETRAN] Interface web servida de ${pastaInterface}`)
}

/* ═══════════════════════════════════════════════════════════════
   Handler de erro — sempre por último
   ═══════════════════════════════════════════════════════════════ */
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[DETRAN] Servidor rodando em http://localhost:${PORT}`)
  iniciarAutomacao()
})
