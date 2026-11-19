import { db } from '../db'

/**
 * Tabelas da automação semanal.
 *
 * `automacao_cofre` guarda a lista de veículos SOMENTE cifrada (AES-256-GCM);
 * `total_veiculos` é o único dado em claro (uma contagem, sem identificar ninguém).
 * `automacao_execucoes` é o histórico das rodadas — sem placas, e-mails ou chaves.
 */
export function createAutomacaoTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS automacao_cofre (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload_cifrado TEXT NOT NULL,
      total_veiculos INTEGER NOT NULL,
      atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS automacao_execucoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origem TEXT NOT NULL CHECK (origem IN ('AGENDADA', 'MANUAL')),
      status TEXT NOT NULL CHECK (status IN ('EXECUTANDO', 'CONCLUIDA', 'PARCIAL', 'FALHA')),
      total_veiculos INTEGER NOT NULL DEFAULT 0,
      com_erro INTEGER NOT NULL DEFAULT 0,
      email_enviado INTEGER NOT NULL DEFAULT 0,
      mensagem TEXT,
      iniciada_em TEXT DEFAULT CURRENT_TIMESTAMP,
      finalizada_em TEXT
    );
  `)
}
