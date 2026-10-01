// src/renderer/features/detran/types.ts

export type ProgressoItemStatus = 'ok' | 'erro' | 'pulado'

export interface ProgressoItem {
  placa: string
  status: ProgressoItemStatus
  /** Mensagem curta de contexto (ex: "3 multas", "DETRAN recusou") */
  mensagem?: string
}

export type ProgressoStatus = 'PROCESSANDO' | 'CONCLUIDO' | 'CANCELADO' | 'ERRO'

export interface DetranProgresso {
  loteId: string
  processados: number
  total: number
  percentual: number
  /** Placa sendo processada agora (ou última que foi) */
  itemAtual: string
  status: ProgressoStatus
  /** Histórico de itens processados — usado pro log da barra */
  itens?: ProgressoItem[]
  /** 'simulacao' mostra um badge amarelo indicando que não é real */
  variante?: 'real' | 'simulacao'
}

/* ==========================================================================
 * Boletos
 * ======================================================================== */

/**
 * Estado derivado de cada boleto de multa.
 *
 * Não vem do backend — é calculado a partir de:
 *   - `caminhoPdf`  → BAIXADO
 *   - `erroEmissao` → FALHA
 *   - nenhum dos dois → PENDENTE
 */
export type BoletoStatus = 'BAIXADO' | 'FALHA' | 'PENDENTE'

export interface ResumoBoletos {
  baixados: number
  falhas: number
  pendentes: number
  total: number
}