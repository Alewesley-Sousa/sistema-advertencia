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
 * FECHAMENTO AUTOMÁTICO POR OCIOSIDADE
 *
 * O Chromium é o maior consumidor de RAM do app (várias centenas de MB).
 * Depois de usado, ele é fechado sozinho quando não há nenhuma aba/contexto
 * aberto por BROWSER_OCIOSO_MIN minutos (padrão 2; 0 desativa). A próxima
 * consulta ou PDF abre outro (~1-2 s a mais) — o app em repouso fica leve.
 * ========================================================================== */

const MIN_OCIOSO = Number(process.env.BROWSER_OCIOSO_MIN ?? 2)
const OCIOSO_MS = Number.isFinite(MIN_OCIOSO) ? Math.max(0, MIN_OCIOSO) * 60_000 : 120_000

let ultimoUso = Date.now()
let vigia: NodeJS.Timeout | null = null

function marcarUso(): void {
  ultimoUso = Date.now()
}

function iniciarVigia(): void {
  if (OCIOSO_MS <= 0 || vigia) return
  const intervalo = Math.min(30_000, Math.max(5_000, Math.floor(OCIOSO_MS / 4)))
  vigia = setInterval(() => {
    void verificarOciosidade()
  }, intervalo)
  vigia.unref() // o vigia sozinho nunca segura o processo vivo
}

function pararVigia(): void {
  if (vigia) clearInterval(vigia)
  vigia = null
}

async function verificarOciosidade(): Promise<void> {
  const browser = browserDetran
  if (!browser || browserDetranPromise) return
  try {
    // contexto padrão + aba inicial em branco = ocioso
    const emUso =
      browser.browserContexts().length > 1 || (await browser.pages()).length > 1
    if (emUso) {
      marcarUso()
      return
    }
    if (Date.now() - ultimoUso < OCIOSO_MS) return
    log(`Chromium ocioso há ${Math.round((Date.now() - ultimoUso) / 1000)}s; fechando para liberar RAM.`)
    await fecharBrowserDetran()
  } catch (error) {
    logErr('Falha ao verificar ociosidade do Chromium:', error instanceof Error ? error.message : String(error))
  }
}


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
  marcarUso()
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
            // economia de memória/CPU sem alterar o comportamento das páginas
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-component-update',
            '--mute-audio',
          ],
        })

      browserDetran = browser
      marcarUso()
      iniciarVigia()

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
  pararVigia()

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
