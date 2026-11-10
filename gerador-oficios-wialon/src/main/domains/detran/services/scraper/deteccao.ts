import type { Page } from 'puppeteer'
import type { SituacaoDebitosVeiculo } from '../../types'
import { CONFIG } from './config'

/* ============================================================================
 * DETECÇÃO DE MULTAS
 * ========================================================================== */

export async function detectarMultas(
  page: Page
): Promise<{
  qtd: number
  texto: string
} | null> {
  const handle = await page.waitForFunction(
    (selAlerta, selResultado) => {
      const alerta =
        document.querySelector(
          selAlerta
        ) as HTMLElement | null

      if (alerta) {
        const style =
          window.getComputedStyle(alerta)

        const rect =
          alerta.getBoundingClientRect()

        if (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0
        ) {
          const texto =
            (
              alerta.innerText ||
              ''
            )
              .trim()
              .replace(
                /\s+/g,
                ' '
              )

          if (texto) {
            return {
              temMultas: true,
              texto,
            }
          }
        }
      }

      const resultadoVeiculo =
        Array.from(
          document.querySelectorAll(
            selResultado
          )
        ).some(
          elemento =>
            (
              elemento.textContent ||
              ''
            ).includes(
              'Serviços referentes ao veículo de placa'
            )
        )

      if (resultadoVeiculo) {
        return {
          temMultas: false,
          texto: '',
        }
      }

      return false
    },
    {
      timeout:
        CONFIG.timeouts.resultadoConsulta,
      polling: 'mutation',
    },
    CONFIG.seletores.alertaMultas,
    CONFIG.seletores.resultadoVeiculo
  ).catch(() => null)

  if (!handle) {
    return null
  }

  const resultado =
    (await handle.jsonValue()) as {
      temMultas: boolean
      texto: string
    }

  if (!resultado.temMultas) {
    return null
  }

  const match =
    resultado.texto.match(
      /(\d+)\s+multa/i
    )

  return {
    qtd:
      match
        ? Number(match[1])
        : 0,
    texto:
      resultado.texto,
  }
}

export async function extrairSituacaoDebitos(
  page: Page
): Promise<SituacaoDebitosVeiculo> {
  return page.evaluate(() => {
    let painelSituacao: HTMLElement | null = null

    for (const painel of document.querySelectorAll<HTMLElement>(
      '.panel.panel-primary'
    )) {
      const titulo = painel
        .querySelector('.panel-heading .panel-title')
        ?.textContent?.trim()

      if (titulo === 'Situação e Taxas/Multas do Veículo') {
        painelSituacao = painel
        break
      }
    }

    const listaServicos = painelSituacao?.querySelector<HTMLElement>(
      '.panel-body .list-group'
    )
    const ipvaElemento = listaServicos?.querySelector<HTMLElement>('.ipva')
    const licenciamentoElemento =
      listaServicos?.querySelector<HTMLElement>('.licenciamento')
    let ipva: SituacaoDebitosVeiculo['ipva'] = 'DESCONHECIDO'
    let licenciamento: SituacaoDebitosVeiculo['licenciamento'] = 'DESCONHECIDO'

    if (ipvaElemento) {
      if (ipvaElemento.classList.contains('alert-danger')) {
        ipva = 'DEBITO'
      } else if (ipvaElemento.classList.contains('alert-success')) {
        ipva = 'SEM_DEBITO'
      } else if (ipvaElemento.classList.contains('alert-info')) {
        ipva = 'INFORMACAO'
      }
    }

    if (licenciamentoElemento) {
      if (licenciamentoElemento.classList.contains('alert-danger')) {
        licenciamento = 'DEBITO'
      } else if (licenciamentoElemento.classList.contains('alert-success')) {
        licenciamento = 'SEM_DEBITO'
      } else if (licenciamentoElemento.classList.contains('alert-info')) {
        licenciamento = 'INFORMACAO'
      }
    }

    return {
      ipva,
      licenciamento,
    }
  })
}
