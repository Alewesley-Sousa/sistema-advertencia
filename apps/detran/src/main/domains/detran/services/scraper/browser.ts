import puppeteer from 'puppeteer'
import type { Browser, Page } from 'puppeteer'
import path from 'node:path'
import fs from 'node:fs'
import { CONFIG, log, logErr } from './config'
import { instalarHelpersDom } from './dom'

/* ============================================================================
 * BROWSER COMPARTILHADO
 * ========================================================================== */

let browserDetran: Browser | null = null
let browserDetranPromise: Promise<Browser> | null = null


/* ============================================================================
 * CHROME
 * ========================================================================== */

export function getChromeExecutablePath():
  | string
  | undefined {
  const possiblePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH || '',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(
      process.env.LOCALAPPDATA || '',
      'Google',
      'Chrome',
      'Application',
      'chrome.exe'
    ),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ]

  for (const chromePath of possiblePaths) {
    if (chromePath && fs.existsSync(chromePath)) {
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

export async function obterBrowserDetran(): Promise<Browser> {
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
export async function configurarPagina(
  page: Page
): Promise<void> {
  // Precisa rodar ANTES da primeira navegação (page.goto).
  await instalarHelpersDom(page)

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
