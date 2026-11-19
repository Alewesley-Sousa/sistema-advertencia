import type { Page } from 'puppeteer'
import { CONFIG, log } from './config'

/* ============================================================================
 * INPUT
 * ========================================================================== */

export async function limparEDigitar(
  page: Page,
  seletor: string,
  valor: string
): Promise<void> {
  await page.click(seletor)

  await page.evaluate(
    (sel) => {
      const elemento =
        document.querySelector(
          sel
        ) as HTMLInputElement | null

      if (!elemento) {
        return
      }

      elemento.value = ''

      elemento.dispatchEvent(
        new Event(
          'input',
          {
            bubbles: true,
          }
        )
      )

      elemento.dispatchEvent(
        new Event(
          'change',
          {
            bubbles: true,
          }
        )
      )
    },
    seletor
  )

  await page.type(
    seletor,
    valor
  )
}


/* ============================================================================
 * FLUXO INICIAL
 * ========================================================================== */

export async function abrirFormularioTaxasMultas(
  page: Page
): Promise<void> {
  log(
    'Abrindo Taxas / Multas...'
  )

  await page.waitForSelector(
    CONFIG.seletores.linkTaxasMultas,
    {
      timeout:
        CONFIG.timeouts.seletor,
      visible: true,
    }
  )

  await page.click(
    CONFIG.seletores.linkTaxasMultas
  )

  await page.waitForSelector(
    CONFIG.seletores.inputPlaca,
    {
      timeout:
        CONFIG.timeouts.seletor,
      visible: true,
    }
  )

  log(
    'Formulário pronto.'
  )
}

/* ============================================================================
 * CONSULTA DO VEÍCULO
 * ========================================================================== */

export async function submeterConsulta(
  page: Page,
  placa: string,
  chassi: string
): Promise<void> {
  log(
    'Preenchendo placa e chassi...'
  )

  await limparEDigitar(
    page,
    CONFIG.seletores.inputPlaca,
    placa
  )

  await limparEDigitar(
    page,
    CONFIG.seletores.inputChassi,
    chassi
  )

  log(
    'Clicando em CONFIRMAR...'
  )

  await Promise.all([
    page
      .waitForNavigation({
        waitUntil:
          'domcontentloaded',
        timeout:
          CONFIG.timeouts.padrao,
      })
      .catch(() => null),

    page.click(
      CONFIG.seletores.btnConfirmar
    ),
  ])

  log(
    'Pós-clique. URL:',
    page.url()
  )
}
