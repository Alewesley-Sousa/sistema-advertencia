import puppeteer, {
  Browser,
  BrowserContext,
  Page,
} from 'puppeteer'
import path from 'node:path'
import fs from 'node:fs'

/* ============================================================================
 * TIPOS
 * ========================================================================== */

import type {
  DadosConsultaDetran,
  ResultadoConsultaDetran,
  MultaDetran,
  SituacaoDebitosVeiculo,
} from '../types'

import { chaveMulta } from '../utils'

/* ============================================================================
 * CONFIGURAÇÃO
 * ========================================================================== */

const TAG = '[DETRAN Scraper]'

const CONFIG = {
  urls: {
    central:
      'https://sistemas.detran.ce.gov.br/central/',
  },

  seletores: {
    linkTaxasMultas:
      '#taxas_multas, a[data-title="Taxas / Multas"]',

    inputPlaca:
      '#veiculo_placa',

    inputChassi:
      '#veiculo_renavam_chassi',

    btnConfirmar:
      '#submit-veiculo',

    alertaMultas:
      '.alert.multas.links-veiculo-danger, .alert.multas.links-veiculo',

    resultadoVeiculo:
      'h3',

    modalMultas:
      '#outros-servicos-modal',

    tabelaMultas:
      '#emissao-multas',

    checkboxMulta:
      'input.multas',

    btnVerOpcoes:
      '#btn-emitir-extrato',

    btnBaixarBoleto:
      '#btn-exibir-extrato',

    btnVoltarExtrato:
      '#btn-voltar-extrato',

    alertaErroDETRAN:
      '.multas-alert',
  },

  timeouts: {
    navegacao: 60_000,
    padrao: 30_000,
    seletor: 15_000,
    novaAba: 10_000,
    selecao: 5_000,
    emissao: 15_000,
    resultadoConsulta: 5_000,
  },
} as const

/* ============================================================================
 * BROWSER COMPARTILHADO
 * ========================================================================== */

let browserDetran: Browser | null = null
let browserDetranPromise: Promise<Browser> | null = null

/* ============================================================================
 * LOG
 * ========================================================================== */

function log(...args: unknown[]) {
  console.log(
    TAG,
    new Date().toISOString(),
    ...args
  )
}

function logErr(...args: unknown[]) {
  console.error(
    TAG,
    new Date().toISOString(),
    ...args
  )
}

/* ============================================================================
 * MEDIÇÃO
 * ========================================================================== */

async function medirEtapa<T>(
  nome: string,
  fn: () => Promise<T>
): Promise<T> {
  const inicio = performance.now()

  try {
    return await fn()
  } finally {
    const tempo =
      performance.now() - inicio

    log(
      `${nome}: ${tempo.toFixed(0)}ms`
    )
  }
}

/* ============================================================================
 * CHROME
 * ========================================================================== */

function getChromeExecutablePath():
  | string
  | undefined {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(
      process.env.LOCALAPPDATA || '',
      'Google',
      'Chrome',
      'Application',
      'chrome.exe'
    ),
  ]

  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      log(
        'Chrome encontrado em:',
        chromePath
      )
      return chromePath
    }
  }

  logErr(
    'Chrome NÃO encontrado. Usando Chromium do Puppeteer.'
  )

  return undefined
}

/* ============================================================================
 * BROWSER GLOBAL
 * ========================================================================== */

async function obterBrowserDetran(): Promise<Browser> {
  if (browserDetran) {
    return browserDetran
  }

  if (browserDetranPromise) {
    return browserDetranPromise
  }

  browserDetranPromise =
    (async () => {
      log(
        'Iniciando Chromium compartilhado...'
      )

      const browser =
        await puppeteer.launch({
          headless: true,
          executablePath:
            getChromeExecutablePath(),
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ],
        })

      browserDetran = browser

      browser.once(
        'disconnected',
        () => {
          logErr(
            'Browser DETRAN desconectado.'
          )

          if (
            browserDetran ===
            browser
          ) {
            browserDetran = null
          }
        }
      )

      log(
        'Browser OK. Versão:',
        await browser.version()
      )

      return browser
    })()

  try {
    return await browserDetranPromise
  } finally {
    browserDetranPromise = null
  }
}

