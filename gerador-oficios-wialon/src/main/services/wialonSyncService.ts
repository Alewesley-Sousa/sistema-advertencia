import axios from 'axios'
import { WialonTaskMessage, parseWialonMessage } from './wialon'
import { obterEnderecoPorCoordenadas } from './geocoding'
import { infracaoRepository } from '../repositories/infracaoRepository'

const WIALON_API_URL = process.env.WIALON_API_URL || 'https://hst-api.wialon.com/wialon/ajax.html'
const WIALON_TOKEN = process.env.WIALON_TOKEN || ''

export async function sincronizarInfracoesWialon(): Promise<{ novosRegistros: number; processados: number }> {
  // 1. Exemplo de autenticação/sessão com a Wialon via Token (caso necessário)
  // Ou consulta direta do endpoint messages/get_task_messages
  const response = await axios.get<{ messages: WialonTaskMessage[] }>(WIALON_API_URL, {
    params: {
      svc: 'messages/get_task_messages',
      params: JSON.stringify({
        itemId: 0, // 0 para buscar de todas as unidades atreladas ou defina o ID do recurso
        timeFrom: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000), // Útimas 24 horas
        timeTo: Math.floor(Date.now() / 1000),
        flags: 0,
        flagsMask: 0,
        loadCount: 100
      }),
      sid: WIALON_TOKEN
    }
  })

  const mensagens = response.data?.messages || []
  let novosRegistros = 0

  for (const rawPayload of mensagens) {
    // Filtra apenas eventos de Excesso de Velocidade
    if (rawPayload.p?.task_evt_name !== 'Excesso de Velocidade') {
      continue
    }

    const infracao = parseWialonMessage(rawPayload)

    // Verifica se já existe antes de buscar geocodificação para economizar chamadas
    const endereco = await obterEnderecoPorCoordenadas(
      infracao.latitude ?? undefined,
      infracao.longitude ?? undefined
    )

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

    if (result.changes > 0) {
      novosRegistros++
    }
  }

  return {
    novosRegistros,
    processados: mensagens.length
  }
}