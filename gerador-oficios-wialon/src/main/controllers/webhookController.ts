import { Request, Response } from 'express'
import { db } from '../database/db'
import { WialonWebhookPayload } from '../services/wialon'
import { obterEnderecoPorCoordenadas } from '../services/geocoding'
import { gerarPdfOficio } from '../services/pdfService'

/**
 * ============================================================================
 * LÓGICA CORE DE PROCESSAMENTO (Compartilhada entre Real e Mock)
 * ============================================================================
 */
async function processarInfracaoWebhook(payload: WialonWebhookPayload) {
  if (!payload.placa || payload.velocidade === undefined || payload.limite_via === undefined) {
    throw new Error('Payload inválido. Placa, velocidade e limite_via são obrigatórios.')
  }

  const {
    task_id,
    item_id,
    placa,
    condutor = 'Não Informado',
    velocidade,
    limite_via,
    latitude = null,
    longitude = null
  } = payload

  // 1. Busca o endereço legível usando latitude e longitude
  const endereco = await obterEnderecoPorCoordenadas(latitude ?? undefined, longitude ?? undefined)

  // 2. Persistência no SQLite com o endereço formatado e status inicial PENDENTE
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO infracoes (task_id, item_id, placa, condutor, velocidade, limite_via, latitude, longitude, endereco, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE')
  `)

  const result = stmt.run(
    task_id || null,
    item_id || null,
    placa,
    condutor,
    velocidade,
    limite_via,
    latitude,
    longitude,
    endereco
  )

  // Se o changes for 0, o task_id já existe na base de dados (duplicidade evitada)
  if (result.changes === 0) {
    return {
      status: 200,
      body: { message: 'Infração ignorada: este evento (task_id) já foi processado anteriormente.' }
    }
  }

  const infracaoId = Number(result.lastInsertRowid)

  try {
    // 3. Geração automática do Ofício em PDF via Puppeteer
    const pdfPath = await gerarPdfOficio({
      id: infracaoId,
      placa,
      condutor,
      velocidade,
      limite_via,
      endereco,
      data_hora: new Date().toLocaleString('pt-BR')
    })

    // 4. Atualiza o registro no banco com o caminho do PDF e status GERADO
    db.prepare(`
      UPDATE infracoes SET pdf_path = ?, status = 'GERADO' WHERE id = ?
    `).run(pdfPath, infracaoId)

    return {
      status: 201,
      body: {
        message: 'Infração registrada e Ofício em PDF gerado com sucesso!',
        infracao_id: infracaoId,
        endereco_encontrado: endereco,
        pdf_path: pdfPath
      }
    }
  } catch (pdfError) {
    console.error('[PDF Generation Error]', pdfError)
    
    // Marca o status como ERRO caso a compilação do PDF falhe
    db.prepare(`UPDATE infracoes SET status = 'ERRO' WHERE id = ?`).run(infracaoId)

    return {
      status: 500,
      body: { error: 'Infração registrada, mas ocorreu uma falha na geração do PDF.' }
    }
  }
}

/**
 * ============================================================================
 * 1. ROTA REAL DE WEBHOOK
 * ============================================================================
 */
export async function handleWialonWebhook(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body as WialonWebhookPayload
    const resultado = await processarInfracaoWebhook(payload)
    
    res.status(resultado.status).json(resultado.body)
  } catch (error: any) {
    console.error('[Webhook Error]', error)
    const statusCode = error.message.includes('Payload inválido') ? 400 : 500
    res.status(statusCode).json({ error: error.message || 'Erro interno ao processar webhook do Wialon.' })
  }
}

/**
 * ============================================================================
 * 2. FUNÇÃO DE TESTE / MOCK
 * ============================================================================
 */
export async function testarWebhookMock(): Promise<void> {
  console.log('[Mock Test] Iniciando simulação de requisição de webhook com geocodificação e PDF...')

const payloadMock: WialonWebhookPayload = {
    task_id: `TASK-${Date.now()}`, // Gera um ID único a cada reinicialização
    item_id: 12345,
    placa: 'XYZ-8888',
    condutor: 'Motorista Teste Mock',
    velocidade: 105.0,
    limite_via: 80.0,
    latitude: -3.7319,
    longitude: -38.5267
  }

  try {
    const resultado = await processarInfracaoWebhook(payloadMock)
    console.log('[Mock Test] Resposta simulada:', resultado)
  } catch (error: any) {
    // ATENÇÃO AQUI: Agora exibe o erro completo no terminal
    console.error('[Mock Test] Erro detalhado na simulação:', error?.message || error)
    if (error?.stack) {
      console.error(error.stack)
    }
  }
}