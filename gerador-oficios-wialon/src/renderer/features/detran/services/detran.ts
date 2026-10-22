// src/renderer/services/detran.ts

import { api } from '../../../services/api'
import { type BaseFiltros, type MessageResponse, type Pagination } from '../../../types/api'

export type DetranStatus = 'PENDENTE' | 'PROCESSANDO' | 'QUITADO' | 'COM_DEBITO' | 'ERRO'
export type SituacaoDebito = 'DEBITO' | 'SEM_DEBITO' | 'INFORMACAO' | 'DESCONHECIDO'

export interface InfracaoDetran {
  id?: number
  placa: string
  chassi: string
  statusConsulta: DetranStatus
  tipoDebito?: string
  ipvaStatus?: SituacaoDebito
  licenciamentoStatus?: SituacaoDebito
  caminhoPdf?: string
  mensagemErro?: string
  created_at?: string
  updated_at?: string

  // Contadores agregados vindos do /detran/historico
  qtdMultas?: number
  qtdBoletosBaixados?: number
  qtdBoletosIndisponiveis?: number
  qtdBoletosFalhas?: number
}

export interface MultaDetran {
  id?: number
  ait: string
  motivo: string
  dataInfracao: string
  dataVencimento?: string | null     // ← era obrigatório, agora tolerante
  valor?: string | null              // ← pode vir null do banco
  valorPagar?: string | null         // ← pode vir null do banco
  caminhoPdf?: string
  erroEmissao?: string
  jaBaixada?: boolean
}

export interface ItemVeiculoLote {
  placa: string
  chassi: string
  modelo?: string
  contrato?: string
}

export interface ProcessarLotePayload {
  nomeArquivo?: string
  veiculos: ItemVeiculoLote[]
  modoBusca?: 'NORMAL' | 'RAPIDO'
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
  debitos?: {
    ipva: SituacaoDebito
    licenciamento: SituacaoDebito
  }
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
  filtros?: BaseFiltros & { status?: string }
): Promise<HistoricoDetranResult> {
  const response = await api.get<InfracaoDetran[]>('/detran/historico', {
    params: {
      page: filtros?.pagina,
      limit: filtros?.limite,
      busca: filtros?.busca,
      status: filtros?.status,   // ← NOVO
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


/* ==========================================================================
 * EXPORTAÇÃO EM ZIP
 * ========================================================================*/

/**
 * Exporta as multas do DETRAN em ZIP.
 *
 * - Se `ids` for passado e não vazio, exporta só as consultas com aqueles IDs.
 * - Se `ids` for vazio/undefined, exporta TODAS as consultas com PDF disponível.
 *
 * O ZIP vem com uma pasta por placa e arquivos `MULTA-AIT-<data>.pdf`.
 */
export async function exportarMultasDetran(ids?: number[]): Promise<void> {
  try {
    const response = await api.post(
      '/detran/exportar',
      { ids: ids?.length ? ids : undefined },
      { responseType: 'blob' }
    )

    const nomeArquivo = extrairNomeArquivo(
      response.headers as Record<string, any>,
      `multas_detran_${new Date().toISOString().slice(0, 10)}.zip`
    )

    dispararDownload(response.data as Blob, nomeArquivo)
  } catch (err: any) {
    // O backend erra com JSON, mas como pedimos blob, o corpo chega como Blob.
    // Convertemos de volta pra ler a mensagem legível.
    const blob = err?.response?.data
    if (blob instanceof Blob) {
      try {
        const texto = await blob.text()
        const json = JSON.parse(texto)
        const mensagem =
          json?.error?.message ||
          json?.message ||
          'Erro ao exportar multas.'
        const e: any = new Error(mensagem)
        e.code = json?.error?.code || 'DETRAN_EXPORT_ERROR'
        e.status = err.response.status
        throw e
      } catch (parseErr: any) {
        // Se nem for JSON parseável, mantém o erro original
        if (parseErr?.message?.startsWith('Erro ao')) throw parseErr
      }
    }
    throw err
  }
}

/* ==========================================================================
 * Helpers internos de download
 * ========================================================================*/

function extrairNomeArquivo(
  headers: Record<string, any> | undefined,
  fallback: string
): string {
  const cd =
    headers?.['content-disposition'] ??
    headers?.['Content-Disposition']

  if (!cd || typeof cd !== 'string') return fallback

  // filename*=UTF-8''nome.zip (RFC 5987)
  const matchExt = cd.match(/filename\*=UTF-8''([^;]+)/i)
  if (matchExt?.[1]) {
    try {
      return decodeURIComponent(matchExt[1])
    } catch {
      /* cai no próximo */
    }
  }

  // filename="nome.zip"
  const matchSimples = cd.match(/filename="?([^";]+)"?/i)
  if (matchSimples?.[1]) return matchSimples[1].trim()

  return fallback
}

function dispararDownload(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.style.display = 'none'

  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // Dá um tempo pro browser engatar o download antes de revogar a URL.
  // Safari cancela se revogar na mesma hora.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export interface RelatoriosDetran {
  contratosDisponiveis: Array<{ id: string; nome: string }>
  resumo: {
    veiculosNoHistorico: number
    consultasConcluidas: number
    veiculosComMultas: number
    veiculosComDebitos: number
    ipvaComDebito: number
    licenciamentoComDebito: number
    multasAtivas: number
    boletosDisponiveis: number
    multasComValor: number
    multasComValorPagar: number
    valorTotalMultasAtivas: number
    valorTotalParaPagamento: number
  }
  situacoes: {
    ipvaDebito: number
    ipvaRegular: number
    ipvaInformativo: number
    ipvaNaoIdentificado: number
    licenciamentoDebito: number
    licenciamentoRegular: number
    licenciamentoInformativo: number
    licenciamentoNaoIdentificado: number
  }
  multasPorVeiculo: Array<{
    placa: string
    modelo: string | null
    contrato: string | null
    qtdMultasAtivas: number
    multasAtivasComValor: number
    valorMultasAtivas: number
    qtdMultasHistorico: number
    multasHistoricoComValor: number
    valorMultasHistorico: number
  }>
  valoresPorContrato: Array<{
    id: string
    contrato: string
    valorMultasAtivas: number
    qtdMultasAtivas: number
  }>
  evolucaoMensalContratos: {
    /** Multas ativas cuja data de infração não pôde ser lida (ficam fora do gráfico). */
    multasSemData: number
    /** Um item por mês ("AAAA-MM"); `valores` é indexado pelo id do contrato. */
    meses: Array<{ mes: string; valores: Record<string, number> }>
  }
}

export async function buscarRelatoriosDetran(contratos: string[] = []): Promise<RelatoriosDetran> {
  const response = await api.get<RelatoriosDetran>('/detran/relatorios', {
    params: { contratos: contratos.length ? JSON.stringify(contratos) : undefined },
  })
  return response.data
}