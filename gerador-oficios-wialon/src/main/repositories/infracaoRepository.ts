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

export const infracaoRepository = {
  salvar(dados: InfracaoInput) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO infracoes (
        task_id, item_id, placa, condutor, velocidade, limite_via, latitude, longitude, endereco, created_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), 'REGISTRADO')
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
      dados.data_evento_wialon || null
    )
  },

  buscarPorId(id: number): InfracaoRecord | undefined {
    return db.prepare('SELECT * FROM infracoes WHERE id = ?').get(id) as InfracaoRecord | undefined
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
    return db.prepare(`UPDATE infracoes SET pdf_path = ?, status = 'GERADO' WHERE id = ?`).run(pdfPath, id)
  },

  marcarComoEnviado(id: number) {
    return db.prepare(`UPDATE infracoes SET status = 'ENVIADO' WHERE id = ?`).run(id)
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