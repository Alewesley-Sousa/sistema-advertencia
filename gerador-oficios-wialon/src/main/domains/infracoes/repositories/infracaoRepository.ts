/**
 * @fileoverview Repository para persistência e leitura das infrações.
 *
 * Responsabilidades:
 * - Persistir infrações recebidas da Wialon.
 * - Consultar infrações.
 * - Filtrar histórico e visão operacional.
 * - Controlar estados de processamento do ofício.
 *
 * Observação:
 * - data_hora = data/hora em que a infração aconteceu.
 * - created_at = momento em que o sistema registrou a infração.
 */

import { db } from '../../../database/db'

export type StatusInfracao =
  | 'REGISTRADO'
  | 'PENDENTE'
  | 'GERADO'
  | 'ENVIADO'
  | 'IGNORADO_MENOR_GRAVIDADE'
  | 'ERRO'

export interface InfracaoInput {
  task_id?: string | null
  item_id?: number | null
  placa: string
  condutor: string
  velocidade: number
  latitude?: number | null
  longitude?: number | null
  endereco?: string | null

  /**
   * Momento em que a infração aconteceu na Wialon.
   * Formato esperado: YYYY-MM-DD HH:mm:ss
   */
  data_evento_wialon?: string | null

  status?: StatusInfracao
}

export interface InfracaoRecord {
  id: number
  task_id: string | null
  item_id: number | null
  placa: string
  condutor: string
  velocidade: number
  data_hora: string
  latitude: number | null
  longitude: number | null
  endereco: string | null
  pdf_path: string | null
  created_at: string
  updated_at: string
  status: StatusInfracao
}

export interface HistoricoFilterParams {
  busca?: string
  dataInicio?: string
  dataFim?: string
  page: number
  limit: number
}

