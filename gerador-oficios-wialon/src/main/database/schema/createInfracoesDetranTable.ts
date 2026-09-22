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
      status_consulta TEXT CHECK(status_consulta IN ('PENDENTE', 'PROCESSANDO', 'QUITADO', 'COM_DEBITO', 'ERRO')) DEFAULT 'PENDENTE',
      tipo_debito TEXT,
      caminho_pdf TEXT,
      mensagem_erro TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lote_id) REFERENCES lotes_consultas(id) ON DELETE CASCADE
    );
  `)
}

/**
 * Tabela de multas individuais de cada consulta DETRAN.
 *
 * Chave natural: (placa, ait, data_infracao)
 *   - `ait` é único por auto de infração
 *   - `data_infracao` entra como proteção contra reemissões do DETRAN
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (detran_consulta_id) REFERENCES infracoes_detran(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_detran_multas_placa_chave
      ON infracoes_detran_multas (placa, ait, data_infracao);

    CREATE INDEX IF NOT EXISTS idx_detran_multas_consulta
      ON infracoes_detran_multas (detran_consulta_id);
  `)
}