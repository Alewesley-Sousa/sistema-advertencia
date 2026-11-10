import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import puppeteer from 'puppeteer'

import { getChromeExecutablePath } from './browser'
import { instalarHelpersDom } from './dom'

/**
 * Roda no Chrome de verdade: o helper é injetado como texto e precisa
 * sobreviver à serialização (sem __name) e a navegações.
 * Defina PUPPETEER_EXECUTABLE_PATH se o Chromium do Puppeteer não estiver baixado.
 */
const HTML = `
<button id="ok">ok</button>
<button id="display" style="display:none">x</button>
<button id="visibility" style="visibility:hidden">x</button>
<button id="opacity" style="opacity:0">x</button>
<div id="zero" style="width:0;height:0"></div>
<div style="display:none"><button id="filho">x</button></div>`

// Usa o Chrome instalado (mesma busca do scraper) ou o do Puppeteer. Se nenhum
// existir, os testes são pulados em vez de falhar.
const browser = await puppeteer
  .launch({
    headless: true,
    executablePath: getChromeExecutablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  .catch(() => null)

const page = browser ? await browser.newPage() : null

if (page) {
  await instalarHelpersDom(page)
  await page!.goto('data:text/html;charset=utf-8,' + encodeURIComponent(HTML))
}

describe(
  'window.__visivel',
  { skip: page ? false : 'Chrome não encontrado (instale o Chrome ou defina PUPPETEER_EXECUTABLE_PATH)' },
  () => {
    after(async () => {
      await browser?.close()
    })

  it('true para elemento visível', async () => {
    assert.equal(await page!.evaluate(() => window.__visivel(document.getElementById('ok'))), true)
  })

  it('false para display/visibility/opacity/tamanho zero/pai oculto', async () => {
    const r = await page!.evaluate(() => [
      window.__visivel(document.getElementById('display')),
      window.__visivel(document.getElementById('visibility')),
      window.__visivel(document.getElementById('opacity')),
      window.__visivel(document.getElementById('zero')),
      window.__visivel(document.getElementById('filho')),
    ])
    assert.deepEqual(r, [false, false, false, false, false])
  })

  it('false para elemento inexistente', async () => {
    assert.equal(await page!.evaluate(() => window.__visivel(null)), false)
  })

  it('funciona em waitForFunction', async () => {
    await page!.waitForFunction(() => window.__visivel(document.getElementById('ok')), { timeout: 2000 })
  })

  it('continua disponível depois de navegar', async () => {
    await page!.goto('data:text/html,<button id="ok">x</button>')
    assert.equal(await page!.evaluate(() => window.__visivel(document.getElementById('ok'))), true)
  })
  }
)
