import { WialonTaskMessage, parseWialonMessage } from '../services/wialon'
import { infracaoRepository } from '../repositories/infracaoRepository'
import { obterEnderecoPorCoordenadas } from '../services/geocoding'

export async function testarWebhookMock(): Promise<void> {
  console.log('[Mock Test] Simulando recebimento de mensagem oficial da Wialon...')

  // Payload exatamente igual ao mock do Guia de Consulta Wialon
  const wialonMockPayload: WialonTaskMessage = {
    item_id: 1546,
    t: 1724420460,
    f: 1536,
    tp: 'task',
    rt: 1724420493,
    p: {
      task_sub_type: 21,
      task_reg_type: 1,
      task_evt_name: 'Excesso de Velocidade',
      task_id: `mock-task-${Date.now()}`,
      task_update_time: 1724420460,
      task_status: 6,
      task_priority: 2,
      task_assignee: 0,
      task_description: 'Veículo excedeu o limite máximo de velocidade permitido na via.',
      task_tags: JSON.stringify({
        SPEED: '95 km/h',
        MAX_SPEED: '80 km/h',
        POS_TIME: '10.07.2025 15:52:28',
        UNIT: 'ABC-1234 - Volvo FH'
      }),
      task_comments: '[]',
      task_account: 1063,
      task_address_x: -3.7431,
      task_address_y: -38.5178,
      task_done_rejected: 1752152438,
      task_params: {}
    }
  }

  try {
    const infracao = parseWialonMessage(wialonMockPayload)

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

    console.log('[Mock Test] Sucesso no registro:', {
      infracao_id: Number(result.lastInsertRowid),
      placa: infracao.placa,
      data_evento: infracao.data_evento_wialon,
      velocidade: `${infracao.velocidade} km/h`
    })
  } catch (error: any) {
    console.error('[Mock Test Error]', error?.message || error)
  }
}