import { createInfracoesTable } from './schema/infracoes'
import { createConfiguracoesTable } from './schema/configuracoes'

export function initDatabase() {
  createInfracoesTable()
  createConfiguracoesTable()
  console.log('[Database] Todas as tabelas e schemas foram inicializados com sucesso.')
}