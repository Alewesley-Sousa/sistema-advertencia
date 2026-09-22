// src/renderer/services/infracoes.ts

import { api } from './api'
import { type BaseFiltros, type MessageResponse } from '../types/api'

export interface Infracao {
  id: number
  task_id: string
  item_id: number
  placa: string
  condutor: string
  velocidade: number
  limite_via: number
  data_hora: string
  endereco: string
  pdf_path: string
  status: 'PENDENTE' | 'GERADO' | 'ERRO' | 'ENVIADO'
  created_at: string
}

export interface SincronizacaoResponse extends MessageResponse {
  novos_registros: number
  total_processados?: number
}

/** Meta de paginação que o backend expõe em `meta` */
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

export async function enviarEmailInfracao(id: number): Promise<MessageResponse> {
  const response = await api.post<MessageResponse>(`/infracoes/${id}/enviar-email`)
  return response.data
}

export async function sincronizarDadosWialon(): Promise<SincronizacaoResponse> {
  const response = await api.post<SincronizacaoResponse>('/sincronizar')
  return response.data
}