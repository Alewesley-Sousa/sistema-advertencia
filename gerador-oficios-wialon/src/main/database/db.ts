import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

// Força o caminho absoluto na raiz do projeto atual
const rootDir = process.cwd()
const storageDir = path.resolve(rootDir, 'storage')

if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true })
}

const dbPath = path.join(storageDir, 'database.sqlite')
export const db = new Database(dbPath)

// Habilitar Foreign Keys e otimização WAL
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initDatabase() {
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
      status TEXT CHECK(status IN ('PENDENTE', 'GERADO', 'ERRO')) DEFAULT 'PENDENTE',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)
  console.log(`[Database] Inicializado com sucesso em: ${dbPath}`)
}