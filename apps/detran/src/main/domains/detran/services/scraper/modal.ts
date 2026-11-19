import type { Page } from 'puppeteer'
import { CONFIG, log } from './config'

/* ============================================================================
 * ESTADO DO MODAL
 *
 * IMPORTANTE:
 *
 * Não declare funções dentro de page.evaluate().
 *
 * Isso evita o problema:
 *
 * ReferenceError: __name is not defined
 *
 * causado pelo código transformado pelo bundler.
 * ========================================================================== */

export interface EstadoModalMultas {
  modalVisivel: boolean
  tabelaVisivel: boolean
  checkboxVisivel: boolean
  btnVerOpcoesVisivel: boolean
  btnBaixarBoletoVisivel: boolean
  btnVoltarVisivel: boolean
  alertaVisivel: boolean
  alertaTexto: string
}

export async function obterEstadoModal(
  page: Page
): Promise<EstadoModalMultas> {
  return page.evaluate(
    (seletores) => {
      const modal =
        document.querySelector(
          seletores.modalMultas
        ) as HTMLElement | null

      const tabela =
        document.querySelector(
          `${seletores.tabelaMultas} tbody tr`
        ) as HTMLTableRowElement | null

      const checkboxes =
        Array.from(
          document.querySelectorAll<HTMLInputElement>(
            seletores.checkboxMulta
          )
        )

      const btnVerOpcoes =
        document.querySelector(
          seletores.btnVerOpcoes
        ) as HTMLElement | null

      const btnBaixar =
        document.querySelector(
          seletores.btnBaixarBoleto
        ) as HTMLElement | null

      const btnVoltar =
        document.querySelector(
          seletores.btnVoltarExtrato
        ) as HTMLElement | null

      const alerta =
        document.querySelector(
          seletores.alertaErroDETRAN
        ) as HTMLElement | null

      let modalVisivel =
        false

      if (modal) {
        modalVisivel =
          window.__visivel(modal)
      }

      let btnVerOpcoesVisivel =
        false

      if (btnVerOpcoes) {
        btnVerOpcoesVisivel =
          window.__visivel(btnVerOpcoes)
      }

      let btnBaixarBoletoVisivel =
        false

      if (btnBaixar) {
        btnBaixarBoletoVisivel =
          window.__visivel(btnBaixar)
      }

      let btnVoltarVisivel =
        false

      if (btnVoltar) {
        btnVoltarVisivel =
          window.__visivel(btnVoltar)
      }

      let alertaVisivel =
        false

      let alertaTexto = ''

      if (alerta) {
        alertaVisivel =
          window.__visivel(alerta)

        alertaTexto =
          (
            alerta.innerText ||
            ''
          )
            .trim()
            .replace(
              /\s+/g,
              ' '
            )
      }

      let checkboxVisivel =
        false

      for (
        const checkbox of checkboxes
      ) {
        if (
          window.__visivel(checkbox)
        ) {
          checkboxVisivel = true
          break
        }
      }

      return {
        modalVisivel,
        tabelaVisivel:
          !!tabela,
        checkboxVisivel,
        btnVerOpcoesVisivel,
        btnBaixarBoletoVisivel,
        btnVoltarVisivel,
        alertaVisivel,
        alertaTexto,
      }
    },
    CONFIG.seletores
  )
}

/* ============================================================================
 * ABERTURA DO MODAL
 * ========================================================================== */

export async function abrirModalMultas(
  page: Page
): Promise<void> {
  log(
    'Abrindo modal de multas...'
  )

  await page.waitForSelector(
    CONFIG.seletores.alertaMultas,
    {
      timeout:
        CONFIG.timeouts.seletor,
      visible: true,
    }
  )

  await page.click(
    CONFIG.seletores.alertaMultas
  )

  await page.waitForFunction(
    (selModal, selTabela) => {
      const modal =
        document.querySelector(
          selModal
        ) as HTMLElement | null

      if (!modal) {
        return false
      }

      const modalVisivel =
        window.__visivel(modal)

      if (!modalVisivel) {
        return false
      }

      return !!document.querySelector(
        `${selTabela} tbody tr`
      )
    },
    {
      timeout: 5_000,
      polling: 100,
    },
    CONFIG.seletores.modalMultas,
    CONFIG.seletores.tabelaMultas
  )

  log(
    'Modal pronto.'
  )
}

/**
 * Garante que o modal está em um estado utilizável.
 */
export async function garantirModalMultas(
  page: Page
): Promise<void> {
  const estado =
    await obterEstadoModal(
      page
    )

  if (
    !estado.modalVisivel ||
    !estado.tabelaVisivel
  ) {
    await abrirModalMultas(
      page
    )

    return
  }

  if (
    !estado.checkboxVisivel &&
    estado.btnVoltarVisivel
  ) {
    await voltarParaSelecaoMultas(
      page
    )
  }
}

/* ============================================================================
 * LIMPEZA DO ESTADO ANTERIOR
 * ========================================================================== */

/**
 * Limpa alerta antigo e seleção em uma única ida ao contexto do Chrome.
 */
export async function limparEstadoAnterior(
  page: Page
): Promise<void> {
  await page.evaluate(
    (selAlerta, selBoxes) => {
      const alertas =
        Array.from(
          document.querySelectorAll<HTMLElement>(
            selAlerta
          )
        )

      for (const alerta of alertas) {
        alerta.style.display = 'none'
        alerta.style.visibility = 'hidden'
        alerta.style.opacity = '0'
        alerta.textContent = ''
      }

      const boxes =
        Array.from(
          document.querySelectorAll<HTMLInputElement>(
            selBoxes
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
    CONFIG.seletores.alertaErroDETRAN,
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

/* ============================================================================
 * VOLTAR PARA SELEÇÃO
 * ========================================================================== */

export async function voltarParaSelecaoMultas(
  page: Page,
  forcar = false
): Promise<void> {
  const estado =
    await obterEstadoModal(
      page
    )

  if (
    !estado.modalVisivel ||
    (!forcar &&
      estado.checkboxVisivel) ||
    !estado.btnVoltarVisivel
  ) {
    return
  }

  log(
    'Voltando para a tela de seleção de multas...'
  )

  await page.click(
    CONFIG.seletores.btnVoltarExtrato
  )

  await page.waitForFunction(
    (
      selCheckbox,
      selVoltar,
      selVerOpcoes
    ) => {
      const checkbox =
        document.querySelector(
          selCheckbox
        ) as HTMLInputElement | null

      if (!checkbox) {
        return false
      }

      const checkboxVisivel =
        window.__visivel(checkbox)

      if (!checkboxVisivel) {
        return false
      }

      const btnVoltar =
        document.querySelector(
          selVoltar
        ) as HTMLElement | null

      const btnVerOpcoes =
        document.querySelector(
          selVerOpcoes
        ) as HTMLElement | null

      let voltarVisivel = false
      let verOpcoesVisivel = false

      if (btnVoltar) {
        voltarVisivel =
          window.__visivel(btnVoltar)
      }

      if (btnVerOpcoes) {
        verOpcoesVisivel =
          window.__visivel(btnVerOpcoes)
      }

      return (
        verOpcoesVisivel ||
        !voltarVisivel
      )
    },
    {
      timeout:
        CONFIG.timeouts.seletor,
      polling: 'mutation',
    },
    CONFIG.seletores.checkboxMulta,
    CONFIG.seletores.btnVoltarExtrato,
    CONFIG.seletores.btnVerOpcoes
  )

  log(
    'Tela de seleção restaurada.'
  )
}
