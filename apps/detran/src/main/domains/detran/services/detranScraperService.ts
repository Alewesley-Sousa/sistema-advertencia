import type { BrowserContext } from 'puppeteer'
import path from 'node:path'
import fs from 'node:fs'
import type { DadosConsultaDetran, ResultadoConsultaDetran } from '../types'
import { chaveMulta } from '../utils'
import { montarCookieHeader, processarMulta } from './scraper/boleto'
import type { SessaoDownloadDetran } from './scraper/boleto'
import { configurarPagina, obterBrowserDetran } from './scraper/browser'
import { CONFIG, log, logErr, medirEtapa } from './scraper/config'
import { salvarDebug } from './scraper/debug'
import { detectarMultas, extrairSituacaoDebitos } from './scraper/deteccao'
import { abrirFormularioTaxasMultas, submeterConsulta } from './scraper/formulario'
import { garantirModalMultas } from './scraper/modal'
import { extrairMultas } from './scraper/tabelaMultas'

export { fecharBrowserDetran } from './scraper/browser'

/* ============================================================================
 * CONSULTA PRINCIPAL
 * ========================================================================== */

export async function consultarVeiculoDetran(
  dados: DadosConsultaDetran
): Promise<ResultadoConsultaDetran> {
  const {
    placa,
    chassi,
    aitJaBaixados,
  } = dados

  log(
    '======================================================'
  )

  log(
    `Iniciando consulta: placa=${placa} chassi=${chassi}`
  )

  if (
    aitJaBaixados &&
    aitJaBaixados.size > 0
  ) {
    log(
      `Multas já baixadas em execuções anteriores: ${aitJaBaixados.size}`
    )
  }

  const storageDir =
    path.resolve(
      process.cwd(),
      'storage',
      'documentos',
      'detran'
    )

  fs.mkdirSync(
    storageDir,
    {
      recursive: true,
    }
  )

  let context:
    | BrowserContext
    | null = null

  try {
    const browser =
      await obterBrowserDetran()

    context =
      await browser.createBrowserContext()

    const page =
      await context.newPage()

    await configurarPagina(
      page
    )

    await medirEtapa(
      'goto central',
      async () => {
        log(
          'Navegando para a central...'
        )

        await page.goto(
          CONFIG.urls.central,
          {
            waitUntil:
              'domcontentloaded',
          }
        )
      }
    )

    await medirEtapa(
      'abrir taxas/multas',
      () =>
        abrirFormularioTaxasMultas(
          page
        )
    )

    await medirEtapa(
      'consultar veículo',
      () =>
        submeterConsulta(
          page,
          placa,
          chassi
        )
    )

    const deteccao =
      await medirEtapa(
        'detectar multas',
        () =>
          detectarMultas(
            page
          )
      )

    log(
      'Detecção:',
      deteccao
        ? `${deteccao.qtd} multa(s)`
        : 'sem multas'
    )

      const debitos = await extrairSituacaoDebitos(page)

    if (
      !deteccao ||
      deteccao.qtd <= 0
    ) {
      return {
        sucesso: true,
        placa,
        chassi,
        statusConsulta:
          'QUITADO',
        confirmacaoLimpa: true,
        debitos,
      }
    }

    await medirEtapa(
      'abrir modal multas',
      () =>
        garantirModalMultas(
          page
        )
    )

    const multas =
      await medirEtapa(
        'extrair multas',
        () =>
          extrairMultas(
            page
          )
      )

    log(
      'Multas extraídas:',
      JSON.stringify(
        multas,
        null,
        2
      )
    )

    if (
      multas.length === 0
    ) {
      const anoAtual =
        new Date().getFullYear()

      log(
        `Nenhuma multa do ano ${anoAtual} encontrada. Infrações de outros anos serão ignoradas.`
      )

      return {
        sucesso: true,
        placa,
        chassi,
        statusConsulta:
          'QUITADO',
        debitos,
      }
    }

    const tipoDebito =
      `${multas.length} multa${
        multas.length > 1
          ? 's'
          : ''
      } de trânsito`

    log(
      '======================================================'
    )

    log(
      `Iniciando processamento de ${multas.length} multa(s)...`
    )

    log(
      '======================================================'
    )

    let sessaoDownload:
      | SessaoDownloadDetran
      | undefined

    let primeiroPdfOk:
      | string
      | undefined

    for (
      let i = 0;
      i < multas.length;
      i++
    ) {
      const multa =
        multas[i]

      log(
        `\n----- Boleto ${
          i + 1
        }/${multas.length}: AIT ${
          multa.ait
        } (${
          multa.dataInfracao
        }) -----`
      )

      const chave =
        chaveMulta(
          multa.ait,
          multa.dataInfracao
        )

      if (
        aitJaBaixados?.has(
          chave
        )
      ) {
        log(
          'Multa já baixada anteriormente. Pulando download.'
        )

        multa.jaBaixada =
          true

        continue
      }

      try {
        if (!sessaoDownload) {
          const [
            userAgent,
            cookieHeader,
          ] = await Promise.all([
            browser.userAgent(),
            montarCookieHeader(
              context
            ),
          ])

          sessaoDownload = {
            userAgent,
            cookieHeader,
          }
        }

        await medirEtapa(
          `processar boleto ${multa.ait}`,
          async () => {
            await processarMulta(
              context!,
              page,
              placa,
              multa,
              storageDir,
              sessaoDownload!
            )
          }
        )

        if (
          multa.caminhoPdf &&
          !primeiroPdfOk
        ) {
          primeiroPdfOk =
            multa.caminhoPdf
        }

        aitJaBaixados?.add(
          chave
        )

        log(
          `Boleto ${multa.ait} concluído com sucesso.`
        )
      } catch (error: unknown) {
        const mensagem =
          error instanceof Error
            ? error.message
            : 'Erro inesperado na emissão.'

        logErr(
          `Erro no boleto da multa ${multa.ait}:`,
          mensagem
        )

        multa.erroEmissao =
          mensagem

        await salvarDebug(
          page,
          `falha-boleto-${multa.ait}`
        )
      }
    }

    log(
      '======================================================'
    )

    const baixadas =
      multas.filter(
        multa =>
          !!multa.caminhoPdf
      ).length

    const puladas =
      multas.filter(
        multa =>
          !!multa.jaBaixada
      ).length

    const comErro =
      multas.filter(
        multa =>
          !!multa.erroEmissao
      )

    log(
      `Resumo: ${baixadas} nova(s), ${puladas} já baixada(s), ${comErro.length} com erro`
    )

    if (
      comErro.length > 0
    ) {
      for (
        const multa of comErro
      ) {
        log(
          `  ⚠ ${multa.ait}: ${multa.erroEmissao}`
        )
      }
    }

    log(
      '======================================================'
    )

    return {
      sucesso: true,
      placa,
      chassi,
      statusConsulta:
        'COM_DEBITO',
      tipoDebito,
      debitos,
      multas,
      caminhoPdf:
        primeiroPdfOk,
    }
  } catch (error: unknown) {
    const mensagem =
      error instanceof Error
        ? error.message
        : String(error)

    logErr(
      'ERRO NÃO TRATADO:',
      mensagem
    )

    logErr(
      'Stack:',
      error instanceof Error
        ? error.stack
        : undefined
    )

    return {
      sucesso: false,
      placa,
      chassi,
      statusConsulta:
        'ERRO',
      mensagemErro:
        mensagem ||
        'Erro desconhecido durante a automação.',
    }
  } finally {
    if (context) {
      log(
        'Fechando contexto do veículo...'
      )

      await context
        .close()
        .catch((error) => {
          logErr(
            'Erro ao fechar contexto:',
            error instanceof Error
              ? error.message
              : String(error)
          )
        })
    }

    log(
      'Consulta finalizada.'
    )

    log(
      '======================================================'
    )
  }
}