/**
 * Feche o Chromium quando a aplicação inteira for encerrada.
 */
export async function fecharBrowserDetran(): Promise<void> {
  const browser =
    browserDetran

  browserDetran = null

  if (!browser) {
    return
  }

  try {
    log(
      'Fechando Chromium compartilhado...'
    )

    await browser.close()
  } catch (error) {
    logErr(
      'Erro ao fechar Chromium:',
      error instanceof Error
        ? error.message
        : String(error)
    )
  }
}

/* ============================================================================
 * CONFIGURAÇÃO DA PÁGINA
 * ========================================================================== */

/**
 * Não bloqueamos imagens, SVGs, CSS ou JS.
 *
 * Os testes anteriores mostraram que bloquear assets causava
 * vários net::ERR_FAILED no próprio DETRAN.
 */
async function configurarPagina(
  page: Page
): Promise<void> {
  page.setDefaultNavigationTimeout(
    CONFIG.timeouts.navegacao
  )

  page.setDefaultTimeout(
    CONFIG.timeouts.padrao
  )

  page.on(
    'requestfailed',
    (request) => {
      logErr(
        `Requisição falhou: ${request.method()} ${request.url()} — ${
          request.failure()?.errorText ||
          'erro desconhecido'
        }`
      )
    }
  )

  page.on(
    'pageerror',
    (error: unknown) => {
      logErr(
        'Erro de JS na página:',
        error instanceof Error
          ? error.message
          : String(error)
      )
    }
  )
}

/* ============================================================================
 * DEBUG
 * ========================================================================== */

function sanitizarNomeArquivo(
  valor: string
): string {
  return valor
    .trim()
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      '_'
    )
    .replace(
      /\s+/g,
      '_'
    )
}

async function salvarDebug(
  page: Page,
  contexto: string
): Promise<void> {
  try {
    const dir =
      path.resolve(
        process.cwd(),
        'storage',
        'debug',
        'detran'
      )

    fs.mkdirSync(
      dir,
      {
        recursive: true,
      }
    )

    const stamp =
      new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          '-'
        )

    const base =
      `${stamp}_${sanitizarNomeArquivo(contexto)}`

    fs.writeFileSync(
      path.join(
        dir,
        `${base}.html`
      ),
      await page
        .content()
        .catch(() => '')
    )

    await page
      .screenshot({
        path: path.join(
          dir,
          `${base}.png`
        ),
        fullPage: true,
      })
      .catch(() => {})

    logErr(
      `Debug salvo em storage/debug/detran/${base}.{html,png}`
    )

    logErr(
      `URL: ${page.url()}`
    )
  } catch (error) {
    logErr(
      'Falha ao salvar debug:',
      error instanceof Error
        ? error.message
        : String(error)
    )
  }
}

/* ============================================================================
 * INPUT
 * ========================================================================== */

async function limparEDigitar(
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
 * NOMES DE ARQUIVO
 * ========================================================================== */

function formatarDataParaNome(
  dataInfracao:
    | string
    | undefined
): string {
  const data =
    (
      dataInfracao ||
      ''
    ).trim()

  if (!data) {
    return 'sem-data'
  }

  const match =
    data.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    )

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }

  return data.replace(
    /[^a-zA-Z0-9]/g,
    '-'
  )
}

function gerarNomeArquivoBoleto(
  placa: string,
  multa: MultaDetran
): string {
  const placaNormalizada =
    sanitizarNomeArquivo(
      placa
        .toUpperCase()
        .trim()
    )

  const ait =
    sanitizarNomeArquivo(
      multa.ait
    )

  const data =
    formatarDataParaNome(
      multa.dataInfracao
    )

  return (
    `MULTA-${placaNormalizada}-${ait}-${data}.pdf`
  )
}

