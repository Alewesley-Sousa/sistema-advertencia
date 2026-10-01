/**
 * @fileoverview Repository para persistência e leitura das consultas e lotes do DETRAN.
 */

import { db } from '../../../database/db'
import type { MultaDetran } from '../types'
import { chaveMulta } from '../utils'

/* ============================================================================
 * TIPOS
 * ==========================================================================*/

export interface InfracaoDetranRecord {
  id?: number
  lote_id?: number | null
  placa: string
  chassi: string
  status_consulta: 'PENDENTE' | 'PROCESSANDO' | 'QUITADO' | 'COM_DEBITO' | 'ERRO' | string
  tipo_debito?: string | null
  caminho_pdf?: string | null
  mensagem_erro?: string | null
}

export interface MultaDetranRecord {
  id: number
  ait: string
  dataInfracao: string
  dataVencimento?: string | null
  motivo?: string | null
  valor?: string | null
  valorPagar?: string | null
  caminhoPdf?: string | null
  erroEmissao?: string | null
  createdAt: string
}

/** Resultado de `salvarMultas` */
export interface SalvarMultasResult {
  inseridas: number
  atualizadas: number
}

/* ============================================================================
 * REPOSITORY
 * ==========================================================================*/

export const detranRepository = {
  /* ========================================================================
   * CONSULTAS
   * ======================================================================*/

  criarConsultaIncial(placa: string, chassi: string): number {
    const stmt = db.prepare(`
      INSERT INTO infracoes_detran (placa, chassi, status_consulta)
      VALUES (?, ?, 'PROCESSANDO')
    `)
    const result = stmt.run(placa, chassi)
    return Number(result.lastInsertRowid)
  },

  /** Busca a consulta existente por (placa, chassi). */
  buscarPorPlacaChassi(placa: string, chassi: string) {
    return db
      .prepare(
        `SELECT id, status_consulta, updated_at
         FROM infracoes_detran
         WHERE placa = ? AND chassi = ?
         LIMIT 1`
      )
      .get(placa.toUpperCase().trim(), chassi.toUpperCase().trim()) as
      | { id: number; status_consulta: string; updated_at: string }
      | undefined
  },

  /**
   * Upsert da consulta: se já existe pra (placa, chassi), reaproveita o ID
   * e volta status pra PROCESSANDO. Senão, cria uma linha nova.
   */
  obterOuCriarConsulta(placa: string, chassi: string): number {
    const placaUp = placa.toUpperCase().trim()
    const chassiUp = chassi.toUpperCase().trim()

    const existente = this.buscarPorPlacaChassi(placaUp, chassiUp)
    if (existente) {
      db.prepare(
        `UPDATE infracoes_detran
         SET status_consulta = 'PROCESSANDO',
             mensagem_erro = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(existente.id)

      return existente.id
    }

    return this.criarConsultaIncial(placaUp, chassiUp)
  },

  atualizarResultadoConsulta(
    id: number,
    resultado: {
      statusConsulta: string
      tipoDebito?: string | null
      caminhoPdf?: string | null
      mensagemErro?: string | null
    }
  ) {
    const stmt = db.prepare(`
      UPDATE infracoes_detran
      SET status_consulta = ?,
          tipo_debito = ?,
          caminho_pdf = ?,
          mensagem_erro = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    return stmt.run(
      resultado.statusConsulta,
      resultado.tipoDebito || null,
      resultado.caminhoPdf || null,
      resultado.mensagemErro || null,
      id
    )
  },

  buscarPorId(id: number) {
    const stmt = db.prepare(
      'SELECT id, caminho_pdf, placa FROM infracoes_detran WHERE id = ?'
    )
    return stmt.get(id) as
      | { id: number; caminho_pdf?: string; placa?: string }
      | undefined
  },

  listar({
    busca,
    status,
    limit,
    offset,
  }: {
    busca?: string
    status?: string
    limit: number
    offset: number
  }) {
    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (busca) {
      whereClause += ' AND (c.placa LIKE ? OR c.chassi LIKE ?)'
      params.push(`%${busca}%`, `%${busca}%`)
    }

    if (status) {
      whereClause += ' AND c.status_consulta = ?'
      params.push(status)
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM infracoes_detran c
      ${whereClause}
    `
    const total = (db.prepare(countQuery).get(...params) as { total: number }).total

    // O guard "m.id IS NOT NULL" é obrigatório: com LEFT JOIN, consultas
    // sem multas geram uma linha fantasma com m.* = NULL. Sem o guard,
    // os CASE que testam "vazio/ausente" dariam TRUE nessa linha e
    // inventariam uma falha inexistente.
    const dataQuery = `
      SELECT
        c.id,
        c.placa,
        c.chassi,
        c.status_consulta AS statusConsulta,
        c.tipo_debito     AS tipoDebito,
        c.caminho_pdf     AS caminhoPdf,
        c.mensagem_erro   AS mensagemErro,
        c.created_at,
        c.updated_at,

        COUNT(m.id) AS qtdMultas,

        COUNT(m.caminho_pdf) AS qtdBoletosBaixados,

        COALESCE(SUM(
          CASE
            WHEN m.id IS NOT NULL
             AND m.erro_emissao IS NOT NULL
             AND m.erro_emissao <> ''
            THEN 1 ELSE 0
          END
        ), 0) AS qtdBoletosIndisponiveis,

        COALESCE(SUM(
          CASE
            WHEN m.id IS NOT NULL
             AND (m.caminho_pdf IS NULL OR m.caminho_pdf = '')
             AND (m.erro_emissao IS NULL OR m.erro_emissao = '')
            THEN 1 ELSE 0
          END
        ), 0) AS qtdBoletosFalhas

      FROM infracoes_detran c
      LEFT JOIN infracoes_detran_multas m
        ON m.detran_consulta_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT ? OFFSET ?
    `
    const data = db.prepare(dataQuery).all(...params, limit, offset)

    return { data, total }
  },

  /* ========================================================================
   * LOTES
   * ======================================================================*/

  // repositories/detranRepository.ts

  /**
   * Cria um "lote" — que aqui é só um agrupador pra ter id e contar progresso.
   * Não insere nada em `infracoes_detran` — cada veículo vira uma consulta
   * individual via `obterOuCriarConsulta` na hora de processar.
   */
  criarLote(nomeArquivo: string, totalVeiculos: number): number {
    const stmt = db.prepare(`
    INSERT INTO lotes_consultas (nome_arquivo, status, total_veiculos, processados)
    VALUES (?, 'PROCESSANDO', ?, 0)
  `)
    const result = stmt.run(nomeArquivo, totalVeiculos)
    return Number(result.lastInsertRowid)
  },

  atualizarStatus(id: number, status: string) {
    db.prepare(`UPDATE infracoes_detran SET status_consulta = ? WHERE id = ?`).run(
      status,
      id
    )
  },

  incrementarProgressoLote(loteId: number) {
    return db.prepare(`
    UPDATE lotes_consultas
    SET processados = processados + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(loteId)
  },
  /* ========================================================================
   * MULTAS INDIVIDUAIS
   * ======================================================================*/

  /**
   * Retorna o conjunto de chaves "AIT|DATA_INFRACAO" que já foram baixadas
   * com sucesso pra essa placa.
   *
   * Multas com `erro_emissao` NÃO entram (tentamos de novo).
   */
  buscarChavesJaBaixadas(placa: string): Set<string> {
    const rows = db
      .prepare(
        `SELECT ait, data_infracao
         FROM infracoes_detran_multas
         WHERE placa = ?
           AND caminho_pdf IS NOT NULL
           AND (erro_emissao IS NULL OR erro_emissao = '')`
      )
      .all(placa.toUpperCase().trim()) as Array<{
        ait: string
        data_infracao: string
      }>

    return new Set(rows.map((r) => chaveMulta(r.ait, r.data_infracao)))
  },

  /**
   * Busca, pra uma placa, um mapa de chave ("AIT|DATA") → ID de registro existente.
   *
   * Usado pelo `salvarMultas` pra decidir entre INSERT e UPDATE sem fazer
   * N SELECTs (uma consulta só, depois lookup em memória).
   */
  buscarIdsPorChave(placa: string): Map<string, number> {
    const rows = db
      .prepare(
        `SELECT id, ait, data_infracao
         FROM infracoes_detran_multas
         WHERE placa = ?`
      )
      .all(placa.toUpperCase().trim()) as Array<{
        id: number
        ait: string
        data_infracao: string
      }>

    const mapa = new Map<string, number>()
    for (const r of rows) {
      mapa.set(chaveMulta(r.ait, r.data_infracao), r.id)
    }
    return mapa
  },

  /**
   * Upsert das multas por chave natural (placa, ait, data_infracao).
   *
   * Regras:
   *   - `jaBaixada: true` são ignoradas (já existem no banco com sucesso)
   *   - Chave já existente → UPDATE (re-tentativa após erro, ou
   *     transição erro→sucesso se conseguiu baixar dessa vez)
   *   - Chave nova → INSERT
   *
   * Retorna { inseridas, atualizadas }.
   */
  salvarMultas(
    consultaId: number,
    placa: string,
    multas: MultaDetran[]
  ): SalvarMultasResult {
    const paraSalvar = multas.filter((m) => !m.jaBaixada)
    if (!paraSalvar.length) {
      return { inseridas: 0, atualizadas: 0 }
    }

    const placaUp = placa.toUpperCase().trim()

    const stmtInsert = db.prepare(`
      INSERT INTO infracoes_detran_multas
        (detran_consulta_id, placa, ait, data_infracao, data_vencimento,
         motivo, valor, valor_pagar, caminho_pdf, erro_emissao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const stmtUpdate = db.prepare(`
      UPDATE infracoes_detran_multas
      SET detran_consulta_id = ?,
          data_vencimento = ?,
          motivo = ?,
          valor = ?,
          valor_pagar = ?,
          caminho_pdf = ?,
          erro_emissao = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    // Mapa chave→id existente (uma query só)
    const existentes = this.buscarIdsPorChave(placaUp)

    return db.transaction(() => {
      let inseridas = 0
      let atualizadas = 0

      for (const m of paraSalvar) {
        const chave = chaveMulta(m.ait, m.dataInfracao)
        const idExistente = existentes.get(chave)

        if (idExistente) {
          // UPDATE — mantém o ID, atualiza o resultado
          stmtUpdate.run(
            consultaId,
            m.dataVencimento || null,
            m.motivo || null,
            m.valor || null,
            m.valorPagar || null,
            m.caminhoPdf || null,
            m.erroEmissao || null,
            idExistente
          )
          atualizadas++
        } else {
          // INSERT — primeira vez que vemos essa multa
          stmtInsert.run(
            consultaId,
            placaUp,
            m.ait,
            m.dataInfracao || '',
            m.dataVencimento || null,
            m.motivo || null,
            m.valor || null,
            m.valorPagar || null,
            m.caminhoPdf || null,
            m.erroEmissao || null
          )
          inseridas++
        }
      }

      return { inseridas, atualizadas }
    })()
  },

  listarMultasPorConsulta(consultaId: number): MultaDetranRecord[] {
    return db
      .prepare(
        `SELECT
           id,
           ait,
           data_infracao   AS dataInfracao,
           data_vencimento AS dataVencimento,
           motivo,
           valor,
           valor_pagar     AS valorPagar,
           caminho_pdf     AS caminhoPdf,
           erro_emissao    AS erroEmissao,
           created_at      AS createdAt
         FROM infracoes_detran_multas
         WHERE detran_consulta_id = ?
         ORDER BY data_infracao DESC, id DESC`
      )
      .all(consultaId) as MultaDetranRecord[]
  },

  buscarMultaPorId(id: number) {
    return db
      .prepare(
        `SELECT id, placa, ait, data_infracao, caminho_pdf, erro_emissao
         FROM infracoes_detran_multas
         WHERE id = ?`
      )
      .get(id) as
      | {
        id: number
        placa: string
        ait: string
        data_infracao: string
        caminho_pdf?: string | null
        erro_emissao?: string | null
      }
      | undefined
  },

  contarMultasPorConsulta(consultaId: number): number {
    const row = db
      .prepare(
        `SELECT COUNT(*) as total
         FROM infracoes_detran_multas
         WHERE detran_consulta_id = ?`
      )
      .get(consultaId) as { total: number }

    return row.total
  },

  /**
 * Busca o lote por ID.
 */
  buscarLotePorId(id: number) {
    return db
      .prepare(
        `SELECT id, nome_arquivo, status, total_veiculos, processados, item_atual, updated_at
       FROM lotes_consultas
       WHERE id = ?`
      )
      .get(id) as
      | {
        id: number
        nome_arquivo: string
        status: 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO'
        total_veiculos: number
        processados: number
        item_atual: string | null
        updated_at: string
      }
      | undefined
  },

  /**
   * Marca qual placa está sendo processada agora.
   */
  atualizarItemAtualLote(loteId: number, placa: string) {
    db.prepare(
      `UPDATE lotes_consultas
     SET item_atual = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
    ).run(placa, loteId)
  },

  /**
   * Marca o lote como concluído e limpa `item_atual`.
   */
  finalizarLote(loteId: number) {
    db.prepare(
      `UPDATE lotes_consultas
     SET status = 'CONCLUIDO',
         item_atual = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
    ).run(loteId)
  },

  /**
   * Retorna todas as multas com PDF válido em disco, agrupáveis por placa.
   * Se `ids` for passado, restringe às consultas com esses IDs.
   */
  listarParaExportacao(ids?: number[]): Array<{
    consultaId: number
    placa: string
    chassi: string
    multaId: number
    ait: string
    dataInfracao: string
    caminhoPdf: string
  }> {
    let where = 'WHERE 1=1'
    const params: any[] = []

    if (ids?.length) {
      where += ` AND c.id IN (${ids.map(() => '?').join(',')})`
      params.push(...ids)
    }

    return db.prepare(`
    SELECT
      c.id           AS consultaId,
      c.placa,
      c.chassi,
      m.id           AS multaId,
      m.ait,
      m.data_infracao AS dataInfracao,
      m.caminho_pdf   AS caminhoPdf
    FROM infracoes_detran c
    INNER JOIN infracoes_detran_multas m
      ON m.detran_consulta_id = c.id
    ${where}
      AND m.caminho_pdf IS NOT NULL
      AND m.caminho_pdf <> ''
    ORDER BY c.placa ASC, m.data_infracao DESC, m.id DESC
  `).all(...params) as any
  }

}

