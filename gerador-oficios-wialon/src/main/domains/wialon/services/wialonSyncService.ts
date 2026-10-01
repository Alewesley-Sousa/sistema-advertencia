import axios from 'axios'
import fs from 'node:fs'
import path from 'node:path'

import {
  WialonTaskMessage,
  parseWialonMessage,
} from './wialon'

import { infracaoRepository } from '../../infracoes/repositories/infracaoRepository'

const WIALON_API_URL =
  process.env.WIALON_API_URL ||
  'https://hst-api.wialon.com/wialon/ajax.html'

const WIALON_TOKEN =
  process.env.WIALON_TOKEN?.trim() || ''

const WIALON_DAYS = Math.max(
  1,
  Number(process.env.WIALON_DAYS || 1)
)

const WIALON_LOAD_COUNT = Math.min(
  20_000,
  Math.max(
    1,
    Number(process.env.WIALON_LOAD_COUNT || 1000)
  )
)

const WIALON_PREVIEW_ONLY =
  process.env.WIALON_PREVIEW_ONLY === 'true'

/**
 * Quando true, salva o retorno completo da API no disco.
 */
const WIALON_SAVE_RAW_RESPONSE =
  process.env.WIALON_SAVE_RAW_RESPONSE === 'true'

interface WialonLoginResponse {
  eid: string
  gis_sid?: string
  host?: string
  au?: string
  user?: {
    nm?: string
    id?: number
  }
  [key: string]: unknown
}

interface WialonSearchItemsResponse {
  totalItemsCount: number
  items: Array<{
    id: number
    nm?: string
    [key: string]: unknown
  }>
}

interface WialonTaskMessagesResponse {
  count: number
  messages: WialonTaskMessage[]
}

interface WialonApiErrorResponse {
  error?: number
  reason?: string
}

/* ============================================================================
 * DEBUG RAW API
 * ========================================================================== */

let pastaDebugWialon: string | null = null

function obterPastaDebugWialon(): string {
  if (pastaDebugWialon) {
    return pastaDebugWialon
  }

  const timestamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, '-')

  pastaDebugWialon = path.resolve(
    process.cwd(),
    'storage',
    'debug',
    'wialon',
    timestamp
  )

  fs.mkdirSync(
    pastaDebugWialon,
    {
      recursive: true,
    }
  )

  return pastaDebugWialon
}

function salvarJsonDebug(
  nomeArquivo: string,
  dados: unknown
): void {
  if (!WIALON_SAVE_RAW_RESPONSE) {
    return
  }

  try {
    const dir =
      obterPastaDebugWialon()

    const caminho =
      path.join(
        dir,
        nomeArquivo
      )

    fs.writeFileSync(
      caminho,
      JSON.stringify(
        dados,
        null,
        2
      ),
      'utf8'
    )

    console.log(
      `[Wialon] Debug salvo: ${path.relative(process.cwd(), caminho)}`
    )
  } catch (error) {
    console.error(
      '[Wialon] Falha ao salvar debug:',
      error instanceof Error
        ? error.message
        : String(error)
    )
  }
}

/* ============================================================================
 * REQUEST
 * ========================================================================== */

/**
 * Executa uma requisição na API Wialon.
 */
async function wialonRequest<T>(
  svc: string,
  params: Record<string, unknown>,
  sid?: string
): Promise<T> {
  const body =
    new URLSearchParams()

  body.set(
    'svc',
    svc
  )

  body.set(
    'params',
    JSON.stringify(params)
  )

  if (sid) {
    body.set(
      'sid',
      sid
    )
  }

  const response =
    await axios.post<T>(
      WIALON_API_URL,
      body.toString(),
      {
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        timeout: 30_000,
      }
    )

  const data =
    response.data as
    | T
    | WialonApiErrorResponse
    | number

  if (
    typeof data === 'number' &&
    data !== 0
  ) {
    throw new Error(
      `Wialon retornou erro ${data} no serviço "${svc}".`
    )
  }

  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (
      data as WialonApiErrorResponse
    ).error === 'number'
  ) {
    const errorCode =
      (
        data as WialonApiErrorResponse
      ).error

    if (errorCode !== 0) {
      const reason =
        (
          data as WialonApiErrorResponse
        ).reason

      throw new Error(
        `Wialon retornou erro ${errorCode} no serviço "${svc}"` +
        `${reason ? `: ${reason}` : ''}.`
      )
    }
  }

  return response.data
}

