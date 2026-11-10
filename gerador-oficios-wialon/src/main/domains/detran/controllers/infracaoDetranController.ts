/**
 * ============================================================================
 * Arquivo: controllers/infracaoDetranController.ts
 *
 * Handlers HTTP do domínio DETRAN-CE.
 * ============================================================================
 */

import { NextFunction, Request, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import { AppError } from '../../../shared/errors/AppError'
import { sendResponse } from '../../../utils/response'
import { parseParamId, parsePaginationParams } from '../../../utils/requestHelpers'

import { detranRepository } from '../repositories/detranRepository'
import { consultarEPersistir, processarFilaLote } from '../services/detranService'
import { normalizarIdentificador, sanitizarNome } from '../utils'

/* ============================================================================
 * SETUP
 *
 * O `archiver` é CommonJS (`module.exports = fn`). Importado via ESM o loader
 * esconde a factory e expõe só as classes internas — daí o createRequire.
 * Requer `archiver@^7` (a v8 mudou a API pública).
 * ==========================================================================*/

const requireCJS = createRequire(import.meta.url)
const archiver: any = requireCJS('archiver')

if (typeof archiver !== 'function') {
  throw new Error(
    `Esperava-se uma função em "archiver", mas veio ${typeof archiver}. ` +
      `Chaves: [${Object.keys(archiver ?? {}).join(', ')}]. ` +
      `Confirme que está em archiver@^7.`
  )
}

/* ============================================================================
 * HELPERS INTERNOS
 * ==========================================================================*/

/* ============================================================================
 * 1. CONSULTAR VEÍCULO AVULSO (DETRAN-CE)
 * ==========================================================================*/

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

    const placaFormatada = normalizarIdentificador(placa)
    const chassiFormatado = normalizarIdentificador(chassi)
    const forcar = Boolean(forcarRedownload)

    const { consultaId, resultado, salvas, aitJaBaixados } =
      await consultarEPersistir({
        placa: placaFormatada,
        chassi: chassiFormatado,
        forcarRedownload: forcar,
      })

    console.log(
      `[DETRAN] Consulta ${placaFormatada} — ` +
        `${aitJaBaixados.size} já baixada(s)` +
        `${forcar ? ' (redownload forçado)' : ''} — ` +
        `${salvas.inseridas} nova(s), ${salvas.atualizadas} atualizada(s)`
    )

    // Scraper rodou, mas o DETRAN retornou uma falha controlada.
    if (!resultado.sucesso) {
      return sendResponse.error(
        res,
        resultado.mensagemErro || 'Erro ao realizar consulta junto ao DETRAN-CE.',
        502,
        'DETRAN_SCRAPER_ERROR',
        {
          id: consultaId,
          statusConsulta: resultado.statusConsulta,
        }
      )
    }

    return sendResponse.success(res, {
      id: consultaId,
      placa: placaFormatada,
      chassi: chassiFormatado,
      statusConsulta: resultado.statusConsulta,
      tipoDebito: resultado.tipoDebito,
      debitos: resultado.debitos,
      caminhoPdf: resultado.caminhoPdf,
      multas: resultado.multas ?? [],
      multasInseridas: salvas.inseridas,
      multasAtualizadas: salvas.atualizadas,
    })
  } catch (error) {
    console.error('[DETRAN] Erro ao consultar veículo avulso:', error)
    return next(error)
  }
}

/* ============================================================================
 * 2. LISTAR HISTÓRICO DE CONSULTAS
 * ==========================================================================*/

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

export function obterRelatoriosDetran(req: Request, res: Response) {
  const filtro = req.query.contratos
  let contratos: string[] = []

  if (typeof filtro === 'string' && filtro) {
    try {
      const parsed = JSON.parse(filtro)
      if (Array.isArray(parsed)) {
        contratos = parsed.filter((item): item is string => typeof item === 'string')
      }
    } catch {
      contratos = filtro.split(',').map((item) => item.trim()).filter(Boolean)
    }
  }

  return sendResponse.success(res, detranRepository.obterRelatorios(contratos))
}

/* ============================================================================
 * 3. PDF CONSOLIDADO DA CONSULTA
 * ==========================================================================*/

export function baixarPdfDetran(req: Request, res: Response) {
  const id = parseParamId(req, res, 'id')
  if (!id) return

  const registro = detranRepository.buscarPorId(id)

  if (!registro?.caminho_pdf || !fs.existsSync(registro.caminho_pdf)) {
    throw new AppError(
      'Documento PDF não encontrado ou arquivo indisponível.',
      404,
      'PDF_NOT_FOUND'
    )
  }

  const nomeArquivo = path.basename(registro.caminho_pdf)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${nomeArquivo}"`)

  fs.createReadStream(registro.caminho_pdf).pipe(res)
}

/* ============================================================================
 * 4. PROCESSAR LOTE DE VEÍCULOS
 *
 * O "lote" é só um agrupador para progresso. Cada veículo é processado
 * pela mesma rotina da consulta avulsa.
 * ==========================================================================*/

