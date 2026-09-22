/**
 * ============================================================================
 * Arquivo: controllers/infracaoDetranController.ts
 * ============================================================================
 */

import { Request, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { db } from '../database/db'
import { detranRepository } from '../repositories/detranRepository'
import { consultarVeiculoDetran as executarScraper } from '../services/detranScraperService'
import { sendResponse } from '../utils/response'
import { parseParamId, parsePaginationParams } from '../utils/requestHelpers'

/**
 * 1. CONSULTAR VEÍCULO AVULSO (DETRAN-CE)
 */
export async function consultarVeiculoAvulso(req: Request, res: Response) {
  try {
    const { placa, chassi, forcarRedownload } = req.body

    if (!placa || !chassi) {
      return sendResponse.validationError(res, 'Dados obrigatórios ausentes.', [
        { field: 'placa', message: 'O campo "placa" é obrigatório.' },
        { field: 'chassi', message: 'O campo "chassi" é obrigatório.' },
      ])
    }

    const placaFormatada = String(placa).toUpperCase().trim()
    const chassiFormatado = String(chassi).toUpperCase().trim()
    const forcar = Boolean(forcarRedownload)

    // 1. Reaproveita consulta existente ou cria uma nova
    const idInserido = detranRepository.obterOuCriarConsulta(
      placaFormatada,
      chassiFormatado
    )

    // 2. Chaves das multas já baixadas com sucesso (pra pular redownload)
    const aitJaBaixados = forcar
      ? new Set<string>()
      : detranRepository.buscarChavesJaBaixadas(placaFormatada)

    console.log(
      `[DETRAN Controller] Consulta ${placaFormatada} — ` +
        `${aitJaBaixados.size} multa(s) já baixada(s)${forcar ? ' (redownload forçado)' : ''}`
    )

    // 3. Scraper
    const resultado = await executarScraper({
      placa: placaFormatada,
      chassi: chassiFormatado,
      aitJaBaixados,
    })

    // 4. Atualiza registro principal da consulta
    detranRepository.atualizarResultadoConsulta(idInserido, resultado)

    // 5. Upsert das multas individuais
    let salvas = { inseridas: 0, atualizadas: 0 }
    if (resultado.multas?.length) {
      salvas = detranRepository.salvarMultas(
        idInserido,
        placaFormatada,
        resultado.multas
      )
      console.log(
        `[DETRAN Controller] Multas: ${salvas.inseridas} nova(s), ${salvas.atualizadas} atualizada(s)`
      )
    }

    if (!resultado.sucesso) {
      return sendResponse.error(
        res,
        resultado.mensagemErro || 'Erro ao realizar consulta junto ao DETRAN-CE.',
        502,
        'DETRAN_SCRAPER_ERROR',
        { id: idInserido, statusConsulta: resultado.statusConsulta }
      )
    }

    return sendResponse.success(res, {
      id: idInserido,
      placa: placaFormatada,
      chassi: chassiFormatado,
      statusConsulta: resultado.statusConsulta,
      tipoDebito: resultado.tipoDebito,
      caminhoPdf: resultado.caminhoPdf,
      multas: resultado.multas ?? [],
      multasInseridas: salvas.inseridas,
      multasAtualizadas: salvas.atualizadas,
    })
  } catch (error) {
    console.error('[DETRAN Controller] Erro ao consultar veículo avulso:', error)
    return sendResponse.error(
      res,
      'Erro interno ao processar consulta no DETRAN-CE.',
      500,
      'DETRAN_INTERNAL_ERROR'
    )
  }
}

/**
 * 2. LISTAR HISTÓRICO DE CONSULTAS DETRAN
 */
export function listarConsultasDetran(req: Request, res: Response) {
  try {
    const { busca, status } = req.query
    const { page, limit, offset } = parsePaginationParams(req)

    const { data, total } = detranRepository.listar({
      busca: busca as string,
      status: status as string,
      limit,
      offset,
    })

    return sendResponse.paginate(res, data, page, limit, total)
  } catch (error) {
    console.error('[DETRAN Controller] Erro ao listar histórico:', error)
    return sendResponse.error(
      res,
      'Erro ao buscar histórico de consultas DETRAN.',
      500,
      'DETRAN_LIST_ERROR'
    )
  }
}

/**
 * 3. DOWNLOAD / VISUALIZAÇÃO DO PDF CONSOLIDADO
 */
export function baixarPdfDetran(req: Request, res: Response) {
  try {
    const id = parseParamId(req, res, 'id')
    if (!id) return

    const registro = detranRepository.buscarPorId(id)

    if (!registro || !registro.caminho_pdf || !fs.existsSync(registro.caminho_pdf)) {
      return sendResponse.error(
        res,
        'Documento PDF não encontrado ou arquivo indisponível.',
        404,
        'PDF_NOT_FOUND'
      )
    }

    const nomeArquivo = path.basename(registro.caminho_pdf)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${nomeArquivo}"`)

    fs.createReadStream(registro.caminho_pdf).pipe(res)
  } catch (error) {
    console.error('[DETRAN Controller] Erro ao servir PDF:', error)
    return sendResponse.error(
      res,
      'Erro ao tentar recuperar o arquivo PDF do DETRAN.',
      500,
      'PDF_STREAM_ERROR'
    )
  }
}

/**
 * 4. PROCESSAR LOTE DE VEÍCULOS
 *
 * "Lote" aqui é só um agrupador pra ter um id e contar progresso.
 * Cada veículo é processado como uma consulta avulsa normal.
 */
export async function processarLoteDetran(req: Request, res: Response) {
  try {
    const { nomeArquivo, veiculos } = req.body as {
      nomeArquivo?: string
      veiculos?: Array<{ placa: string; chassi: string }>
    }

    if (!veiculos || !Array.isArray(veiculos) || veiculos.length === 0) {
      return sendResponse.validationError(res, 'Lista de veículos inválida.', [
        { field: 'veiculos', message: 'A lista deve ser um array não vazio.' },
      ])
    }

    // Normaliza os veículos recebidos (defensivo — front já normaliza)
    const veiculosLimpos = veiculos
      .map((v) => ({
        placa: String(v.placa).toUpperCase().replace(/[^A-Z0-9]/g, '').trim(),
        chassi: String(v.chassi).toUpperCase().replace(/[^A-Z0-9]/g, '').trim(),
      }))
      .filter((v) => v.placa && v.chassi)

    if (veiculosLimpos.length === 0) {
      return sendResponse.validationError(res, 'Nenhum veículo válido recebido.', [
        { field: 'veiculos', message: 'Todos os veículos vieram com placa ou chassi vazios.' },
      ])
    }

    const nomeLote = nomeArquivo || `Lote_${new Date().toISOString().slice(0, 10)}`

    // Cria o registro de progresso
    const loteId = detranRepository.criarLote(nomeLote, veiculosLimpos.length)

    // Dispara o worker passando a lista DIRETO (não precisa consultar banco)
    processarFilaLote(loteId, veiculosLimpos).catch((err) => {
      console.error(
        `[DETRAN Controller] Erro durante o processamento do Lote ${loteId}:`,
        err
      )
    })

    return sendResponse.success(
      res,
      {
        message: 'Lote criado com sucesso e enviado para processamento.',
        loteId,
        totalVeiculos: veiculosLimpos.length,
      },
      202
    )
  } catch (error) {
    console.error('[DETRAN Controller] Erro ao criar lote:', error)
    return sendResponse.error(
      res,
      'Erro ao iniciar processamento do lote.',
      500,
      'BATCH_CREATE_ERROR'
    )
  }
}

/**
 * Worker do lote — recebe a lista de veículos e processa cada um
 * exatamente como se fosse uma consulta avulsa.
 */
async function processarFilaLote(
  loteId: number,
  veiculos: Array<{ placa: string; chassi: string }>
) {
  console.log(
    `[DETRAN Controller] Lote ${loteId} iniciado — ${veiculos.length} veículo(s)`
  )

  let processados = 0

  try {
    for (const veiculo of veiculos) {
      const { placa, chassi } = veiculo

      // Marca o item atual pra o polling do front
      detranRepository.atualizarItemAtualLote(loteId, placa)

      try {
        // Reaproveita consulta existente ou cria nova (mesmo método da consulta avulsa)
        const consultaId = detranRepository.obterOuCriarConsulta(placa, chassi)

        const aitJaBaixados = detranRepository.buscarChavesJaBaixadas(placa)

        console.log(
          `[DETRAN Controller] Lote ${loteId} — ${placa}: ` +
            `${aitJaBaixados.size} multa(s) já baixada(s)`
        )

        const resultado = await executarScraper({
          placa,
          chassi,
          aitJaBaixados,
        })

        detranRepository.atualizarResultadoConsulta(consultaId, resultado)

        if (resultado.multas?.length) {
          const salvas = detranRepository.salvarMultas(
            consultaId,
            placa,
            resultado.multas
          )
          console.log(
            `[DETRAN Controller] Lote ${loteId} — ${placa}: ` +
              `${salvas.inseridas} nova(s), ${salvas.atualizadas} atualizada(s)`
          )
        }
      } catch (errItem: any) {
        console.error(
          `[DETRAN Controller] Erro no item ${placa} do lote ${loteId}:`,
          errItem?.message
        )
        // Marca a consulta como ERRO (se existir)
        try {
          const consultaId = detranRepository.obterOuCriarConsulta(placa, chassi)
          detranRepository.atualizarResultadoConsulta(consultaId, {
            statusConsulta: 'ERRO',
            mensagemErro: errItem?.message || 'Erro ao processar veículo.',
          })
        } catch {
          /* ignore */
        }
      }

      processados++
      detranRepository.atualizarProgressoLote(loteId, processados)
    }

    detranRepository.finalizarLote(loteId)
    console.log(
      `[DETRAN Controller] Lote ${loteId} concluído — ${processados} processado(s)`
    )
  } catch (err: any) {
    console.error(
      `[DETRAN Controller] Lote ${loteId} falhou de forma inesperada:`,
      err?.message
    )

    try {
      db.prepare(
        `UPDATE lotes_consultas
         SET status = 'ERRO',
             item_atual = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(loteId)
    } catch (dbErr: any) {
      console.error(
        `[DETRAN Controller] Falha ao marcar lote ${loteId} como ERRO:`,
        dbErr?.message
      )
    }
  }
}

/**
 * 5. LISTAR MULTAS INDIVIDUAIS DE UMA CONSULTA
 */
export function listarMultasDaConsulta(req: Request, res: Response) {
  try {
    const id = parseParamId(req, res, 'id')
    if (!id) return

    const consulta = detranRepository.buscarPorId(id)
    if (!consulta) {
      return sendResponse.error(
        res,
        'Consulta não encontrada.',
        404,
        'DETRAN_CONSULTA_NOT_FOUND'
      )
    }

    const multas = detranRepository.listarMultasPorConsulta(id)
    return sendResponse.success(res, multas)
  } catch (error) {
    console.error('[DETRAN Controller] Erro ao listar multas da consulta:', error)
    return sendResponse.error(
      res,
      'Erro ao listar multas da consulta.',
      500,
      'DETRAN_MULTAS_LIST_ERROR'
    )
  }
}

/**
 * 6. BAIXAR PDF INDIVIDUAL DE UMA MULTA
 */
export function baixarPdfMultaDetran(req: Request, res: Response) {
  try {
    const id = parseParamId(req, res, 'id')
    if (!id) return

    const multa = detranRepository.buscarMultaPorId(id)

    if (!multa || !multa.caminho_pdf || !fs.existsSync(multa.caminho_pdf)) {
      return sendResponse.error(
        res,
        'Boleto não encontrado ou indisponível.',
        404,
        'PDF_NOT_FOUND'
      )
    }

    const nomeArquivo = path.basename(multa.caminho_pdf)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${nomeArquivo}"`)

    fs.createReadStream(multa.caminho_pdf).pipe(res)
  } catch (error) {
    console.error('[DETRAN Controller] Erro ao servir PDF da multa:', error)
    return sendResponse.error(
      res,
      'Erro ao recuperar o PDF da multa.',
      500,
      'PDF_STREAM_ERROR'
    )
  }
}

/**
 * 7. STATUS DO LOTE (polling pro frontend)
 *    GET /detran/lotes/:id/status
 */
export function statusLoteDetran(req: Request, res: Response) {
  try {
    const id = parseParamId(req, res, 'id')
    if (!id) return

    const lote = detranRepository.buscarLotePorId(id)
    if (!lote) {
      return sendResponse.error(res, 'Lote não encontrado.', 404, 'LOTE_NOT_FOUND')
    }

    const percentual =
      lote.total_veiculos > 0
        ? Math.round((lote.processados / lote.total_veiculos) * 100)
        : 0

    return sendResponse.success(res, {
      loteId: lote.id,
      status: lote.status,
      processados: lote.processados,
      total: lote.total_veiculos,
      percentual,
      itemAtual: lote.item_atual ?? '',
      nomeArquivo: lote.nome_arquivo,
      atualizadoEm: lote.updated_at,
    })
  } catch (error) {
    console.error('[DETRAN Controller] Erro ao consultar status do lote:', error)
    return sendResponse.error(
      res,
      'Erro ao consultar status do lote.',
      500,
      'LOTE_STATUS_ERROR'
    )
  }
}