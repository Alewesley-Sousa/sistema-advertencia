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