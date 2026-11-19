import { createInfracoesTable } from './schema/infracoes'
import { createConfiguracoesTable } from './schema/configuracoes'

export function initDatabase() {
  createInfracoesTable()
  createConfiguracoesTable()

  console.log('[Database] Tabelas e schemas do app Wialon inicializados com sucesso.')
}