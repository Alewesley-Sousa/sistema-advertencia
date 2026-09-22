// src/renderer/services/detran.ts

import { api } from './api'
import { type BaseFiltros, type MessageResponse, type Pagination } from '../types/api'

export type DetranStatus = 'PENDENTE' | 'PROCESSANDO' | 'QUITADO' | 'COM_DEBITO' | 'ERRO'

export interface InfracaoDetran {
  id?: number
  placa: string
  chassi: string
  statusConsulta: DetranStatus
  tipoDebito?: string
  caminhoPdf?: string
  mensagemErro?: string
  created_at?: string
  updated_at?: string
}

export interface MultaDetran {
  /** ID no banco — vem preenchido quando lido da tabela `infracoes_detran_multas` */
  id?: number
  ait: string
  motivo: string
  dataInfracao: string
  dataVencimento: string
  valor: string
  valorPagar: string
  /** Preenchido quando o boleto foi baixado com sucesso */
  caminhoPdf?: string
  /** Preenchido quando o DETRAN recusou emitir (ex: vencimento em dia não útil) */
  erroEmissao?: string
  /** true = já baixada em execução anterior, pulamos o download agora */
  jaBaixada?: boolean
}

export interface ItemVeiculoLote {
  placa: string
  chassi: string
}

export interface ProcessarLotePayload {
  nomeArquivo?: string
  veiculos: ItemVeiculoLote[]
}

export interface ProcessarLoteResponse extends MessageResponse {
  loteId: number
  totalVeiculos: number
}

export interface HistoricoDetranResult {
  data: InfracaoDetran[]
  meta: Pagination
}

export interface ConsultarDetranPayload {
  placa: string
  chassi: string
  /** Se true, ignora os boletos já baixados e força o redownload */
  forcarRedownload?: boolean
}

export interface ConsultarDetranResult {
  id: number
  placa: string
  chassi: string
  statusConsulta: DetranStatus
  tipoDebito?: string
  caminhoPdf?: string
  multas: MultaDetran[]
  multasSalvas: number
}

export interface LoteStatus {
  loteId: number
  status: 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO'
  processados: number
  total: number
  percentual: number
  itemAtual: string
  nomeArquivo: string
  atualizadoEm: string
}

/* ==========================================================================
 * API
 * ========================================================================*/

export async function processarLoteDetran(
  payload: ProcessarLotePayload
): Promise<ProcessarLoteResponse> {
  const response = await api.post<ProcessarLoteResponse>('/detran/processar-lote', payload)
  return response.data
}

/**
 * Histórico paginado de consultas DETRAN.
 *
 * O interceptor do `api.ts` separa o envelope em:
 *   - `response.data` → array puro
 *   - `response.meta` → paginação
 *
 * Aqui remontamos os dois num único objeto.
 */
export async function listarHistoricoDetran(
  filtros?: BaseFiltros
): Promise<HistoricoDetranResult> {
  const response = await api.get<InfracaoDetran[]>('/detran/historico', {
    params: {
      page: filtros?.pagina,
      limit: filtros?.limite,
      busca: filtros?.busca,
    },
  })

  const meta = (response as any).meta as Pagination | undefined

  return {
    data: response.data,
    meta: meta ?? {
      page: 1,
      limit: filtros?.limite ?? 10,
      totalItems: response.data.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  }
}

/**
 * Consulta avulsa de 1 veículo.
 *
 * Retorna o resultado da consulta + a lista de multas individuais
 * encontradas (com `caminhoPdf`, `erroEmissao` ou `jaBaixada` preenchidos).
 */
export async function consultarVeiculoDetran(
  payload: ConsultarDetranPayload
): Promise<ConsultarDetranResult> {
  const response = await api.post<ConsultarDetranResult>('/detran/consultar', payload)
  return response.data
}

/** Lista as multas de uma consulta específica (usada ao abrir o modal). */
export async function listarMultasDaConsulta(consultaId: number): Promise<MultaDetran[]> {
  const response = await api.get<MultaDetran[]>(`/detran/consultas/${consultaId}/multas`)
  return response.data
}

/** PDF consolidado da consulta (fallback legado). */
export function obterUrlPdfDetran(id: number): string {
  return `${api.defaults.baseURL}/detran/pdf/${id}`
}

/** PDF individual de uma multa. */
export function obterUrlPdfMultaDetran(multaId: number): string {
  return `${api.defaults.baseURL}/detran/multas/${multaId}/pdf`
}

/** Consulta o status atual de um lote (usado em polling). */
export async function consultarStatusLote(loteId: number): Promise<LoteStatus> {
  const response = await api.get<LoteStatus>(`/detran/lotes/${loteId}/status`)
  return response.data
}