/* ============================================================================
 * LOGIN
 * ========================================================================== */

async function autenticarWialon(): Promise<string> {
  if (!WIALON_TOKEN) {
    throw new Error(
      'WIALON_TOKEN não configurado no .env.'
    )
  }

  console.log(
    '[Wialon] Autenticando...'
  )

  const resposta =
    await wialonRequest<WialonLoginResponse>(
      'token/login',
      {
        token:
          WIALON_TOKEN,
        fl: 1,
      }
    )

  /*
   * Salva o retorno completo do login.
   *
   * O token enviado na requisição NÃO é salvo.
   * Estamos salvando somente response.data.
   */
  salvarJsonDebug(
    '01-login.json',
    resposta
  )

  if (!resposta?.eid) {
    throw new Error(
      'A Wialon não retornou o SID/EID da sessão.'
    )
  }

  console.log(
    `[Wialon] Login realizado: ${resposta.user?.nm ||
    resposta.au ||
    'usuário não informado'
    }`
  )

  return resposta.eid
}

/* ============================================================================
 * UNIDADES
 * ========================================================================== */

async function obterIdsDasUnidades(
  sid: string
): Promise<number[]> {
  const params = {
    spec: {
      itemsType:
        'avl_unit',
      propName:
        'sys_name',
      propValueMask:
        '*',
      sortType:
        'sys_name',
    },

    force: 1,
    flags: 1,
    from: 0,
    to: 0,
  }

  const resposta =
    await wialonRequest<WialonSearchItemsResponse>(
      'core/search_items',
      params,
      sid
    )

  salvarJsonDebug(
    '02-unidades.json',
    {
      request: {
        svc:
          'core/search_items',
        params,
      },
      response:
        resposta,
    }
  )

  const ids =
    (resposta.items || [])
      .map(
        (item) => item.id
      )
      .filter(
        (id) =>
          Number.isInteger(id) &&
          id > 0
      )

  console.log(
    `[Wialon] Unidades acessíveis: ${ids.length}`
  )

  return ids
}

/* ============================================================================
 * TASKS
 * ========================================================================== */

async function obterMensagensTarefas(
  sid: string,
  itemIds: number[]
): Promise<WialonTaskMessage[]> {
  if (!itemIds.length) {
    console.log(
      '[Wialon] Nenhuma unidade encontrada.'
    )

    return []
  }

  const agora =
    Math.floor(
      Date.now() / 1000
    )

  const timeFrom =
    agora -
    WIALON_DAYS *
    24 *
    60 *
    60

  const params = {
    itemIds,

    timeFrom,

    timeTo:
      agora,

    loadCount:
      WIALON_LOAD_COUNT,
  }

  console.log(
    `[Wialon] Buscando tasks dos últimos ${WIALON_DAYS} dia(s)...`
  )

  console.log(
    `[Wialon] Tasks por requisição: ${WIALON_LOAD_COUNT}`
  )

  const resposta =
    await wialonRequest<WialonTaskMessagesResponse>(
      'messages/get_task_messages',
      params,
      sid
    )

  /*
   * AQUI está o ponto principal do teste:
   *
   * response.data inteiro é salvo.
   *
   * Nada é filtrado antes de salvar.
   */
  salvarJsonDebug(
    '03-task-messages.json',
    {
      request: {
        svc:
          'messages/get_task_messages',
        params,
      },

      response:
        resposta,
    }
  )

  const mensagens =
    resposta.messages || []

  console.log(
    `[Wialon] Tasks recebidas: ${mensagens.length}`
  )

  /*
   * Mostra uma linha compacta para CADA task.
   *
   * Não despeja o objeto inteiro.
   */
  for (
    let i = 0;
    i < mensagens.length;
    i++
  ) {
    const task =
      mensagens[i]

    console.log(
      [
        `[Task ${i + 1}]`,
        `item=${task.item_id}`,
        `task=${task.p?.task_id || '-'}`,
        `subtipo=${task.p?.task_sub_type || '-'}`,
        `evento=${task.p?.task_evt_name || '-'}`,
        `status=${task.p?.task_status ?? '-'}`,
        `timestamp=${task.t ?? '-'}`,
      ].join(' | ')
    )
  }

  return mensagens
}

