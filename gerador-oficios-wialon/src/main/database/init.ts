import { createInfracoesTable } from './schema/infracoes'
import { createConfiguracoesTable } from './schema/configuracoes'
import { createInfracoesDetranTable, createInfracoesDetranMultasTable } from './schema/createInfracoesDetranTable'
import { createLotesConsultasTable, migrateLotesConsultasAddItemAtual } from './schema/createLotesConsultasTable'

export function initDatabase() {
  createInfracoesTable()
  createConfiguracoesTable()
  createLotesConsultasTable()
  migrateLotesConsultasAddItemAtual()
  createInfracoesDetranMultasTable()
  createInfracoesDetranTable()

  console.log('[Database] Todas as tabelas e schemas foram inicializados com sucesso.')
}