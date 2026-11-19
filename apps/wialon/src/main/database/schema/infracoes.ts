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
  data_hora TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  endereco TEXT,
  pdf_path TEXT,
  status TEXT CHECK(
    status IN (
      'PENDENTE',
      'REGISTRADO',
      'GERADO',
      'ENVIADO',
      'ERRO',
      'DESCARTADO',
      'IGNORADO_MENOR_GRAVIDADE'
    )
  ) DEFAULT 'PENDENTE',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
  `)
}