/* ============================================================================
 * FILTRO
 * ========================================================================== */

function filtrarTasksExcessoVelocidade(
  tasks: WialonTaskMessage[]
): WialonTaskMessage[] {
  return tasks.filter((task) => {
    const nomeEvento =
      String(task.p?.task_evt_name ?? '')
        .trim()
        .toUpperCase()

    return nomeEvento === 'EXCESSOS DE VELOCIDADE'
  })
}

/* ============================================================================
 * PROCESSAMENTO
 * ========================================================================== */

function exibirResumoTasks(
  tasks: WialonTaskMessage[]
): void {
  console.log(
    '======================================================'
  )

  console.log(
    `[Wialon] Excessos de velocidade encontrados: ${tasks.length}`
  )

  for (
    const task of tasks
  ) {
    const infracao =
      parseWialonMessage(
        task
      )

    console.log(
      [
        `Placa: ${infracao.placa}`,
        `Motorista: ${infracao.condutor}`,
        `Velocidade: ${infracao.velocidade} km/h`,
        `Data/Hora: ${infracao.data_evento_wialon ||
        'não encontrada'
        }`,
      ].join(' | ')
    )
  }

  console.log(
    '======================================================'
  )
}

/* ============================================================================
 * LOGOUT
 * ========================================================================== */

async function encerrarSessaoWialon(
  sid: string
): Promise<void> {
  try {
    await wialonRequest(
      'core/logout',
      {},
      sid
    )

    console.log(
      '[Wialon] Sessão encerrada.'
    )
  } catch (error) {
    console.warn(
      '[Wialon] Falha ao encerrar sessão:',
      error instanceof Error
        ? error.message
        : String(error)
    )
  }
}

/* ============================================================================
 * SINCRONIZAÇÃO
 * ========================================================================== */

export async function sincronizarInfracoesWialon(): Promise<{
  novosRegistros: number
  processados: number
}> {
  const sid =
    await autenticarWialon()

  try {
    const itemIds =
      await obterIdsDasUnidades(
        sid
      )

    const todasAsTasks =
      await obterMensagensTarefas(
        sid,
        itemIds
      )

    const tasksExcesso =
      filtrarTasksExcessoVelocidade(
        todasAsTasks
      )

    exibirResumoTasks(
      tasksExcesso
    )

    if (
      WIALON_PREVIEW_ONLY
    ) {
      console.log(
        '[Wialon] PREVIEW_ONLY=true — banco não será alterado.'
      )

      if (
        WIALON_SAVE_RAW_RESPONSE &&
        pastaDebugWialon
      ) {
        console.log(
          `[Wialon] Respostas completas salvas em: ${path.relative(process.cwd(), pastaDebugWialon)}`
        )
      }

      return {
        novosRegistros: 0,
        processados:
          tasksExcesso.length,
      }
    }

    let novosRegistros = 0

    for (
      const task of tasksExcesso
    ) {
      const infracao =
        parseWialonMessage(
          task
        )

      const result =
        infracaoRepository.salvar({
          task_id: infracao.task_id,
          item_id: infracao.item_id,
          placa: infracao.placa,
          condutor: infracao.condutor,
          velocidade: infracao.velocidade,
          latitude: infracao.latitude,
          longitude: infracao.longitude,
          endereco: infracao.endereco,
          data_evento_wialon: infracao.data_evento_wialon,
        })

      if (
        result.changes > 0
      ) {
        novosRegistros++
      }
    }

    console.log(
      `[Wialon] Sincronização concluída: ` +
      `${tasksExcesso.length} task(s), ` +
      `${novosRegistros} novo(s).`
    )

    return {
      novosRegistros,
      processados:
        tasksExcesso.length,
    }
  } finally {
    await encerrarSessaoWialon(
      sid
    )
  }
}