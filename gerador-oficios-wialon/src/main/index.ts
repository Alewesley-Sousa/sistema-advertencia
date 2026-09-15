import express from 'express'
import cors from 'cors'
import { initDatabase, db } from './database/db'
import { handleWialonWebhook, testarWebhookMock } from './controllers/webhookController'

const app = express()
const PORT = 3333

app.use(cors())
app.use(express.json())

// Inicializar banco de dados (com ponto e vírgula obrigatório aqui)
initDatabase();

// Executa o mock de forma segura
testarWebhookMock().catch(console.error);

// Rota de Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Endpoint do Webhook Wialon (Real)
app.post('/api/webhooks/wialon', handleWialonWebhook)

// Rota de teste para listar infrações do SQLite
app.get('/api/infracoes', (_req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM infracoes ORDER BY id DESC')
    const infracoes = stmt.all()
    res.json(infracoes)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar infrações.' })
  }
})

app.listen(PORT, () => {
  console.log(`[Backend] Servidor rodando em http://localhost:${PORT}`)
})