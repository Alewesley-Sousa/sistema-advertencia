import { Request, Response } from 'express'
import { WialonTaskMessage, parseWialonMessage } from '../services/wialon'
import { obterEnderecoPorCoordenadas } from '../services/geocoding'
import { infracaoRepository } from '../repositories/infracaoRepository'

export async function handleWialonWebhook(req: Request, res: Response): Promise<void> {
  try {
    const rawPayload = req.body as WialonTaskMessage

    // Filtra se não for evento de excesso de velocidade
    if (rawPayload.p?.task_evt_name !== 'Excesso de Velocidade') {
      res.status(200).json({ message: 'Evento ignorado: tipo de tarefa diferente de Excesso de Velocidade.' })
      return
    }

    // Processa a mensagem e extrai campos formatados
    const infracao = parseWialonMessage(rawPayload)

    // Busca o endereço reverso
    const endereco = await obterEnderecoPorCoordenadas(
      infracao.latitude ?? undefined,
      infracao.longitude ?? undefined
    )

    // Persiste no banco de dados
    const result = infracaoRepository.salvar({
      task_id: infracao.task_id,
      item_id: infracao.item_id,
      placa: infracao.placa,
      condutor: infracao.condutor,
      velocidade: infracao.velocidade,
      limite_via: infracao.limite_via,
      latitude: infracao.latitude,
      longitude: infracao.longitude,
      endereco,
      data_evento_wialon: infracao.data_evento_wialon
    })

    if (result.changes === 0) {
      res.status(200).json({ message: 'Evento ignorado: task_id já registrado anteriormente.' })
      return
    }

    res.status(201).json({
      message: 'Infração registrada com sucesso.',
      infracao_id: Number(result.lastInsertRowid)
    })
  } catch (error: any) {
    console.error('[Webhook Error]', error)
    res.status(500).json({ error: 'Erro interno ao processar webhook da Wialon.' })
  }
}