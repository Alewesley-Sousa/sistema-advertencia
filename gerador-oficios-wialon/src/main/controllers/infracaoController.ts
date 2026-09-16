import { Request, Response } from 'express'
import fs from 'node:fs'
import { db } from '../database/db'
import { enviarOficioEmail } from '../services/emailService'
import { validarExcessoVelocidade } from '../services/wialon'
import { infracaoRepository } from '../repositories/infracaoRepository'

/**
 * 1. VISÃO OPERACIONAL (Curto Prazo / Painel Principal)
 * Retorna o maior pico de velocidade por placa/dia nos últimos 14 dias (PENDENTE/REGISTRADO)
 * mais os erros de processamento dos últimos 30 dias.
 */
export function listarInfracoesOperacional(_req: Request, res: Response) {
  try {
    const query = `
      SELECT 
        id,
        task_id,
        item_id,
        placa,
        condutor,
        MAX(velocidade) AS velocidade,
        limite_via,
        DATE(created_at) AS data_ocorrencia,
        created_at,
        latitude,
        longitude,
        endereco,
        pdf_path,
        status
      FROM infracoes
      WHERE (
        status IN ('PENDENTE', 'REGISTRADO') 
        AND created_at >= datetime('now', '-14 days')
      ) OR (
        status = 'ERRO' 
        AND created_at >= datetime('now', '-30 days')
      )
      GROUP BY placa, DATE(created_at)
      ORDER BY id DESC
    `
    const stmt = db.prepare(query)
    const infracoes = stmt.all()
    return res.json(infracoes)
  } catch (error) {
    console.error('[Listar Operacional Error]', error)
    return res.status(500).json({ error: 'Erro ao buscar infrações operacionais.' })
  }
}

/**
 * 2. VISÃO HISTÓRICA (Longo Prazo / Auditoria)
 * Retorna o histórico de ofícios com suporte a busca genérica (condutor, placa, endereço) e datas.
 */
export function listarHistorico(req: Request, res: Response) {
  try {
    const { 
      placa, 
      busca, 
      dataInicio, 
      dataFim, 
      page = '1', 
      limit = '10' 
    } = req.query

    const pageNum = Math.max(1, parseInt(page as string, 10))
    const limitNum = Math.max(1, parseInt(limit as string, 10))
    const offset = (pageNum - 1) * limitNum

    let whereClause = "WHERE status IN ('GERADO', 'ENVIADO')"
    const params: any[] = []

    // 1. Filtro genérico: condutor, placa ou endereço (campo 'busca' do frontend)
    const termoBusca = (busca || placa) as string
    if (termoBusca) {
      whereClause += " AND (condutor LIKE ? OR placa LIKE ? OR endereco LIKE ?)"
      params.push(`%${termoBusca}%`, `%${termoBusca}%`, `%${termoBusca}%`)
    }

    // 2. Filtro de Intervalo de Datas
    if (dataInicio) {
      whereClause += " AND DATE(created_at) >= DATE(?)"
      params.push(dataInicio)
    }

    if (dataFim) {
      whereClause += " AND DATE(created_at) <= DATE(?)"
      params.push(dataFim)
    }

    // Consulta do Total para Paginação
    const countQuery = `SELECT COUNT(*) as total FROM infracoes ${whereClause}`
    const totalRecords = (db.prepare(countQuery).get(...params) as { total: number }).total

    // Consulta dos Dados com Paginador
    const dataQuery = `
      SELECT * FROM infracoes 
      ${whereClause} 
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `
    const data = db.prepare(dataQuery).all(...params, limitNum, offset)

    return res.json({
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum)
      }
    })
  } catch (error) {
    console.error('[Listar Histórico Error]', error)
    return res.status(500).json({ error: 'Erro ao buscar histórico de infrações.' })
  }
}

/**
 * Servir o arquivo PDF da infração
 */
export function baixarPdfInfracao(req: Request, res: Response) {
  try {
    const { id } = req.params
    const stmt = db.prepare('SELECT pdf_path, placa FROM infracoes WHERE id = ?')
    const infracao = stmt.get(id) as { pdf_path?: string; placa?: string } | undefined

    if (!infracao || !infracao.pdf_path || !fs.existsSync(infracao.pdf_path)) {
      return res.status(404).json({ error: 'Arquivo PDF não encontrado no servidor.' })
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="oficio_${infracao.placa}.pdf"`)

    const fileStream = fs.createReadStream(infracao.pdf_path)
    fileStream.pipe(res)
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao tentar recuperar o arquivo PDF.' })
  }
}

/**
 * Enviar E-mail de Ofício de Infração
 */
export async function enviarEmailInfracao(req: Request, res: Response) {
  try {
    const { id } = req.params

    // 1. Busca os dados da infração registrada no banco
    const infracao = infracaoRepository.buscarPorId(Number(id))

    if (!infracao) {
      return res.status(404).json({ error: 'Infração não encontrada.' })
    }

    // 2. Valida se a velocidade realmente ultrapassa o limite da via
    const eExcessoVelocidade = validarExcessoVelocidade(infracao.velocidade, infracao.limite_via)

    if (!eExcessoVelocidade) {
      return res.status(400).json({
        error: 'Registro inválido para envio: a velocidade registrada não excede o limite da via.'
      })
    }

    // 3. Valida se o PDF já foi gerado
    if (!infracao.pdf_path) {
      return res.status(400).json({ error: 'O PDF desta infração ainda não foi gerado.' })
    }

    // 4. Dispara o e-mail utilizando o serviço
    await enviarOficioEmail({
      condutor: infracao.condutor || 'Não informado',
      placa: infracao.placa,
      velocidadeRegistrada: infracao.velocidade,
      velocidadeLimite: infracao.limite_via,
      dataHora: infracao.created_at,
      pdfPath: infracao.pdf_path
    })

    // 5. Atualiza o status da infração para ENVIADO
    infracaoRepository.marcarComoEnviado(infracao.id)

    return res.json({ message: 'E-mail enviado com sucesso!' })
  } catch (error: any) {
    console.error('[Email Action Error]', error)
    return res.status(500).json({ 
      error: error.message || 'Falha ao realizar o disparo do e-mail.' 
    })
  }
}