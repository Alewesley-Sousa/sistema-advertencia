export interface WialonTaskMessage {
  item_id: number
  t: number
  f?: number
  tp?: string

  p: {
    task_id: string
    task_sub_type?: number | string
    task_reg_type?: number
    task_evt_name?: string
    task_update_time?: number
    task_status?: number
    task_priority?: number
    task_assignee?: number
    task_description?: string
    task_tags?: string

    task_comments?: Array<{
      id: number
      timestamp: number
      assignee: number
      last_edited_by: number
      last_edit_time: number
      comment: string
    }>

    task_account?: number
    task_address_x?: number
    task_address_y?: number
    task_done_rejected?: number
    task_params?: Record<string, unknown>
  }
}

export interface InfracaoTratada {
  task_id: string
  item_id: number
  placa: string
  condutor: string
  velocidade: number
  latitude: number | null
  longitude: number | null
  endereco: string | null
  data_evento_wialon: string | null
}

/**
 * Extrai um número de uma string.
 *
 * Exemplos:
 * "93 km/h" -> 93
 * "60 km/h" -> 60
 */
function extrairNumero(
  valor?: string
): number {
  if (!valor) {
    return 0
  }

  const match = valor.match(
    /-?\d+(?:[.,]\d+)/
  )

  if (!match) {
    const inteiro = valor.match(
      /-?\d+/
    )

    return inteiro
      ? Number(inteiro[0])
      : 0
  }

  return Number(
    match[0].replace(',', '.')
  )
}

/**
 * Converte:
 *
 * 23.09.2026 10:35:03
 *
 * para:
 *
 * 2026-09-23 10:35:03
 */
function converterDataWialonParaISO(
  dataWialon?: string
): string | null {
  if (!dataWialon) {
    return null
  }

  const match = dataWialon.match(
    /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}:\d{2}:\d{2})$/
  )

  if (!match) {
    return null
  }

  const [, dia, mes, ano, hora] =
    match

  return `${ano}-${mes}-${dia} ${hora}`
}

/**
 * Extrai os campos da task_description.
 *
 * Formato esperado:
 *
 * UNIT violou os limites de velocidade.
 * As POS_TIME moveu-se com a velocidade de SPEED
 * perto de 'LOCATION'. (Motorista: DRIVER)
 *
 * Exemplo:
 *
 * CTA-SAR0E23 violou os limites de velocidade.
 * As 23.09.2026 10:35:03 moveu-se com a velocidade de
 * 93 km/h perto de 'Br-116 406, Cajazeiras, CE, Brazil'.
 * (Motorista: JOÃO DA SILVA)
 */
function extrairDadosDaDescricao(
  descricao: string
): {
  placa: string
  dataHora: string | null
  velocidade: number
  localizacao: string
  condutor: string
} {
  const resultado = {
    placa: 'SEM-PLACA',
    dataHora: null as string | null,
    velocidade: 0,
    localizacao: '',
    condutor: 'Não Informado',
  }

  if (!descricao) {
    return resultado
  }

  /**
   * Placa:
   *
   * "CTA-SAR0E23 violou os limites..."
   */
  const matchPlaca =
    descricao.match(
      /^(.+?)\s+violou os limites de velocidade/i
    )

  if (matchPlaca?.[1]) {
    resultado.placa =
      matchPlaca[1].trim()
  }

  /**
   * Data e hora:
   *
   * "As 23.09.2026 10:35:03 moveu-se..."
   */
  const matchData =
    descricao.match(
      /\bAs\s+(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})\s+moveu-se/i
    )

  if (matchData?.[1]) {
    resultado.dataHora =
      converterDataWialonParaISO(
        matchData[1]
      )
  }

  /**
   * Velocidade:
   *
   * "velocidade de 93 km/h"
   */
  const matchVelocidade =
    descricao.match(
      /velocidade de\s+(\d+(?:[.,]\d+)?)\s*km\/h/i
    )

  if (matchVelocidade?.[1]) {
    resultado.velocidade =
      extrairNumero(
        matchVelocidade[1]
      )
  }

  /**
   * Localização:
   *
   * "perto de 'Br-116 406, Cajazeiras, CE, Brazil'."
   *
   * Captura somente o conteúdo entre aspas.
   */
  const matchLocalizacao =
    descricao.match(
      /perto de\s+'([^']*)'/i
    )

  if (matchLocalizacao?.[1]) {
    resultado.localizacao =
      matchLocalizacao[1].trim()
  }

/**
 * Motorista:
 *
 * "(Motorista: JOÃO DA SILVA)"
 *
 * Quando não existe motorista vinculado, a Wialon
 * pode deixar o placeholder:
 *
 * "(motorista: %DRIVER%)"
 */
const matchCondutor =
  descricao.match(
    /\(motorista:\s*(.*?)\s*\)$/i
  )

if (matchCondutor?.[1]) {
  const condutor =
    matchCondutor[1].trim()

  if (
    condutor &&
    condutor !== '%DRIVER%'
  ) {
    resultado.condutor =
      condutor
  }
}

  return resultado
}

/**
 * Faz o parse da task retornada pela Wialon.
 */
export function parseWialonMessage(
  msg: WialonTaskMessage
): InfracaoTratada {
  let tags: Record<string, string> = {}

  try {
    const bruto =
      msg.p.task_tags || '{}'

    const parsed =
      JSON.parse(bruto)

    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      tags =
        parsed as Record<
          string,
          string
        >
    }
  } catch (error) {
    console.warn(
      '[Wialon] Falha ao interpretar task_tags:',
      error instanceof Error
        ? error.message
        : String(error)
    )
  }

  const descricao =
    msg.p.task_description || ''

  const dados =
    extrairDadosDaDescricao(
      descricao
    )

  /**
   * O limite continua vindo das tags:
   *
   * "SPEED_LIMIT": "60 km/h"
   */
  const limite =
    extrairNumero(
      tags.SPEED_LIMIT
    )

  /**
   * Fallback:
   *
   * Caso a descrição não traga a velocidade,
   * podemos calcular usando SPEEDING_VALUE.
   */
  const excesso =
    extrairNumero(
      tags.SPEEDING_VALUE
    )

  const velocidade =
    dados.velocidade > 0
      ? dados.velocidade
      : limite + excesso

return {
  task_id: msg.p.task_id,
  item_id: msg.item_id,
  placa: dados.placa,
  condutor: dados.condutor,
  velocidade,
  latitude: msg.p.task_address_x ?? null,
  longitude: msg.p.task_address_y ?? null,
  endereco: dados.localizacao || null,
  data_evento_wialon: dados.dataHora,
}
}