export const infracaoRepository = {
  /* ==========================================================================
   * CRIAÇÃO
   * ======================================================================== */

  salvar(dados: InfracaoInput) {
    const stmt = db.prepare(`
      INSERT INTO infracoes (
        task_id,
        item_id,
        placa,
        condutor,
        velocidade,
        data_hora,
        latitude,
        longitude,
        endereco,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    return stmt.run(
      dados.task_id || null,
      dados.item_id || null,
      dados.placa,
      dados.condutor || 'Não Informado',
      dados.velocidade,
      dados.data_evento_wialon || null,
      dados.latitude ?? null,
      dados.longitude ?? null,
      dados.endereco || null,
      dados.status || 'REGISTRADO'
    )
  },

  /* ==========================================================================
   * CONSULTA POR ID
   * ======================================================================== */

  buscarPorId(
    id: number
  ): InfracaoRecord | undefined {
    return db
      .prepare(`
        SELECT
          id,
          task_id,
          item_id,
          placa,
          condutor,
          velocidade,
          data_hora,
          latitude,
          longitude,
          endereco,
          pdf_path,
          created_at,
          updated_at,
          status
        FROM infracoes
        WHERE id = ?
      `)
      .get(id) as
      | InfracaoRecord
      | undefined
  },

  /* ==========================================================================
   * VISÃO OPERACIONAL
   * ======================================================================== */

  listarOperacional({
    busca,
    limit,
    offset,
  }: {
    busca?: string
    limit: number
    offset: number
  }) {
    let whereClause = `
      WHERE (
        status IN ('PENDENTE', 'REGISTRADO')
        AND DATE(data_hora) >= DATE('now', '-14 days')
      )
      OR (
        status = 'ERRO'
        AND DATE(data_hora) >= DATE('now', '-30 days')
      )
    `

    const params: string[] = []

    if (busca) {
      whereClause += `
        AND (
          condutor LIKE ?
          OR placa LIKE ?
          OR endereco LIKE ?
        )
      `

      params.push(
        `%${busca}%`,
        `%${busca}%`,
        `%${busca}%`
      )
    }

    /*
     * Uma linha operacional por placa/dia.
     *
     * A velocidade máxima é usada para representar
     * o pico daquele veículo naquele dia.
     */
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT 1
        FROM infracoes
        ${whereClause}
        GROUP BY
          placa,
          DATE(data_hora)
      )
    `

    const totalRecords =
      (
        db
          .prepare(countQuery)
          .get(...params) as {
            total: number
          }
      ).total

    const dataQuery = `
      SELECT
        id,
        task_id,
        item_id,
        placa,
        condutor,
        MAX(velocidade) AS velocidade,
        DATE(data_hora) AS data_ocorrencia,
        data_hora,
        created_at,
        updated_at,
        latitude,
        longitude,
        endereco,
        pdf_path,
        status
      FROM infracoes
      ${whereClause}
      GROUP BY
        placa,
        DATE(data_hora)
      ORDER BY
        data_hora DESC,
        id DESC
      LIMIT ? OFFSET ?
    `

    const data =
      db
        .prepare(dataQuery)
        .all(
          ...params,
          limit,
          offset
        ) as InfracaoRecord[]

    return {
      data,
      totalRecords,
      totalPages:
        Math.max(
          1,
          Math.ceil(
            totalRecords / limit
          )
        ),
    }
  },

  /* ==========================================================================
   * HISTÓRICO
   * ======================================================================== */

  listarHistorico(
    filters: HistoricoFilterParams
  ) {
    const {
      busca,
      dataInicio,
      dataFim,
      page,
      limit,
    } = filters

    const offset =
      (page - 1) * limit

    let whereClause = `
      WHERE status IN ('GERADO', 'ENVIADO')
    `

    const params: string[] = []

    if (busca) {
      whereClause += `
        AND (
          condutor LIKE ?
          OR placa LIKE ?
          OR endereco LIKE ?
        )
      `

      params.push(
        `%${busca}%`,
        `%${busca}%`,
        `%${busca}%`
      )
    }

    /*
     * Filtros históricos são baseados na data da infração,
     * não na data em que o sistema armazenou o registro.
     */
    if (dataInicio) {
      whereClause += `
        AND DATE(data_hora) >= DATE(?)
      `

      params.push(
        dataInicio
      )
    }

    if (dataFim) {
      whereClause += `
        AND DATE(data_hora) <= DATE(?)
      `

      params.push(
        dataFim
      )
    }

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM infracoes
      ${whereClause}
    `

    const totalRecords =
      (
        db
          .prepare(countQuery)
          .get(...params) as {
            total: number
          }
      ).total

    const dataQuery = `
      SELECT
        id,
        task_id,
        item_id,
        placa,
        condutor,
        velocidade,
        data_hora,
        latitude,
        longitude,
        endereco,
        pdf_path,
        created_at,
        updated_at,
        status
      FROM infracoes
      ${whereClause}
      ORDER BY
        data_hora DESC,
        id DESC
      LIMIT ? OFFSET ?
    `

    const data =
      db
        .prepare(dataQuery)
        .all(
          ...params,
          limit,
          offset
        ) as InfracaoRecord[]

    return {
      data,
      totalRecords,
      totalPages:
        Math.ceil(
          totalRecords / limit
        ),
    }
  },

  /* ==========================================================================
   * CONSOLIDAÇÃO DE DIAS ANTERIORES
   * ======================================================================== */

  buscarPicosPendentesDiasAnteriores() {
    return db
      .prepare(`
        SELECT
          id,
          task_id,
          placa,
          condutor,
          MAX(velocidade) AS velocidade,
          endereco,
          data_hora,
          created_at,
          DATE(data_hora) AS data_evento
        FROM infracoes
        WHERE status = 'REGISTRADO'
          AND DATE(data_hora) <
              DATE('now', 'localtime')
        GROUP BY
          DATE(data_hora),
          placa
        ORDER BY
          data_hora ASC
      `)
      .all() as Array<{
        id: number
        task_id: string | null
        placa: string
        condutor: string
        velocidade: number
        endereco: string | null
        data_hora: string
        created_at: string
        data_evento: string
      }>
  },

  /* ==========================================================================
   * STATUS
   * ======================================================================== */

  marcarComoGerado(
    id: number,
    pdfPath: string
  ) {
    return db
      .prepare(`
        UPDATE infracoes
        SET
          pdf_path = ?,
          status = 'GERADO',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .run(
        pdfPath,
        id
      )
  },

  marcarComoEnviado(
    id: number
  ) {
    return db
      .prepare(`
        UPDATE infracoes
        SET
          status = 'ENVIADO',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .run(id)
  },

  descartarInfracoesMenorGravidade(
    dataEvento: string,
    placa: string,
    picoId: number
  ) {
    return db
      .prepare(`
        UPDATE infracoes
        SET
          status = 'IGNORADO_MENOR_GRAVIDADE',
          updated_at = CURRENT_TIMESTAMP
        WHERE DATE(data_hora) = ?
          AND placa = ?
          AND id != ?
          AND status = 'REGISTRADO'
      `)
      .run(
        dataEvento,
        placa,
        picoId
      )
  },

  marcarComoErro(
    id: number
  ) {
    return db
      .prepare(`
        UPDATE infracoes
        SET
          status = 'ERRO',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .run(id)
  },
}