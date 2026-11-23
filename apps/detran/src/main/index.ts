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
import { db } from './database/db'
import { criarServicoDispositivos } from './seguranca/dispositivos'
import { cabecalhosSeguros, criarLimitador, criarMiddlewareDispositivo } from './seguranca/middlewares'
import { iniciarBackup } from './seguranca/backupAgendador'

const app = express()
const PORT = Number(process.env.PORT) || 3334
// Só a própria máquina (o túnel conecta aqui). Para liberar a rede interna: HOST=0.0.0.0 (não recomendado).
const HOST = process.env.HOST || '127.0.0.1'

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

app.disable('x-powered-by')
app.use(cabecalhosSeguros)
app.use(cors({ origin: origensPermitidas }))
app.use(express.json({ limit: '2mb' }))

/* ═══════════════════════════════════════════════════════════════
   Segurança de acesso: só dispositivos aprovados (padrão: ligado em produção).
   Fica ANTES de tudo (interface e API); só /api/health é público.
   ═══════════════════════════════════════════════════════════════ */
// Seguro por padrão: só fica desligado em `npm run dev` (ou com DISPOSITIVOS_OBRIGATORIO=false).
const emDesenvolvimento = ['dev', 'dev:node'].includes(process.env.npm_lifecycle_event ?? '')
const dispositivosAtivo = (process.env.DISPOSITIVOS_OBRIGATORIO ?? (emDesenvolvimento ? 'false' : 'true')).toLowerCase() === 'true'
const ipsPermitidos = (process.env.IPS_PERMITIDOS || '').split(',').map((s) => s.trim()).filter(Boolean)
const servicoDispositivos = criarServicoDispositivos(db as any)
app.use(criarMiddlewareDispositivo(servicoDispositivos, { ativo: dispositivosAtivo, ipsPermitidos }))
console.log(
  dispositivosAtivo
    ? `[Segurança] Dispositivos aprovados: ATIVO${ipsPermitidos.length ? ` (+ ${ipsPermitidos.length} IP(s) permitido(s))` : ''}.`
    : '[Segurança] Dispositivos aprovados: DESLIGADO (modo desenvolvimento ou DISPOSITIVOS_OBRIGATORIO=false).'
)

/* Limite de requisições: geral por dispositivo/IP e mais rígido nas ações pesadas (POST/PUT/DELETE). */
const num = (v: string | undefined, padrao: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : padrao)
app.use('/api', criarLimitador({ janelaMs: 60_000, max: num(process.env.RATE_LIMIT_GERAL, 600) }))
app.use(
  [
    '/api/detran/consultar',
    '/api/detran/processar-lote',
    '/api/detran/exportar',
    '/api/detran/relatorio-pdf',
    '/api/detran/automacao',
  ],
  criarLimitador({
    janelaMs: 60_000,
    max: num(process.env.RATE_LIMIT_PESADO, 20),
    // consultas de leitura (status/histórico) e a prévia do relatório (a cada ajuste de filtro) não entram
    ignorar: (req) => req.method === 'GET' || req.originalUrl.startsWith('/api/detran/relatorio-pdf/previa'),
  })
)

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

app.listen(PORT, HOST, () => {
  console.log(`[DETRAN] Servidor rodando em http://${HOST}:${PORT}`)
  iniciarAutomacao()
  iniciarBackup()
  servicoDispositivos.limparPendentesAntigos(7)
})
