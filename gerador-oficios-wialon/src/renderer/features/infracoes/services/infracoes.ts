import { api } from '../../../services/api'
import { type BaseFiltros, type MessageResponse } from '../../../types/api'

export type InfracaoStatus =
  | 'PENDENTE'
  | 'REGISTRADO'
  | 'GERADO'
  | 'ENVIADO'
  | 'ERRO'
  | 'DESCARTADO'
  | 'IGNORADO_MENOR_GRAVIDADE'
  | 'PROCESSANDO'

export interface Infracao {
  id: number
  task_id: string
  item_id: number
  placa: string
  condutor: string | null
  velocidade: number

  /**
   * Momento em que a infração ocorreu no Wialon.
   * Formato esperado pelo backend:
   * YYYY-MM-DD HH:mm:ss
   */
  data_hora: string | null

  latitude: number | null
  longitude: number | null
  endereco: string | null

  pdf_path: string | null
  status: InfracaoStatus

  /**
   * Momento em que o registro foi criado no banco.
   */
  created_at: string

  /**
   * Último momento em que o registro foi atualizado.
   */
  updated_at: string
}

export interface SincronizacaoResponse extends MessageResponse {
  novos_registros: number
  total_processados?: number
}

export interface PaginationMeta {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface InfracoesListaResult {
  data: Infracao[]
  meta: PaginationMeta
}

/* ==========================================================================
 * UTILITÁRIOS
 * ========================================================================*/

/**
 * Formata a data/hora da ocorrência sem converter fuso horário.
 *
 * O Wialon fornece a ocorrência como uma data/hora local no texto,
 * por exemplo:
 *
 * 2026-09-23 14:35:21
 *
 * Não usamos new Date(valor).toLocaleString() aqui porque isso pode
 * interpretar/converter o horário e alterar a hora apresentada ao usuário.
 */
export function formatarDataHoraInfracao(
  dataHora: string | null | undefined
): string {
  if (!dataHora) {
    return 'Não informado'
  }

  const match = dataHora.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  )

  if (match) {
    const [, ano, mes, dia, hora, minuto, segundo] = match

    return segundo
      ? `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`
      : `${dia}/${mes}/${ano} ${hora}:${minuto}`
  }

  /**
   * Fallback para formatos diferentes eventualmente retornados pelo backend.
   * Aqui tentamos apenas formatar, sem alterar o contrato principal.
   */
  const data = new Date(dataHora)

  if (!Number.isNaN(data.getTime())) {
    return data.toLocaleString('pt-BR')
  }

  return dataHora
}

/* ==========================================================================
 * OPERACIONAL
 * ========================================================================*/

export interface ListarOperacionalParams extends BaseFiltros {
  /** termo de busca (condutor, placa ou endereço) */
  busca?: string
}

export async function listarInfracoesOperacional(
  filtros: ListarOperacionalParams = {}
): Promise<InfracoesListaResult> {
  const response = await api.get<Infracao[]>('/infracoes', {
    params: {
      page: filtros.pagina,
      limit: filtros.limite,
      busca: filtros.busca,
    },
  })

  const meta = (response as any).meta as PaginationMeta | undefined

  return {
    data: response.data,
    meta: meta ?? {
      page: 1,
      limit: filtros.limite ?? 10,
      totalItems: response.data.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  }
}

/* ==========================================================================
 * HISTÓRICO
 * ========================================================================*/

export interface HistoricoInfracoesResult {
  data: Infracao[]
  meta: PaginationMeta
}

export async function buscarHistoricoInfracoes(
  filtros: BaseFiltros = {}
): Promise<HistoricoInfracoesResult> {
  const response = await api.get<Infracao[]>('/infracoes/historico', {
    params: {
      page: filtros.pagina,
      limit: filtros.limite,
      busca: filtros.busca,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
    },
  })

  const meta = (response as any).meta as PaginationMeta | undefined

  return {
    data: response.data,
    meta: meta ?? {
      page: 1,
      limit: filtros.limite ?? 10,
      totalItems: response.data.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  }
}

/* ==========================================================================
 * AÇÕES
 * ========================================================================*/

export async function gerarPdfInfracao(
  id: number
): Promise<MessageResponse & { pdf_path: string }> {
  const response = await api.post<MessageResponse & { pdf_path: string }>(
    `/infracoes/${id}/gerar-pdf`
  )

  return response.data
}

export async function enviarEmailInfracao(
  id: number
): Promise<MessageResponse> {
  const response = await api.post<MessageResponse>(
    `/infracoes/${id}/enviar-email`
  )

  return response.data
}

export async function sincronizarDadosWialon(): Promise<SincronizacaoResponse> {
  const response = await api.post<SincronizacaoResponse>('/sincronizar')

  return response.data
}