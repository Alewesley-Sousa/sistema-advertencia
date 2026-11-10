import type { Page } from 'puppeteer'
import type { MultaDetran } from '../../types'
import { chaveMulta } from '../../utils'
import { CONFIG, log } from './config'

/* ============================================================================
 * EXTRAÇÃO DAS MULTAS
 * ========================================================================== */

export async function extrairMultas(
  page: Page
): Promise<MultaDetran[]> {
  const anoAtual =
    new Date().getFullYear()

  const multas =
    await page.evaluate(
      (selTabela, anoAtual) => {
        const linhas =
          Array.from(
            document.querySelectorAll<HTMLTableRowElement>(
              `${selTabela} tbody tr`
            )
          )

        const resultado: MultaDetran[] = []

        for (
          const tr of linhas
        ) {
          const tds =
            Array.from(
              tr.querySelectorAll<HTMLTableCellElement>(
                'td'
              )
            )

          if (
            tds.length < 8
          ) {
            continue
          }

          const textoLinha =
            (
              tr.innerText ||
              ''
            )
              .trim()
              .toUpperCase()

          if (
            textoLinha.includes(
              'TOTAL'
            )
          ) {
            continue
          }

          const ait =
            (
              tds[1]?.innerText ||
              ''
            ).trim()

          const dataInfracao =
            (
              tds[4]?.innerText ||
              ''
            ).trim()

          if (
            !ait ||
            ait === '--' ||
            !dataInfracao
          ) {
            continue
          }

          const matchAno =
            dataInfracao.match(
              /^(\d{2})\/(\d{2})\/(\d{4})$/
            )

          if (
            !matchAno ||
            Number(matchAno[3]) !== anoAtual
          ) {
            continue
          }

          resultado.push({
            ait,
            motivo:
              (
                tds[3]?.innerText ||
                ''
              ).trim(),
            dataInfracao,
            dataVencimento:
              (
                tds[5]?.innerText ||
                ''
              ).trim(),
            valor:
              (
                tds[6]?.innerText ||
                ''
              ).trim(),
            valorPagar:
              (
                tds[7]?.innerText ||
                ''
              ).trim(),
          })
        }

        return resultado
      },
      CONFIG.seletores.tabelaMultas,
      anoAtual
    )

  const mapa =
    new Map<
      string,
      MultaDetran
    >()

  for (
    const multa of multas
  ) {
    const chave =
      chaveMulta(
        multa.ait,
        multa.dataInfracao
      )

    if (
      !mapa.has(chave)
    ) {
      mapa.set(
        chave,
        multa
      )
    }
  }

  const unicas =
    Array.from(
      mapa.values()
    )

  if (
    unicas.length !==
    multas.length
  ) {
    log(
      `Duplicatas removidas: ${
        multas.length -
        unicas.length
      }`
    )
  }

  return unicas
}

/* ============================================================================
 * CHECKBOX
 * ========================================================================== */

/**
 * Limpa todos os checkboxes usando clique nativo.
 *
 * Isso permite que os handlers JS do DETRAN sejam executados
 * normalmente.
 */
export async function limparSelecaoMultas(
  page: Page
): Promise<void> {
  await page.evaluate(
    sel => {
      const boxes =
        Array.from(
          document.querySelectorAll<HTMLInputElement>(
            sel
          )
        )

      for (const checkbox of boxes) {
        if (
          checkbox.checked &&
          !checkbox.disabled
        ) {
          checkbox.click()
        }
      }
    },
    CONFIG.seletores.checkboxMulta
  )

  await page.waitForFunction(
    sel =>
      Array.from(
        document.querySelectorAll<HTMLInputElement>(
          sel
        )
      ).every(
        checkbox => !checkbox.checked
      ),
    {
      timeout:
        CONFIG.timeouts.selecao,
      polling: 'mutation',
    },
    CONFIG.seletores.checkboxMulta
  )
}

/**
 * Seleciona somente um AIT.
 */
export async function marcarApenasUm(
  page: Page,
  ait: string
): Promise<void> {
  log(
    `Marcando checkbox do AIT ${ait}...`
  )

  const seletorAlvo =
    `#multas_${ait}`

  await page.waitForSelector(
    seletorAlvo,
    {
      timeout:
        CONFIG.timeouts.selecao,
      visible: true,
    }
  )

  await limparSelecaoMultas(
    page
  )

  await page.evaluate(
    sel => {
      const checkbox =
        document.querySelector(
          sel
        ) as HTMLInputElement | null

      if (!checkbox) {
        throw new Error(
          `Checkbox ${sel} não encontrado.`
        )
      }

      if (!checkbox.checked) {
        checkbox.click()
      }
    },
    seletorAlvo
  )

  await page.waitForFunction(
    sel => {
      const checkbox =
        document.querySelector(
          sel
        ) as HTMLInputElement | null

      return (
        !!checkbox &&
        checkbox.checked
      )
    },
    {
      timeout:
        CONFIG.timeouts.selecao,
      polling: 'mutation',
    },
    seletorAlvo
  )

  log(
    `AIT ${ait} selecionado.`
  )
}
