// src/renderer/services/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3333/api',
  timeout: 10000,
})

// ==========================================
// INTERFACES & REQUISIÇÕES - INFRAÇÕES
// ==========================================

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

export interface HistoricoResponse {
  data: Infracao[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface HistoricoFiltros {
  busca?: string
  dataInicio?: string
  dataFim?: string
  pagina?: number
  limite?: number
}

export interface SincronizacaoResponse {
  message: string
  novos_registros: number
  total_processados?: number
}

export async function buscarHistoricoInfracoes(
  filtros: HistoricoFiltros = {}
): Promise<HistoricoResponse> {
  const response = await api.get<HistoricoResponse>('/infracoes/historico', {
    params: {
      page: filtros.pagina,
      limit: filtros.limite,
      busca: filtros.busca || undefined,
      dataInicio: filtros.dataInicio || undefined,
      dataFim: filtros.dataFim || undefined
    }
  })
  return response.data
}

export async function listarInfracoes(): Promise<Infracao[]> {
  const response = await api.get<Infracao[]>('/infracoes')
  return response.data
}

export async function enviarEmailInfracao(id: number): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(`/infracoes/${id}/enviar-email`)
  return response.data
}

export async function sincronizarDadosWialon(): Promise<SincronizacaoResponse> {
  const response = await api.post<SincronizacaoResponse>('/sincronizar')
  return response.data
}

// ==========================================
// INTERFACES & REQUISIÇÕES - CONFIGURAÇÕES
// ==========================================

export interface Configuracao {
  chave: string
  valor: string
}

export async function listarConfiguracoes(): Promise<Configuracao[]> {
  const response = await api.get<Configuracao[]>('/configuracoes')
  return response.data
}

export async function obterConfiguracao(chave: string): Promise<Configuracao> {
  const response = await api.get<Configuracao>(`/configuracoes/${chave}`)
  return response.data
}

export async function criarConfiguracao(chave: string, valor: string): Promise<Configuracao> {
  const response = await api.post<Configuracao>('/configuracoes', { chave, valor })
  return response.data
}

export async function atualizarConfiguracao(chave: string, valor: string): Promise<Configuracao> {
  const response = await api.put<Configuracao>(`/configuracoes/${chave}`, { valor })
  return response.data
}

export async function deletarConfiguracao(chave: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/configuracoes/${chave}`)
  return response.data
}