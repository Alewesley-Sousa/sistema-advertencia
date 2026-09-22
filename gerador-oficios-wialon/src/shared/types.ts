// src/shared/types.ts

// ==========================================
// TIPOS DO MÓDULO DETRAN-CE (IPC & SCRAPING)
// ==========================================

export type StatusConsultaDetran = 'PENDENTE' | 'PROCESSANDO' | 'QUITADO' | 'COM_DEBITO' | 'ERRO';
export type TipoDebitoDetran = 'MULTA' | 'IPVA' | 'LICENCIAMENTO' | null;
export type StatusLoteDetran = 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO';

/**
 * Representa um veículo/infração na consulta do DETRAN-CE
 */
export interface InfracaoDetran {
  id: string; // UUID do SQLite local
  loteId?: string | null;
  identificadorVeiculo?: string | null;
  placa: string;
  chassi: string;
  statusConsulta: StatusConsultaDetran;
  tipoDebito?: TipoDebitoDetran;
  caminhoPdf?: string | null;
  mensagemErro?: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * Controle do lote de execução
 */
export interface LoteConsultaDetran {
  id: string;
  nomeArquivo?: string | null;
  status: StatusLoteDetran;
  totalVeiculos: number;
  processados: number;
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * Payload transmitido via IPC (Main Process -> Renderer) para atualização em tempo real
 */
export interface DetranProgressoPayload {
  loteId: string;
  processados: number;
  total: number;
  percentual: number;
  itemAtual: string; // Ex: Placa que está sendo consultada
  statusItem?: StatusConsultaDetran;
}