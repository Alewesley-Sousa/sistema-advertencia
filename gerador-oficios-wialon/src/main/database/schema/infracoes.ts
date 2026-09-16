import { db } from '../db'

export function createInfracoesTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS infracoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT UNIQUE,
      item_id INTEGER,
      placa TEXT NOT NULL,
      condutor TEXT,
      velocidade REAL NOT NULL,
      limite_via REAL,
      data_hora TEXT DEFAULT CURRENT_TIMESTAMP,
      latitude REAL,
      longitude REAL,
      endereco TEXT,
      pdf_path TEXT,
      status TEXT CHECK(status IN ('PENDENTE', 'GERADO', 'ENVIADO', 'ERRO')) DEFAULT 'PENDENTE',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)
}