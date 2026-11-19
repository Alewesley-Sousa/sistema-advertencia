// database/migrations.ts

import { db } from '../db'

export function createLotesConsultasTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lotes_consultas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_arquivo TEXT NOT NULL,
      status TEXT CHECK(status IN ('PROCESSANDO', 'CONCLUIDO', 'ERRO')) DEFAULT 'PROCESSANDO',
      total_veiculos INTEGER NOT NULL DEFAULT 0,
      processados INTEGER NOT NULL DEFAULT 0,
      item_atual TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

/**
 * Migração incremental pra bancos que já existem.
 * Adiciona `item_atual` se ainda não estiver lá.
 */
export function migrateLotesConsultasAddItemAtual() {
  const cols = db.prepare(`PRAGMA table_info(lotes_consultas)`).all() as Array<{
    name: string
  }>

  const temItemAtual = cols.some((c) => c.name === 'item_atual')
  if (!temItemAtual) {
    db.exec(`ALTER TABLE lotes_consultas ADD COLUMN item_atual TEXT`)
  }
}