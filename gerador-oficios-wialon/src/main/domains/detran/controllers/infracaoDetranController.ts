/**
 * ============================================================================ 
 * Arquivo: controllers/infracaoDetranController.ts
 * ============================================================================
 */

import { NextFunction, Request, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import * as archiver from 'archiver'
import { db } from '../../../database/db'
import { runWithConcurrency } from '../../../shared/concurrency/runWithConcurrency'
import { AppError } from '../../../shared/errors/AppError'
import { sendResponse } from '../../../utils/response'
import { parseParamId, parsePaginationParams } from '../../../utils/requestHelpers'

import { detranRepository } from '../repositories/detranRepository'
import { consultarVeiculoDetran as executarScraper } from '../services/detranScraperService'

/**
 * 1. CONSULTAR VEÍCULO AVULSO (DETRAN-CE)
 */
export async function consultarVeiculoAvulso(
  req: Request,
  res: Response,
  next: NextFunction
) {
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

    const idInserido = detranRepository.obterOuCriarConsulta(
      placaFormatada,
      chassiFormatado
    )

    const aitJaBaixados = forcar
      ? new Set<string>()
      : detranRepository.buscarChavesJaBaixadas(placaFormatada)

    console.log(
      `[DETRAN Controller] Consulta ${placaFormatada} — ` +
        `${aitJaBaixados.size} multa(s) já baixada(s)` +
        `${forcar ? ' (redownload forçado)' : ''}`
    )

    const resultado = await executarScraper({
      placa: placaFormatada,
      chassi: chassiFormatado,
      aitJaBaixados,
    })

    detranRepository.atualizarResultadoConsulta(idInserido, resultado)

    let salvas = { inseridas: 0, atualizadas: 0 }

    if (resultado.multas?.length) {
      salvas = detranRepository.salvarMultas(
        idInserido,
        placaFormatada,
        resultado.multas
      )

      console.log(
        `[DETRAN Controller] Multas: ` +
          `${salvas.inseridas} nova(s), ` +
          `${salvas.atualizadas} atualizada(s)`
      )
    }

    // O scraper concluiu a operação, mas o DETRAN retornou uma falha controlada.
    if (!resultado.sucesso) {
      return sendResponse.error(
        res,
        resultado.mensagemErro ||
          'Erro ao realizar consulta junto ao DETRAN-CE.',
        502,
        'DETRAN_SCRAPER_ERROR',
        {
          id: idInserido,
          statusConsulta: resultado.statusConsulta,
        }
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
    console.error(
      '[DETRAN Controller] Erro ao consultar veículo avulso:',
      error
    )

    return next(error)
  }
}

/**
 * 2. LISTAR HISTÓRICO DE CONSULTAS DETRAN
 */
export function listarConsultasDetran(req: Request, res: Response) {
  const { busca, status } = req.query
  const { page, limit, offset } = parsePaginationParams(req)

  const { data, total } = detranRepository.listar({
    busca: busca as string,
    status: status as string,
    limit,
    offset,
  })

  return sendResponse.paginate(res, data, page, limit, total)
}

/**
 * 3. DOWNLOAD / VISUALIZAÇÃO DO PDF CONSOLIDADO
 */
export function baixarPdfDetran(req: Request, res: Response) {
  const id = parseParamId(req, res, 'id')
  if (!id) return

  const registro = detranRepository.buscarPorId(id)

  if (
    !registro ||
    !registro.caminho_pdf ||
    !fs.existsSync(registro.caminho_pdf)
  ) {
    throw new AppError(
      'Documento PDF não encontrado ou arquivo indisponível.',
      404,
      'PDF_NOT_FOUND'
    )
  }

  const nomeArquivo = path.basename(registro.caminho_pdf)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${nomeArquivo}"`
  )

  fs.createReadStream(registro.caminho_pdf).pipe(res)
}

/**
 * 4. PROCESSAR LOTE DE VEÍCULOS
 *
 * "Lote" aqui é só um agrupador pra ter um id e contar progresso.
 * Cada veículo é processado como uma consulta avulsa normal.
 */
export async function processarLoteDetran(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { nomeArquivo, veiculos } = req.body as {
      nomeArquivo?: string
      veiculos?: Array<{ placa: string; chassi: string }>
    }

    if (!veiculos || !Array.isArray(veiculos) || veiculos.length === 0) {
      return sendResponse.validationError(res, 'Lista de veículos inválida.', [
        {
          field: 'veiculos',
          message: 'A lista deve ser um array não vazio.',
        },
      ])
    }

    const veiculosLimpos = veiculos
      .map((v) => ({
        placa: String(v.placa)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .trim(),
        chassi: String(v.chassi)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .trim(),
      }))
      .filter((v) => v.placa && v.chassi)

    if (veiculosLimpos.length === 0) {
      return sendResponse.validationError(
        res,
        'Nenhum veículo válido recebido.',
        [
          {
            field: 'veiculos',
            message:
              'Todos os veículos vieram com placa ou chassi vazios.',
          },
        ]
      )
    }

    const nomeLote =
      nomeArquivo ||
      `Lote_${new Date().toISOString().slice(0, 10)}`

    const loteId = detranRepository.criarLote(
      nomeLote,
      veiculosLimpos.length
    )

    processarFilaLote(loteId, veiculosLimpos).catch((err: unknown) => {
      console.error(
        `[DETRAN Controller] Erro durante o processamento do Lote ${loteId}:`,
        err
      )
    })

    return sendResponse.success(
      res,
      {
        message:
          'Lote criado com sucesso e enviado para processamento.',
        loteId,
        totalVeiculos: veiculosLimpos.length,
      },
      202
    )
  } catch (error) {
    console.error('[DETRAN Controller] Erro ao criar lote:', error)
    return next(error)
  }
}

