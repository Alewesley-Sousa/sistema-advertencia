// src/renderer/services/configuracoes.ts

import { api } from './api'
import { type MessageResponse } from '../types/api'

export interface Configuracao {
  chave: string
  valor: string
}

export async function listarConfiguracoes(): Promise<Configuracao[]> {
  const response = await api.get<Configuracao[]>('/configuracoes')
  return response.data
}

/**
 * Upsert — cria se não existir, atualiza se existir.
 * Corresponde ao `INSERT ... ON CONFLICT(chave) DO UPDATE` do backend.
 * Uma única rota, sem precisar checar existência antes.
 */
export async function salvarConfiguracao(
  chave: string,
  valor: string
): Promise<Configuracao> {
  const response = await api.post<Configuracao>('/configuracoes', { chave, valor })
  return response.data
}

export async function deletarConfiguracao(chave: string): Promise<MessageResponse> {
  const response = await api.delete<MessageResponse>(`/configuracoes/${chave}`)
  return response.data
}