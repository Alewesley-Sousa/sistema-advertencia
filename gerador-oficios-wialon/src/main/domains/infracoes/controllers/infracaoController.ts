import {
  NextFunction,
  Request,
  Response,
} from 'express'
import fs from 'node:fs'

import { enviarOficioEmail } from '../../../services/emailService'
import { gerarPdfOficio } from '../../../services/pdfService'
import { gerarPdfOficioBuffer } from '../../../services/pdfService'

import { AppError } from '../../../shared/errors/AppError'

import {
  parseParamId,
  parsePaginationParams,
} from '../../../utils/requestHelpers'
import { sendResponse } from '../../../utils/response'

import { infracaoRepository } from '../repositories/infracaoRepository'
import { OficioTemplateData } from '../templates/oficioTemplate'

/**
 * 1. VISÃO OPERACIONAL
 */
export function listarInfracoesOperacional(
  req: Request,
  res: Response
) {
  const { busca } = req.query

  const {
    page,
    limit,
    offset,
  } = parsePaginationParams(req)

  const {
    data,
    totalRecords,
    totalPages,
  } = infracaoRepository.listarOperacional({
    busca:
      busca as string | undefined,
    limit,
    offset,
  })

  return sendResponse.success(
    res,
    data,
    200,
    {
      page,
      limit,
      totalItems:
        totalRecords,
      totalPages,
      hasNextPage:
        page < totalPages,
      hasPrevPage:
        page > 1,
    }
  )
}

/**
 * 2. VISÃO HISTÓRICA
 */
export function listarHistorico(
  req: Request,
  res: Response
) {
  const {
    placa,
    busca,
    dataInicio,
    dataFim,
  } = req.query

  const {
    page,
    limit,
  } = parsePaginationParams(req)

  const termoBusca =
    (busca || placa) as
    | string
    | undefined

  const {
    data,
    totalRecords,
  } =
    infracaoRepository.listarHistorico({
      busca:
        termoBusca,

      dataInicio:
        dataInicio as
        | string
        | undefined,

      dataFim:
        dataFim as
        | string
        | undefined,

      page,
      limit,
    })

  return sendResponse.paginate(
    res,
    data,
    page,
    limit,
    totalRecords
  )
}

/**
 * 3. GERAR OFÍCIO MANUALMENTE
 */
export async function gerarOficioInfracao(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const idNumerico =
      parseParamId(
        req,
        res
      )

    if (!idNumerico) {
      return
    }

    const infracao =
      infracaoRepository.buscarPorId(
        idNumerico
      )

    if (!infracao) {
      throw new AppError(
        'Infração não encontrada.',
        404,
        'INFRACAO_NOT_FOUND'
      )
    }

    /*
     * A Wialon já determinou que esta é uma
     * atividade de EXCESSOS DE VELOCIDADE.
     *
     * Portanto não existe mais uma segunda
     * validação de limite de velocidade aqui.
     */

    if (
      !infracao.data_hora
    ) {
      return sendResponse.validationError(
        res,
        'Data da ocorrência inconsistente.',
        [
          {
            field:
              'data_hora',

            message:
              'A infração não possui data e hora da ocorrência.',
          },
        ]
      )
    }

    if (
      new Date(
        infracao.data_hora
      ) > new Date()
    ) {
      return sendResponse.validationError(
        res,
        'Data da ocorrência inconsistente.',
        [
          {
            field:
              'data_hora',

            message:
              'Não é possível gerar ofício para infrações com data futura.',
          },
        ]
      )
    }

    const dadosTemplate:
      OficioTemplateData = {
        id:
          infracao.id,

        placa:
          infracao.placa,

        condutor:
          infracao.condutor ||
          'NÃO INFORMADO',

        velocidade:
          infracao.velocidade,

        data_hora:
          infracao.data_hora,

        endereco:
          infracao.endereco ||
          'Endereço não informado',
      }

    const pdfPath =
      await gerarPdfOficio(
        dadosTemplate
      )

    infracaoRepository.marcarComoGerado(
      idNumerico,
      pdfPath
    )

    return sendResponse.success(
      res,
      {
        message:
          'Ofício gerado com sucesso!',

        infracaoId:
          idNumerico,

        pdfPath,
      }
    )
  } catch (error) {
    console.error(
      '[Gerar Ofício Error]',
      error
    )

    return next(
      error
    )
  }
}