/**
 * Worker do lote — recebe a lista de veículos e processa cada um
 * exatamente como se fosse uma consulta avulsa.
 */
const CONCORRENCIA_LOTE = 2

async function processarVeiculoLote(
  loteId: number,
  veiculo: { placa: string; chassi: string }
): Promise<void> {
  const { placa, chassi } = veiculo

  console.log(
    `[DETRAN Controller] Lote ${loteId} — iniciando veículo ${placa}`
  )

  try {
    detranRepository.atualizarItemAtualLote(loteId, placa)

    const consultaId = detranRepository.obterOuCriarConsulta(
      placa,
      chassi
    )

    const aitJaBaixados =
      detranRepository.buscarChavesJaBaixadas(placa)

    console.log(
      `[DETRAN Controller] Lote ${loteId} — ${placa}: ` +
        `${aitJaBaixados.size} multa(s) já baixada(s)`
    )

    const resultado = await executarScraper({
      placa,
      chassi,
      aitJaBaixados,
    })

    detranRepository.atualizarResultadoConsulta(
      consultaId,
      resultado
    )

    if (resultado.multas?.length) {
      const salvas = detranRepository.salvarMultas(
        consultaId,
        placa,
        resultado.multas
      )

      console.log(
        `[DETRAN Controller] Lote ${loteId} — ${placa}: ` +
          `${salvas.inseridas} nova(s), ` +
          `${salvas.atualizadas} atualizada(s)`
      )
    }

    console.log(
      `[DETRAN Controller] Lote ${loteId} — ${placa}: concluído`
    )
  } catch (err: any) {
    const mensagem =
      err?.message ||
      'Erro ao processar veículo.'

    console.error(
      `[DETRAN Controller] Erro no item ${placa} do lote ${loteId}:`,
      mensagem
    )

    try {
      const consultaId =
        detranRepository.obterOuCriarConsulta(
          placa,
          chassi
        )

      detranRepository.atualizarResultadoConsulta(
        consultaId,
        {
          statusConsulta: 'ERRO',
          mensagemErro: mensagem,
        }
      )
    } catch (erroBanco: any) {
      console.error(
        `[DETRAN Controller] Falha ao registrar erro de ${placa}:`,
        erroBanco?.message
      )
    }
  } finally {
    detranRepository.incrementarProgressoLote(loteId)
  }
}

