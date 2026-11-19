import { createInfracoesDetranTable, createInfracoesDetranMultasTable } from './schema/createInfracoesDetranTable'
import { createLotesConsultasTable, migrateLotesConsultasAddItemAtual } from './schema/createLotesConsultasTable'

export function initDatabase() {
  createLotesConsultasTable()
  migrateLotesConsultasAddItemAtual()
  createInfracoesDetranMultasTable()
  createInfracoesDetranTable()

  console.log('[Database] Tabelas e schemas do app DETRAN-CE inicializados com sucesso.')
}