/* ============================================================================
 * FLUXO INICIAL
 * ========================================================================== */

async function abrirFormularioTaxasMultas(
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

async function submeterConsulta(
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

/* ============================================================================
 * DETECÇÃO DE MULTAS
 * ========================================================================== */

async function detectarMultas(
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

async function extrairSituacaoDebitos(
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

interface EstadoModalMultas {
  modalVisivel: boolean
  tabelaVisivel: boolean
  checkboxVisivel: boolean
  btnVerOpcoesVisivel: boolean
  btnBaixarBoletoVisivel: boolean
  btnVoltarVisivel: boolean
  alertaVisivel: boolean
  alertaTexto: string
}

async function obterEstadoModal(
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
        const style =
          window.getComputedStyle(
            modal
          )

        const rect =
          modal.getBoundingClientRect()

        modalVisivel =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0
      }

      let btnVerOpcoesVisivel =
        false

      if (btnVerOpcoes) {
        const style =
          window.getComputedStyle(
            btnVerOpcoes
          )

        const rect =
          btnVerOpcoes.getBoundingClientRect()

        btnVerOpcoesVisivel =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0
      }

      let btnBaixarBoletoVisivel =
        false

      if (btnBaixar) {
        const style =
          window.getComputedStyle(
            btnBaixar
          )

        const rect =
          btnBaixar.getBoundingClientRect()

        btnBaixarBoletoVisivel =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0
      }

      let btnVoltarVisivel =
        false

      if (btnVoltar) {
        const style =
          window.getComputedStyle(
            btnVoltar
          )

        const rect =
          btnVoltar.getBoundingClientRect()

        btnVoltarVisivel =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0
      }

      let alertaVisivel =
        false

      let alertaTexto = ''

      if (alerta) {
        const style =
          window.getComputedStyle(
            alerta
          )

        const rect =
          alerta.getBoundingClientRect()

        alertaVisivel =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0

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
        const style =
          window.getComputedStyle(
            checkbox
          )

        const rect =
          checkbox.getBoundingClientRect()

        if (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0
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

async function abrirModalMultas(
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

      const style =
        window.getComputedStyle(
          modal
        )

      const rect =
        modal.getBoundingClientRect()

      const modalVisivel =
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0

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
async function garantirModalMultas(
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
async function limparEstadoAnterior(
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

async function voltarParaSelecaoMultas(
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

      const checkboxStyle =
        window.getComputedStyle(
          checkbox
        )

      const checkboxRect =
        checkbox.getBoundingClientRect()

      const checkboxVisivel =
        checkboxStyle.display !== 'none' &&
        checkboxStyle.visibility !== 'hidden' &&
        checkboxStyle.opacity !== '0' &&
        checkboxRect.width > 0 &&
        checkboxRect.height > 0

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
        const style =
          window.getComputedStyle(
            btnVoltar
          )

        const rect =
          btnVoltar.getBoundingClientRect()

        voltarVisivel =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0
      }

      if (btnVerOpcoes) {
        const style =
          window.getComputedStyle(
            btnVerOpcoes
          )

        const rect =
          btnVerOpcoes.getBoundingClientRect()

        verOpcoesVisivel =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0
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

/* ============================================================================
 * EXTRAÇÃO DAS MULTAS
 * ========================================================================== */

async function extrairMultas(
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
async function limparSelecaoMultas(
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
async function marcarApenasUm(
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

/* ============================================================================
 * PAGAMENTO
 * ========================================================================== */

type EstadoPagamento =
  | {
      status: 'baixar'
    }
  | {
      status: 'ver-opcoes'
    }

/**
 * Aguarda somente os estados válidos ANTES de tentar emitir o boleto.
 *
 * IMPORTANTE:
 * O .multas-alert pode conter uma mensagem deixada pela emissão de um AIT
 * anterior. Portanto, ele NÃO é consultado aqui.
 *
 * Neste ponto só nos interessa saber qual ação o usuário precisa executar:
 * - clicar em "Baixar boleto"; ou
 * - clicar em "Ver opções de pagamento".
 */
async function esperarEstadoPagamento(
  page: Page
): Promise<EstadoPagamento> {
  const handle =
    await page.waitForFunction(
      (
        selBaixar,
        selVerOpcoes
      ) => {
        const btnBaixar =
          document.querySelector(
            selBaixar
          ) as HTMLElement | null

        if (btnBaixar) {
          const style =
            window.getComputedStyle(
              btnBaixar
            )

          const rect =
            btnBaixar.getBoundingClientRect()

          if (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0
          ) {
            return {
              status: 'baixar',
            }
          }
        }

        const btnVerOpcoes =
          document.querySelector(
            selVerOpcoes
          ) as HTMLElement | null

        if (btnVerOpcoes) {
          const style =
            window.getComputedStyle(
              btnVerOpcoes
            )

          const rect =
            btnVerOpcoes.getBoundingClientRect()

          if (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0
          ) {
            return {
              status: 'ver-opcoes',
            }
          }
        }

        return false
      },
      {
        timeout:
          CONFIG.timeouts.emissao,
        polling: 'mutation',
      },
      CONFIG.seletores.btnBaixarBoleto,
      CONFIG.seletores.btnVerOpcoes
    ).catch(() => null)

  if (!handle) {
    throw new Error(
      'Timeout aguardando os botões de pagamento do DETRAN.'
    )
  }

  return (
    await handle.jsonValue()
  ) as EstadoPagamento
}

/**
 * Depois de clicar em "Ver opções de pagamento", o DETRAN pode levar
 * alguns milissegundos para esconder esse botão e exibir "Baixar boleto".
 *
 * IMPORTANTE:
 * Neste segundo estágio NÃO usamos esperarEstadoPagamento(), porque
 * "Ver opções" ainda pode continuar visível por alguns instantes.
 */
async function esperarBoletoOuAlerta(
  page: Page
): Promise<
  | { status: 'baixar' }
  | {
      status: 'alerta'
      mensagem: string
    }
> {
  const handle =
    await page.waitForFunction(
      (
        selBaixar,
        selAlerta
      ) => {
        const alerta =
          document.querySelector(
            selAlerta
          ) as HTMLElement | null

        if (alerta) {
          const style =
            window.getComputedStyle(
              alerta
            )

          const rect =
            alerta.getBoundingClientRect()

          if (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0
          ) {
            const mensagem =
              (
                alerta.innerText ||
                ''
              )
                .trim()
                .replace(
                  /\s+/g,
                  ' '
                )

            if (mensagem) {
              return {
                status: 'alerta',
                mensagem,
              }
            }
          }
        }

        const btnBaixar =
          document.querySelector(
            selBaixar
          ) as HTMLElement | null

        if (btnBaixar) {
          const style =
            window.getComputedStyle(
              btnBaixar
            )

          const rect =
            btnBaixar.getBoundingClientRect()

          if (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0
          ) {
            return {
              status: 'baixar',
            }
          }
        }

        return false
      },
      {
        timeout:
          CONFIG.timeouts.emissao,
        polling: 'mutation',
      },
      CONFIG.seletores.btnBaixarBoleto,
      CONFIG.seletores.alertaErroDETRAN
    ).catch(() => null)

  if (!handle) {
    throw new Error(
      'Timeout aguardando "Baixar boleto" ou alerta do DETRAN após "Ver opções de pagamento".'
    )
  }

  return (
    await handle.jsonValue()
  ) as
    | {
        status: 'baixar'
      }
    | {
        status: 'alerta'
        mensagem: string
      }
}

/**
 * Prepara a emissão do boleto.
 *
 * O DETRAN pode:
 * A) já mostrar "Baixar boleto"
 * ou:
 * B) mostrar "Ver opções de pagamento"
 *    -> clicar
 *    -> aguardar "Baixar boleto" ou alerta
 */
async function prepararDownloadBoleto(
  page: Page
): Promise<void> {
  const estado =
    await esperarEstadoPagamento(
      page
    )

  if (
    estado.status ===
    'baixar'
  ) {
    log(
      'Botão "Baixar boleto" já está disponível.'
    )
    return
  }

  log(
    'Botão "Ver opções de pagamento" detectado.'
  )

  await page.click(
    CONFIG.seletores.btnVerOpcoes
  )

  log(
    'Aguardando resultado da emissão: "Baixar boleto" ou validação do DETRAN...'
  )

  const proximoEstado =
    await esperarBoletoOuAlerta(
      page
    )

  if (
    proximoEstado.status ===
    'alerta'
  ) {
    throw new Error(
      proximoEstado.mensagem
    )
  }

  log(
    'Botão "Baixar boleto" disponível.'
  )
}

/* ============================================================================
 * BOLETO
 * ========================================================================== */

/**
 * Abre a aba do boleto e pega a URL.
 *
 * O evento popup do Puppeteer pode entregar Page | null na tipagem atual.
 * Por isso o handler aceita explicitamente null.
 */
async function abrirBoleto(
  page: Page
): Promise<string | null> {
  log(
    'Clicando em "Baixar boleto para pagamento à vista"...'
  )

  let timer:
    ReturnType<typeof setTimeout> |
    undefined

  const popupPromise =
    new Promise<Page>(
      (resolve, reject) => {
        const onPopup = (
          popup: Page | null
        ) => {
          if (timer) {
            clearTimeout(timer)
          }

          if (!popup) {
            reject(
              new Error(
                'O DETRAN abriu um popup inválido.'
              )
            )
            return
          }

          resolve(popup)
        }

        page.once(
          'popup',
          onPopup
        )

        timer =
          setTimeout(
            () => {
              page.off(
                'popup',
                onPopup
              )

              reject(
                new Error(
                  'Nenhuma nova aba foi criada pelo botão do boleto.'
                )
              )
            },
            CONFIG.timeouts.novaAba
          )
      }
    )

  let boletoPage:
    Page | null = null

  try {
    await page.click(
      CONFIG.seletores.btnBaixarBoleto
    )

    boletoPage =
      await popupPromise

    await boletoPage.waitForFunction(
      () => {
        const url =
          window.location.href

        return (
          url !==
            'about:blank' &&
          /^https?:\/\//i.test(
            url
          )
        )
      },
      {
        timeout:
          CONFIG.timeouts.novaAba
      }
    )

    const url =
      boletoPage.url()

    if (
      !url ||
      url ===
        'about:blank'
    ) {
      logErr(
        'URL do boleto inválida.'
      )

      return null
    }

    log(
      'URL do boleto:',
      url
    )

    return url
  } catch (error) {
    logErr(
      'Falha ao abrir/capturar boleto:',
      error instanceof Error
        ? error.message
        : String(error)
    )

    return null
  } finally {
    if (timer) {
      clearTimeout(timer)
    }

    await boletoPage
      ?.close()
      .catch(() => null)
  }
}

/* ============================================================================
 * DOWNLOAD PDF
 * ========================================================================== */

async function montarCookieHeader(
  context: BrowserContext
): Promise<string> {
  const cookies =
    await context.cookies()

  return cookies
    .map(
      cookie =>
        `${cookie.name}=${cookie.value}`
    )
    .join('; ')
}

interface SessaoDownloadDetran {
  userAgent: string
  cookieHeader: string
}

async function baixarPdfDeMulta(
  context: BrowserContext,
  page: Page,
  pdfUrl: string,
  placa: string,
  multa: MultaDetran,
  destinoDir: string,
  sessao: SessaoDownloadDetran
): Promise<string | undefined> {
  const nomeArquivo =
    gerarNomeArquivoBoleto(
      placa,
      multa
    )

  const pdfPath =
    path.join(
      destinoDir,
      nomeArquivo
    )

  log(
    'Baixando PDF como:',
    nomeArquivo
  )

  const fazerFetch = (
    cookieHeader: string
  ) =>
    fetch(
      pdfUrl,
      {
        method: 'GET',
        redirect: 'follow',
        headers: {
          Accept:
            'application/pdf,application/octet-stream;q=0.9,*/*;q=0.8',
          Cookie:
            cookieHeader,
          'User-Agent':
            sessao.userAgent,
          Referer:
            page.url(),
        },
      }
    )

  try {
    let response =
      await fazerFetch(
        sessao.cookieHeader
      )

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      sessao.cookieHeader =
        await montarCookieHeader(
          context
        )

      response =
        await fazerFetch(
          sessao.cookieHeader
        )
    }

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ao baixar PDF.`
      )
    }

    const buffer =
      Buffer.from(
        await response.arrayBuffer()
      )

    const assinatura =
      buffer
        .subarray(0, 5)
        .toString('utf8')

    if (
      assinatura !==
      '%PDF-'
    ) {
      const contentType =
        response.headers.get(
          'content-type'
        )

      throw new Error(
        `Resposta não parece PDF. Content-Type: ${
          contentType ||
          'desconhecido'
        }`
      )
    }

    await fs.promises.writeFile(
      pdfPath,
      buffer
    )

    log(
      'PDF salvo:',
      pdfPath
    )

    return pdfPath
  } catch (error: unknown) {
    logErr(
      'Falha ao baixar PDF:',
      error instanceof Error
        ? error.message
        : String(error)
    )

    return undefined
  }
}

/* ============================================================================
 * PREPARAR PRÓXIMA MULTA
 * ========================================================================== */

async function prepararProximaMulta(
  page: Page
): Promise<void> {
  let estado =
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

    estado =
      await obterEstadoModal(
        page
      )
  }

  log(
    `Estado antes do próximo AIT: checkbox=${estado.checkboxVisivel} verOpcoes=${estado.btnVerOpcoesVisivel} baixar=${estado.btnBaixarBoletoVisivel} voltar=${estado.btnVoltarVisivel} alerta=${estado.alertaVisivel}`
  )

  if (
    estado.btnVoltarVisivel &&
    !estado.btnVerOpcoesVisivel
  ) {
    await voltarParaSelecaoMultas(
      page,
      true
    )
  }

  await limparEstadoAnterior(
    page
  )

  log(
    'Tela de seleção limpa e pronta para o próximo AIT.'
  )
}

/* ============================================================================
 * PROCESSAR UMA MULTA
 * ========================================================================== */

async function processarMulta(
  context: BrowserContext,
  page: Page,
  placa: string,
  multa: MultaDetran,
  storageDir: string,
  sessaoDownload: SessaoDownloadDetran
): Promise<void> {
  await prepararProximaMulta(
    page
  )

  await marcarApenasUm(
    page,
    multa.ait
  )

  await prepararDownloadBoleto(
    page
  )

  const pdfUrl =
    await abrirBoleto(
      page
    )

  if (!pdfUrl) {
    throw new Error(
      'Não foi possível capturar a URL do PDF.'
    )
  }

  const caminho =
    await baixarPdfDeMulta(
      context,
      page,
      pdfUrl,
      placa,
      multa,
      storageDir,
      sessaoDownload
    )

  if (!caminho) {
    throw new Error(
      'Falha ao salvar o PDF no disco.'
    )
  }

  multa.caminhoPdf =
    caminho
}

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
