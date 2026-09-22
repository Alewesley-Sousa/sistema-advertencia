import { db } from '../database/db'

export interface InfracaoInput {
  task_id?: string | null
  item_id?: number | null
  placa: string
  condutor: string
  velocidade: number
  limite_via: number
  latitude?: number | null
  longitude?: number | null
  endereco?: string | null
  data_evento_wialon?: string | null
  status?: 'REGISTRADO' | 'PENDENTE' | 'GERADO' | 'ENVIADO' | 'IGNORADO_MENOR_GRAVIDADE' | 'ERRO'
}

export interface InfracaoRecord {
  id: number
  task_id: string | null
  item_id: number | null
  placa: string
  condutor: string
  velocidade: number
  limite_via: number
  latitude: number | null
  longitude: number | null
  endereco: string | null
  pdf_path: string | null
  created_at: string
  status: 'REGISTRADO' | 'PENDENTE' | 'GERADO' | 'ENVIADO' | 'IGNORADO_MENOR_GRAVIDADE' | 'ERRO'
}

export interface HistoricoFilterParams {
  busca?: string
  dataInicio?: string
  dataFim?: string
  page: number
  limit: number
}

export const infracaoRepository = {
  salvar(dados: InfracaoInput) {
    const stmt = db.prepare(`
      INSERT INTO infracoes (
        task_id, item_id, placa, condutor, velocidade, limite_via, latitude, longitude, endereco, created_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?)
    `)

    return stmt.run(
      dados.task_id || null,
      dados.item_id || null,
      dados.placa,
      dados.condutor,
      dados.velocidade,
      dados.limite_via,
      dados.latitude,
      dados.longitude,
      dados.endereco || null,
      dados.data_evento_wialon || null,
      dados.status || 'REGISTRADO'
    )
  },

  buscarPorId(id: number): InfracaoRecord | undefined {
    return db.prepare('SELECT * FROM infracoes WHERE id = ?').get(id) as InfracaoRecord | undefined
  },

listarOperacional({
  busca,
  limit,
  offset,
}: {
  busca?: string
  limit: number
  offset: number
}) {
  // ----- WHERE compartilhado entre count e data -----
  let whereClause = `
    WHERE (
      status IN ('PENDENTE', 'REGISTRADO')
      AND created_at >= datetime('now', '-14 days')
    ) OR (
      status = 'ERRO'
      AND created_at >= datetime('now', '-30 days')
    )
  `
  const params: any[] = []

  if (busca) {
    whereClause += ' AND (condutor LIKE ? OR placa LIKE ? OR endereco LIKE ?)'
    params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`)
  }

  // ----- Count (precisa envolver num subselect porque o GROUP BY agrupa) -----
  const countQuery = `
    SELECT COUNT(*) as total FROM (
      SELECT 1
      FROM infracoes
      ${whereClause}
      GROUP BY placa, DATE(created_at)
    )
  `
  const totalRecords = (db.prepare(countQuery).get(...params) as { total: number }).total

  // ----- Data paginada -----
  const dataQuery = `
    SELECT
      id, task_id, item_id, placa, condutor,
      MAX(velocidade) AS velocidade,
      limite_via,
      DATE(created_at) AS data_ocorrencia,
      created_at, latitude, longitude, endereco, pdf_path, status
    FROM infracoes
    ${whereClause}
    GROUP BY placa, DATE(created_at)
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `
  const data = db.prepare(dataQuery).all(...params, limit, offset) as InfracaoRecord[]

  return {
    data,
    totalRecords,
    totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
  }
},

  listarHistorico(filters: HistoricoFilterParams) {
    const { busca, dataInicio, dataFim, page, limit } = filters
    const offset = (page - 1) * limit

    let whereClause = "WHERE status IN ('GERADO', 'ENVIADO')"
    const params: any[] = []

    if (busca) {
      whereClause += " AND (condutor LIKE ? OR placa LIKE ? OR endereco LIKE ?)"
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`)
    }

    if (dataInicio) {
      whereClause += " AND DATE(created_at) >= DATE(?)"
      params.push(dataInicio)
    }

    if (dataFim) {
      whereClause += " AND DATE(created_at) <= DATE(?)"
      params.push(dataFim)
    }

    const countQuery = `SELECT COUNT(*) as total FROM infracoes ${whereClause}`
    const totalRecords = (db.prepare(countQuery).get(...params) as { total: number }).total

    const dataQuery = `
      SELECT * FROM infracoes 
      ${whereClause} 
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `
    const data = db.prepare(dataQuery).all(...params, limit, offset) as InfracaoRecord[]

    return {
      data,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit)
    }
  },

  buscarPicosPendentesDiasAnteriores() {
    return db.prepare(`
      SELECT id, task_id, placa, condutor, MAX(velocidade) as velocidade, limite_via, endereco, created_at, DATE(created_at) as data_evento
      FROM infracoes
      WHERE status = 'REGISTRADO'
        AND DATE(created_at) < DATE('now', 'localtime')
      GROUP BY DATE(created_at), placa
    `).all() as Array<{
      id: number
      task_id: string
      placa: string
      condutor: string
      velocidade: number
      limite_via: number
      endereco: string
      created_at: string
      data_evento: string
    }>
  },

  marcarComoGerado(id: number, pdfPath: string) {
    return db.prepare(`
      UPDATE infracoes 
      SET pdf_path = ?, status = 'GERADO', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(pdfPath, id)
  },

  marcarComoEnviado(id: number) {
    return db.prepare(`
      UPDATE infracoes 
      SET status = 'ENVIADO', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id)
  },

  descartarInfracoesMenorGravidade(dataEvento: string, placa: string, picoId: number) {
    return db.prepare(`
      UPDATE infracoes 
      SET status = 'IGNORADO_MENOR_GRAVIDADE' 
      WHERE DATE(created_at) = ? 
        AND placa = ? 
        AND id != ? 
        AND status = 'REGISTRADO'
    `).run(dataEvento, placa, picoId)
  },

  marcarComoErro(id: number) {
    return db.prepare(`UPDATE infracoes SET status = 'ERRO' WHERE id = ?`).run(id)
  }
}