/**
 * 4. DOWNLOAD / VISUALIZAÇÃO DO PDF
 */
export function baixarPdfInfracao(
  req: Request,
  res: Response
) {
  const idNumerico =
    parseParamId(
      req,
      res
    )

  if (!idNumerico) {
    return
  }

  const infracao =
    infracaoRepository.buscarPorId(
      idNumerico
    )

  if (
    !infracao ||
    !infracao.pdf_path ||
    !fs.existsSync(
      infracao.pdf_path
    )
  ) {
    throw new AppError(
      'Arquivo PDF não encontrado no servidor ou ainda não foi gerado.',
      404,
      'FILE_NOT_FOUND'
    )
  }

  res.setHeader(
    'Content-Type',
    'application/pdf'
  )

  res.setHeader(
    'Content-Disposition',
    `inline; filename="oficio_${infracao.placa}.pdf"`
  )

  return fs
    .createReadStream(
      infracao.pdf_path
    )
    .pipe(res)
}

/**
 * 4b. PREVIEW DO PDF (inline, sem salvar em disco)
 *
 * Gera o PDF em memória e devolve com Content-Disposition: inline.
 * Útil para iterar no template do ofício: abra a URL no navegador
 * e o PDF aparece embutido, sem poluir a pasta de storage.
 */
export async function previewPdfOficio(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const idNumerico = parseParamId(req, res)
    if (!idNumerico) return

    const infracao = infracaoRepository.buscarPorId(idNumerico)
    if (!infracao) {
      throw new AppError(
        'Infração não encontrada.',
        404,
        'INFRACAO_NOT_FOUND'
      )
    }

    const dadosTemplate: OficioTemplateData = {
      id: infracao.id,
      placa: infracao.placa,
      condutor: infracao.condutor || 'NÃO INFORMADO',
      velocidade: infracao.velocidade,
      data_hora: infracao.data_hora,
      endereco: infracao.endereco || 'Endereço não informado',
    }

    const buffer = await gerarPdfOficioBuffer(dadosTemplate)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="preview_oficio_${infracao.placa}.pdf"`
    )
    // Não cacheia — sempre que você ajustar o template e recarregar,
    // quer ver a versão nova
    res.setHeader('Cache-Control', 'no-store, max-age=0')

    return res.send(Buffer.from(buffer))
  } catch (error) {
    console.error('[Preview PDF Error]', error)
    return next(error)
  }
}

/**
 * 5. ENVIAR E-MAIL COM OFÍCIO ANEXADO
 */
export async function enviarEmailInfracao(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const idNumerico =
      parseParamId(
        req,
        res
      )

    if (!idNumerico) {
      return
    }

    const infracao =
      infracaoRepository.buscarPorId(
        idNumerico
      )

    if (!infracao) {
      throw new AppError(
        'Infração não encontrada.',
        404,
        'INFRACAO_NOT_FOUND'
      )
    }

    if (
      !infracao.pdf_path ||
      !fs.existsSync(
        infracao.pdf_path
      )
    ) {
      return sendResponse.validationError(
        res,
        'Pré-requisito pendente para envio de e-mail.',
        [
          {
            field:
              'pdf_path',

            message:
              'O PDF desta infração ainda não foi gerado ou o arquivo não existe.',
          },
        ]
      )
    }

    await enviarOficioEmail({
      condutor:
        infracao.condutor ||
        'Não informado',

      placa:
        infracao.placa,

      velocidadeRegistrada:
        infracao.velocidade,

      dataHora:
        infracao.data_hora,

      pdfPath:
        infracao.pdf_path,
    })

    infracaoRepository.marcarComoEnviado(
      infracao.id
    )

    return sendResponse.success(
      res,
      {
        message:
          'E-mail enviado com sucesso!',
      }
    )
  } catch (error) {
    console.error(
      '[Email Action Error]',
      error
    )

    return next(
      error
    )
  }
}