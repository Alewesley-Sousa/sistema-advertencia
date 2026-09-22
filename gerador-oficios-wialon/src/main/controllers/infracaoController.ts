import { Request, Response } from 'express'
import fs from 'node:fs'
import { enviarOficioEmail } from '../services/emailService'
import { validarExcessoVelocidade } from '../services/wialon'
import { infracaoRepository } from '../repositories/infracaoRepository'
import { gerarPdfOficio } from '../services/pdfService'
import { OficioTemplateData } from '../templates/oficioTemplate'
import { sendResponse } from '../utils/response'
import { parseParamId } from '../utils/requestHelpers'

/**
 * 1. VISÃO OPERACIONAL (Curto Prazo / Painel Principal)
 */
export function listarInfracoesOperacional(_req: Request, res: Response) {
  try {
    const infracoes = infracaoRepository.listarOperacional()
    return sendResponse.success(res, infracoes)
  } catch (error) {
    console.error('[Listar Operacional Error]', error)
    return sendResponse.error(
      res, 
      'Erro ao buscar infrações operacionais.', 
      500, 
      'OPERATIONAL_FETCH_ERROR'
    )
  }
}

/**
 * 2. VISÃO HISTÓRICA (Longo Prazo / Auditoria)
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

    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)

    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      return sendResponse.validationError(res, 'Parâmetros de paginação inválidos', [
        { field: 'page', message: 'Deve ser um número inteiro maior ou igual a 1' },
        { field: 'limit', message: 'Deve ser um número inteiro maior ou igual a 1' }
      ])
    }

    const termoBusca = (busca || placa) as string
    const result = infracaoRepository.listarHistorico({
      busca: termoBusca,
      dataInicio: dataInicio as string,
      dataFim: dataFim as string,
      page: pageNum,
      limit: limitNum
    })

    return sendResponse.success(res, result.data, 200, {
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.totalRecords,
        totalPages: result.totalPages
      }
    })
  } catch (error) {
    console.error('[Listar Histórico Error]', error)
    return sendResponse.error(
      res, 
      'Erro ao buscar histórico de infrações.', 
      500, 
      'HISTORY_FETCH_ERROR'
    )
  }
}

/**
 * 3. GERAR OFÍCIO MANUALMENTE
 */
export async function gerarOficioInfracao(req: Request, res: Response) {
  try {
    const idNumerico = parseParamId(req, res)
    if (!idNumerico) return

    const infracao = infracaoRepository.buscarPorId(idNumerico)
    if (!infracao) {
      return sendResponse.error(res, 'Infração não encontrada.', 404, 'INFRACAO_NOT_FOUND')
    }

    const eExcessoVelocidade = validarExcessoVelocidade(infracao.velocidade, infracao.limite_via)
    if (!eExcessoVelocidade) {
      return sendResponse.validationError(res, 'Regra de negócio violada para geração do ofício.', [
        { 
          field: 'velocidade', 
          message: `A velocidade registrada (${infracao.velocidade} km/h) não excede o limite da via (${infracao.limite_via} km/h).` 
        }
      ])
    }

    if (new Date(infracao.created_at) > new Date()) {
      return sendResponse.validationError(res, 'Data da ocorrência inconsistente.', [
        { field: 'created_at', message: 'Não é possível gerar ofício para infrações com data futura.' }
      ])
    }

    const dadosTemplate: OficioTemplateData = {
      id: infracao.id,
      placa: infracao.placa,
      condutor: infracao.condutor || 'NÃO INFORMADO',
      velocidade: infracao.velocidade,
      limite_via: infracao.limite_via,
      data_hora: infracao.created_at,
      endereco: infracao.endereco || 'Endereço não informado',
    }

    const pdfPath = await gerarPdfOficio(dadosTemplate)

    infracaoRepository.marcarComoGerado(idNumerico, pdfPath)

    return sendResponse.success(res, {
      message: 'Ofício gerado com sucesso!',
      infracaoId: idNumerico,
      pdfPath
    })
  } catch (error: any) {
    console.error('[Gerar Ofício Error]', error)
    return sendResponse.error(
      res, 
      'Erro ao gerar o arquivo PDF do ofício.', 
      500, 
      'PDF_GENERATION_ERROR'
    )
  }
}

/**
 * 4. DOWNLOAD / VISUALIZAÇÃO DO PDF
 */
export function baixarPdfInfracao(req: Request, res: Response) {
  try {
    const idNumerico = parseParamId(req, res)
    if (!idNumerico) return

    const infracao = infracaoRepository.buscarPorId(idNumerico)

    if (!infracao || !infracao.pdf_path || !fs.existsSync(infracao.pdf_path)) {
      return sendResponse.error(
        res, 
        'Arquivo PDF não encontrado no servidor ou ainda não foi gerado.', 
        404, 
        'FILE_NOT_FOUND'
      )
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="oficio_${infracao.placa}.pdf"`)

    return fs.createReadStream(infracao.pdf_path).pipe(res)
  } catch (error) {
    console.error('[Baixar PDF Error]', error)
    return sendResponse.error(
      res, 
      'Erro ao tentar recuperar o arquivo PDF.', 
      500, 
      'PDF_FETCH_ERROR'
    )
  }
}

/**
 * 5. ENVIAR E-MAIL COM OFÍCIO ANEXADO
 */
export async function enviarEmailInfracao(req: Request, res: Response) {
  try {
    const idNumerico = parseParamId(req, res)
    if (!idNumerico) return

    const infracao = infracaoRepository.buscarPorId(idNumerico)
    if (!infracao) {
      return sendResponse.error(res, 'Infração não encontrada.', 404, 'INFRACAO_NOT_FOUND')
    }

    const eExcessoVelocidade = validarExcessoVelocidade(infracao.velocidade, infracao.limite_via)
    if (!eExcessoVelocidade) {
      return sendResponse.validationError(res, 'Registro inválido para envio por e-mail.', [
        { 
          field: 'velocidade', 
          message: 'A velocidade registrada não excede o limite estipulado da via.' 
        }
      ])
    }

    if (!infracao.pdf_path || !fs.existsSync(infracao.pdf_path)) {
      return sendResponse.validationError(res, 'Pré-requisito pendente para envio de e-mail.', [
        { field: 'pdf_path', message: 'O PDF desta infração ainda não foi gerado ou o arquivo não existe.' }
      ])
    }

    await enviarOficioEmail({
      condutor: infracao.condutor || 'Não informado',
      placa: infracao.placa,
      velocidadeRegistrada: infracao.velocidade,
      velocidadeLimite: infracao.limite_via,
      dataHora: infracao.created_at,
      pdfPath: infracao.pdf_path
    })

    infracaoRepository.marcarComoEnviado(infracao.id)

    return sendResponse.success(res, { message: 'E-mail enviado com sucesso!' })
  } catch (error: any) {
    console.error('[Email Action Error]', error)
    return sendResponse.error(
      res, 
      error.message || 'Falha ao realizar o disparo do e-mail.', 
      500, 
      'EMAIL_SEND_FAILED'
    )
  }
}