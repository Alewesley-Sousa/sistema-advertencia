/**
 * Interface oficial do payload retornado pela API messages/get_task_messages da Wialon
 */
export interface WialonTaskMessage {
  item_id: number
  t: number // Unix Timestamp UTC da ocorrência
  f?: number
  tp?: string
  rt?: number
  p: {
    task_sub_type?: number
    task_reg_type?: number
    task_evt_name?: string
    task_id: string
    task_update_time?: number
    task_status?: number
    task_priority?: number
    task_assignee?: number
    task_description?: string
    task_tags: string // JSON string embutida com SPEED, MAX_SPEED, POS_TIME, UNIT
    task_comments?: string
    task_account?: number
    task_address_x?: number // Latitude
    task_address_y?: number // Longitude
    task_done_rejected?: number
    task_params?: Record<string, any>
  }
}

/**
 * Interface tratada para consumo interno das regras do sistema
 */
export interface InfracaoTratada {
  task_id: string
  item_id: number
  placa: string
  condutor: string
  velocidade: number
  limite_via: number
  latitude: number | null
  longitude: number | null
  data_evento_wialon: string | null // Data/Hora no formato 'YYYY-MM-DD HH:mm:ss'
}

/**
 * Valida margem de tolerância do excesso de velocidade (Ex: 7km/h para vias <= 107km/h)
 */
export function validarExcessoVelocidade(velocidade: number, limite: number): boolean {
  return velocidade > limite
}

/**
 * Converte data do formato Wialon "10.07.2025 15:52:28" para SQLite ISO "2025-07-10 15:52:28"
 */
function converterDataWialonParaISO(dataWialon?: string): string | null {
  if (!dataWialon) return null
  const partes = dataWialon.split(' ')
  if (partes.length !== 2) return null

  const [dia, mes, ano] = partes[0].split('.')
  const hora = partes[1]

  if (!dia || !mes || !ano || !hora) return null

  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')} ${hora}`
}

/**
 * Realiza o parse do objeto bruto do Wialon para a estrutura interna
 */
export function parseWialonMessage(msg: WialonTaskMessage): InfracaoTratada {
  let tags: Record<string, string> = {}
  try {
    tags = JSON.parse(msg.p.task_tags || '{}')
  } catch (err) {
    console.warn('[Wialon Service] Falha ao realizar JSON.parse em task_tags:', msg.p.task_tags)
  }

  // Extrai velocidade "95 km/h" -> 95
  const velocidadeRaw = tags.SPEED || '0'
  const velocidade = parseFloat(velocidadeRaw.replace(/[^0-9.]/g, '')) || 0

  // Extrai limite "80 km/h" -> 80
  const limiteRaw = tags.MAX_SPEED || '0'
  const limite_via = parseFloat(limiteRaw.replace(/[^0-9.]/g, '')) || 0

  // Extrai placa do campo UNIT "ABC-1234 - Volvo FH" -> "ABC-1234"
  const unitRaw = tags.UNIT || ''
  const placa = unitRaw.split('-')[0]?.trim() || unitRaw || 'SEM-PLACA'

  // Converte data
  const data_evento_wialon = converterDataWialonParaISO(tags.POS_TIME)

  return {
    task_id: msg.p.task_id,
    item_id: msg.item_id,
    placa,
    condutor: 'Não Informado',
    velocidade,
    limite_via,
    latitude: msg.p.task_address_x ?? null,
    longitude: msg.p.task_address_y ?? null,
    data_evento_wialon
  }
}