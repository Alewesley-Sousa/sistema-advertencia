import { createInfracoesDetranTable, createInfracoesDetranMultasTable } from './schema/createInfracoesDetranTable'
import { createLotesConsultasTable, migrateLotesConsultasAddItemAtual } from './schema/createLotesConsultasTable'

import { createAutomacaoTables } from './schema/createAutomacaoTables'
import { criarTabelaDispositivos } from '../seguranca/dispositivos'
import { db } from './db'

export function initDatabase() {
  createLotesConsultasTable()
  migrateLotesConsultasAddItemAtual()
  createInfracoesDetranMultasTable()
  createInfracoesDetranTable()
  createAutomacaoTables()
  criarTabelaDispositivos(db as any)

  console.log('[Database] Tabelas e schemas do app DETRAN-CE inicializados com sucesso.')
}
