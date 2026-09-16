import express from 'express'
import cors from 'cors'
import { initDatabase } from './database/init'
import { consolidarInfracoesPendentes } from './services/consolidaçãoService'
import { testarWebhookMock } from './mocks/webhookMock'
import { routes } from './routes'

const app = express()
const PORT = 3333

app.use(cors())
app.use(express.json())

// Inicializa banco de dados
initDatabase()

// Executa o mock em ambiente de teste (opcional)
testarWebhookMock().catch(console.error)

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Registra todos os módulos de rotas sob o prefixo /api
app.use('/api', routes)

app.listen(PORT, async () => {
  console.log(`[Backend] Servidor rodando em http://localhost:${PORT}`)
  
  // Consolida infrações de dias anteriores automaticamente ao iniciar a aplicação
  await consolidarInfracoesPendentes().catch(console.error)
})