async function processarFilaLote(
  loteId: number,
  veiculos: Array<{
    placa: string
    chassi: string
  }>
) {
  console.log(
    `[DETRAN Controller] Lote ${loteId} iniciado — ` +
      `${veiculos.length} veículo(s) — ` +
      `concorrência: ${CONCORRENCIA_LOTE}`
  )

  try {
    await runWithConcurrency(
      veiculos,
      CONCORRENCIA_LOTE,
      async (veiculo) => {
        await processarVeiculoLote(
          loteId,
          veiculo
        )
      }
    )

    detranRepository.finalizarLote(loteId)

    console.log(
      `[DETRAN Controller] Lote ${loteId} concluído — ` +
        `${veiculos.length} veículo(s) processado(s)`
    )
  } catch (err: any) {
    console.error(
      `[DETRAN Controller] Lote ${loteId} falhou de forma inesperada:`,
      err?.message
    )

    try {
      db.prepare(`
        UPDATE lotes_consultas
        SET status = 'ERRO',
            item_atual = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(loteId)
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
export function listarMultasDaConsulta(
  req: Request,
  res: Response
) {
  const id = parseParamId(req, res, 'id')
  if (!id) return

  const consulta = detranRepository.buscarPorId(id)

  if (!consulta) {
    throw new AppError(
      'Consulta não encontrada.',
      404,
      'DETRAN_CONSULTA_NOT_FOUND'
    )
  }

  const multas = detranRepository.listarMultasPorConsulta(id)

  return sendResponse.success(res, multas)
}

/**
 * 6. BAIXAR PDF INDIVIDUAL DE UMA MULTA
 */
export function baixarPdfMultaDetran(
  req: Request,
  res: Response
) {
  const id = parseParamId(req, res, 'id')
  if (!id) return

  const multa = detranRepository.buscarMultaPorId(id)

  if (
    !multa ||
    !multa.caminho_pdf ||
    !fs.existsSync(multa.caminho_pdf)
  ) {
    throw new AppError(
      'Boleto não encontrado ou indisponível.',
      404,
      'PDF_NOT_FOUND'
    )
  }

  const nomeArquivo = path.basename(multa.caminho_pdf)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${nomeArquivo}"`
  )

  fs.createReadStream(multa.caminho_pdf).pipe(res)
}

/**
 * 7. STATUS DO LOTE (polling pro frontend)
 *    GET /detran/lotes/:id/status
 */
export function statusLoteDetran(
  req: Request,
  res: Response
) {
  const id = parseParamId(req, res, 'id')
  if (!id) return

  const lote = detranRepository.buscarLotePorId(id)

  if (!lote) {
    throw new AppError(
      'Lote não encontrado.',
      404,
      'LOTE_NOT_FOUND'
    )
  }

  const percentual =
    lote.total_veiculos > 0
      ? Math.round(
          (lote.processados / lote.total_veiculos) * 100
        )
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

}


function sanitizarNome(s: string): string {
  return String(s)
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .slice(0, 100)
}

/**
 * 8. EXPORTAR MULTAS EM ZIP (todas ou por consulta)
 *    POST /detran/exportar
 *    body: { ids?: number[] }
 */
export async function exportarMultasDetran(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { ids } = req.body as { ids?: number[] }

    const registros = detranRepository.listarParaExportacao(
      Array.isArray(ids) && ids.length ? ids : undefined
    )

    // Pré-filtra: só o que existe em disco
    const disponiveis = registros.filter(
      (r) => r.caminhoPdf && fs.existsSync(r.caminhoPdf)
    )

    if (!disponiveis.length) {
      return sendResponse.error(
        res,
        'Nenhum PDF disponível para exportação.',
        404,
        'DETRAN_EXPORT_VAZIO'
      )
    }

    // Agrupa por placa
    const porPlaca = new Map<string, typeof disponiveis>()
    for (const r of disponiveis) {
      const lista = porPlaca.get(r.placa) ?? []
      lista.push(r)
      porPlaca.set(r.placa, lista)
    }

    const nomeZip = `multas_detran_${new Date().toISOString().slice(0, 10)}.zip`

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nomeZip}"`
    )

    const archive = (archiver as any)('zip', { zlib: { level: 6 } })

    // Erros só dá pra logar — header já foi enviado
    archive.on('warning', (err: unknown) => {
      console.warn('[DETRAN Export] Aviso:', err)
    })
    archive.on('error', (err: unknown) => {
      console.error('[DETRAN Export] Erro no archive:', err)
      if (!res.headersSent) next(err)
      else res.end()
    })

    archive.pipe(res)

    let totalIncluidos = 0
    const faltantesDuranteStream: string[] = []

    for (const [placa, multas] of porPlaca) {
      const pasta = sanitizarNome(placa)
      const usados = new Set<string>()

      for (const m of multas) {
        const base = sanitizarNome(`${m.ait}_${m.dataInfracao || 'sem-data'}`)
        let arquivo = `${base}.pdf`
        let i = 1
        while (usados.has(arquivo)) {
          arquivo = `${base}_${i++}.pdf`
        }
        usados.add(arquivo)

        // arquivo pode ter sumido entre o existsSync e agora
        try {
          archive.file(m.caminhoPdf, { name: `${pasta}/${arquivo}` })
          totalIncluidos++
        } catch (e: any) {
          faltantesDuranteStream.push(`${placa}/${m.ait}: ${e?.message}`)
        }
      }
    }

    if (faltantesDuranteStream.length) {
      console.warn(
        '[DETRAN Export] Arquivos que falharam:',
        faltantesDuranteStream
      )
    }

    await archive.finalize()

    console.log(
      `[DETRAN Export] ZIP gerado — ` +
        `${totalIncluidos} PDF(s), ${porPlaca.size} veículo(s)`
    )
  } catch (error) {
    console.error('[DETRAN Export] Erro ao exportar:', error)
    if (!res.headersSent) next(error)
    else res.end()
  }
}