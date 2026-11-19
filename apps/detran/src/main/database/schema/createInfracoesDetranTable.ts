// database/migrations.ts

import { db } from '../db'

export function createInfracoesDetranTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS infracoes_detran (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lote_id INTEGER,
      identificador_veiculo TEXT,
      placa TEXT NOT NULL,
      chassi TEXT NOT NULL,
      modelo TEXT,
      contrato TEXT,
      status_consulta TEXT CHECK(status_consulta IN ('PENDENTE', 'PROCESSANDO', 'QUITADO', 'COM_DEBITO', 'ERRO')) DEFAULT 'PENDENTE',
      tipo_debito TEXT,
      ipva_status TEXT,
      licenciamento_status TEXT,
      caminho_pdf TEXT,
      mensagem_erro TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lote_id) REFERENCES lotes_consultas(id) ON DELETE CASCADE
    );
  `)

  const colunas = db
    .prepare('PRAGMA table_info(infracoes_detran)')
    .all() as Array<{ name: string }>
  const nomesColunas = new Set(colunas.map((coluna) => coluna.name))

  if (!nomesColunas.has('ipva_status')) {
    db.exec('ALTER TABLE infracoes_detran ADD COLUMN ipva_status TEXT')
  }

  if (!nomesColunas.has('licenciamento_status')) {
    db.exec('ALTER TABLE infracoes_detran ADD COLUMN licenciamento_status TEXT')
  }

  if (!nomesColunas.has('modelo')) {
    db.exec('ALTER TABLE infracoes_detran ADD COLUMN modelo TEXT')
  }

  if (!nomesColunas.has('contrato')) {
    db.exec('ALTER TABLE infracoes_detran ADD COLUMN contrato TEXT')
  }

}

/**
 * Tabela de multas individuais de cada consulta DETRAN.
 *
 * Chave natural: (placa, ait, data_infracao)
 *   - `ait` é único por auto de infração
 *   - `data_infracao` entra como proteção contra reemissões do DETRAN
 *
 * ATENÇÃO — `baixado_em`:
 *   - Gravada com `datetime('now', 'localtime')` (NÃO `CURRENT_TIMESTAMP`, que é UTC).
 *   - Usada para decidir re-download: só pula se for do dia corrente local.
 *   - `NULL` = nunca baixado com sucesso (ou linha legada).
 */
export function createInfracoesDetranMultasTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS infracoes_detran_multas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      detran_consulta_id INTEGER NOT NULL,
      placa TEXT NOT NULL,
      ait TEXT NOT NULL,
      data_infracao TEXT NOT NULL,
      data_vencimento TEXT,
      motivo TEXT,
      valor TEXT,
      valor_pagar TEXT,
      caminho_pdf TEXT,
      erro_emissao TEXT,
      baixado_em TEXT,
      ativa INTEGER NOT NULL DEFAULT 1 CHECK(ativa IN (0, 1)),
      ultima_consulta_em TEXT,
      inativada_em TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (detran_consulta_id) REFERENCES infracoes_detran(id) ON DELETE CASCADE
    );
  `)

  const colunas = db
    .prepare('PRAGMA table_info(infracoes_detran_multas)')
    .all() as Array<{ name: string }>
  const nomesColunas = new Set(colunas.map((coluna) => coluna.name))

  if (!nomesColunas.has('ativa')) {
    db.exec(
      'ALTER TABLE infracoes_detran_multas ADD COLUMN ativa INTEGER NOT NULL DEFAULT 1'
    )
  }

  if (!nomesColunas.has('ultima_consulta_em')) {
    db.exec(
      'ALTER TABLE infracoes_detran_multas ADD COLUMN ultima_consulta_em TEXT'
    )
  }

  if (!nomesColunas.has('inativada_em')) {
    db.exec(
      'ALTER TABLE infracoes_detran_multas ADD COLUMN inativada_em TEXT'
    )
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_detran_multas_placa_chave
      ON infracoes_detran_multas (placa, ait, data_infracao);

    CREATE INDEX IF NOT EXISTS idx_detran_multas_consulta
      ON infracoes_detran_multas (detran_consulta_id);

    CREATE INDEX IF NOT EXISTS idx_detran_multas_placa_baixado_em
      ON infracoes_detran_multas (placa, baixado_em);

    CREATE INDEX IF NOT EXISTS idx_detran_multas_placa_ativa
      ON infracoes_detran_multas (placa, ativa);
  `)
}