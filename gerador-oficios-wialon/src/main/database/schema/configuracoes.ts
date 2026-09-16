import { db } from '../db'

export function createConfiguracoesTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    INSERT OR IGNORE INTO configuracoes (chave, valor) 
    VALUES ('email_notificacao', 'rh@empresa.com.br');
  `)
}