export async function processarLoteDetran(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { nomeArquivo, veiculos, modoBusca } = req.body as {
      nomeArquivo?: string
      veiculos?: Array<{
        placa: string
        chassi: string
        modelo?: string
        contrato?: string
      }>
      modoBusca?: 'NORMAL' | 'RAPIDO'
    }

    if (!Array.isArray(veiculos) || veiculos.length === 0) {
      return sendResponse.validationError(res, 'Lista de veículos inválida.', [
        { field: 'veiculos', message: 'A lista deve ser um array não vazio.' },
      ])
    }

    const veiculosLimpos = veiculos
      .map((v) => ({
        placa: normalizarIdentificador(v.placa),
        chassi: normalizarIdentificador(v.chassi),
        modelo: String(v.modelo ?? '').trim() || undefined,
        contrato: String(v.contrato ?? '').trim() || undefined,
      }))
      .filter((v) => v.placa && v.chassi)

    if (veiculosLimpos.length === 0) {
      return sendResponse.validationError(
        res,
        'Nenhum veículo válido recebido.',
        [
          {
            field: 'veiculos',
            message: 'Todos os veículos vieram com placa ou chassi vazios.',
          },
        ]
      )
    }

    const nomeLote = nomeArquivo || `Lote_${new Date().toISOString().slice(0, 10)}`

    const loteId = detranRepository.criarLote(nomeLote, veiculosLimpos.length)

    // Background: o cliente já recebe 202
    const concorrencia = modoBusca === 'RAPIDO' ? 2 : 1

    processarFilaLote(loteId, veiculosLimpos, concorrencia).catch((err: unknown) => {
      console.error(`[DETRAN] Erro no processamento do lote ${loteId}:`, err)
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
    console.error('[DETRAN] Erro ao criar lote:', error)
    return next(error)
  }
}

/* ============================================================================
 * 5. MULTAS INDIVIDUAIS DE UMA CONSULTA
 * ==========================================================================*/

export function listarMultasDaConsulta(req: Request, res: Response) {
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

/* ============================================================================
 * 6. PDF INDIVIDUAL DE UMA MULTA
 * ==========================================================================*/

export function baixarPdfMultaDetran(req: Request, res: Response) {
  const id = parseParamId(req, res, 'id')
  if (!id) return

  const multa = detranRepository.buscarMultaPorId(id)

  if (!multa?.caminho_pdf || !fs.existsSync(multa.caminho_pdf)) {
    throw new AppError(
      'Boleto não encontrado ou indisponível.',
      404,
      'PDF_NOT_FOUND'
    )
  }

  const nomeArquivo = path.basename(multa.caminho_pdf)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${nomeArquivo}"`)

  fs.createReadStream(multa.caminho_pdf).pipe(res)
}

/* ============================================================================
 * 7. STATUS DO LOTE (polling)
 * ==========================================================================*/

export function statusLoteDetran(req: Request, res: Response) {
  const id = parseParamId(req, res, 'id')
  if (!id) return

  const lote = detranRepository.buscarLotePorId(id)

  if (!lote) {
    throw new AppError('Lote não encontrado.', 404, 'LOTE_NOT_FOUND')
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
}

/* ============================================================================
 * 8. EXPORTAR MULTAS EM ZIP
 *    POST /detran/exportar
 *    body: { ids?: number[] }   // vazio = exporta tudo
 * ==========================================================================*/

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

    const porPlaca = new Map<string, typeof disponiveis>()
    for (const r of disponiveis) {
      const lista = porPlaca.get(r.placa) ?? []
      lista.push(r)
      porPlaca.set(r.placa, lista)
    }

    const nomeZip = `multas_detran_${new Date().toISOString().slice(0, 10)}.zip`

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${nomeZip}"`)

    const archive = archiver('zip', { zlib: { level: 6 } })

    archive.on('warning', (err: unknown) => {
      console.warn('[DETRAN Export] Aviso:', err)
    })

    // Erros do archive: como o header já foi enviado em `pipe(res)`,
    // não dá para delegar pro `next()` do Express (o callback está fora
    // da stack de middleware). Logamos e encerramos a resposta.
    archive.on('error', (err: unknown) => {
      console.error('[DETRAN Export] Erro no archive:', err)
      if (res.headersSent) res.end()
    })

    archive.pipe(res)

    let totalIncluidos = 0
    const faltantes: string[] = []

    for (const [placa, multas] of porPlaca) {
      const pasta = sanitizarNome(placa)
      const usados = new Set<string>()

      for (const m of multas) {
        const base = sanitizarNome(`MULTA-AIT-${m.dataInfracao || 'sem-data'}`)
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
          faltantes.push(`${placa}/${m.ait}: ${e?.message}`)
        }
      }
    }

    if (faltantes.length) {
      console.warn('[DETRAN Export] Arquivos que falharam:', faltantes)
    }

    await archive.finalize()

    console.log(
      `[DETRAN Export] ZIP gerado — ` +
        `${totalIncluidos} PDF(s) em ${porPlaca.size} pasta(s)`
    )
  } catch (error) {
    console.error('[DETRAN Export] Erro ao exportar:', error)
    if (!res.headersSent) next(error)
    else res.end()
  }
}