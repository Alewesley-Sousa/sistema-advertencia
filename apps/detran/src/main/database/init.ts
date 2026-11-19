import { createInfracoesDetranTable, createInfracoesDetranMultasTable } from './schema/createInfracoesDetranTable'
import { createLotesConsultasTable, migrateLotesConsultasAddItemAtual } from './schema/createLotesConsultasTable'

import { createAutomacaoTables } from './schema/createAutomacaoTables'

export function initDatabase() {
  createLotesConsultasTable()
  migrateLotesConsultasAddItemAtual()
  createInfracoesDetranMultasTable()
  createInfracoesDetranTable()
  createAutomacaoTables()

  console.log('[Database] Tabelas e schemas do app DETRAN-CE inicializados com sucesso.')
}
