// apps/detran/src/main/domains/detran/relatorio/relatorioPdfService.ts
//
// Compila o template Handlebars (uma vez) e converte o HTML em PDF A4 usando o
// Chromium compartilhado do scraper (nova página, fechada ao final).

import fs from 'node:fs'
import path from 'node:path'
import Handlebars from 'handlebars'

import { obterBrowserDetran } from '../services/scraper/browser'
import type { RelatorioPdfConfig } from '../../../../shared/relatorioContrato'
import {
  detranRepository,
  type SelecaoRelatorioRepo,
} from '../repositories/detranRepository'
import { montarRelatorio, type RelatorioView } from './relatorioModelo'
import { TEMPLATE_RELATORIO } from './relatorioTemplate'

let templateCompilado: HandlebarsTemplateDelegate<RelatorioView> | null = null
let ativosEmbutidos: { logoDataUri: string; fontFaceCss: string } | null = null

function obterTemplate() {
  templateCompilado ??= Handlebars.compile<RelatorioView>(TEMPLATE_RELATORIO, { strict: false })
  return templateCompilado
}

/** Logo e fonte Inter embutidas em base64 — o PDF não depende de rede nem de CDN. */
function obterAtivos() {
  if (ativosEmbutidos) return ativosEmbutidos
  const publico = path.resolve(process.cwd(), 'public')
  let logoDataUri = ''
  let fontFaceCss = ''
  try {
    const logo = fs.readFileSync(path.join(publico, 'logo-force.png'))
    logoDataUri = `data:image/png;base64,${logo.toString('base64')}`
  } catch {
    /* sem logo: o cabeçalho segue só com os metadados */
  }
  try {
    const fonte = fs.readFileSync(path.join(publico, 'fonts', 'InterVariable.woff2'))
    fontFaceCss =
      `@font-face { font-family: 'Inter'; font-weight: 100 900; font-style: normal; ` +
      `src: url(data:font/woff2;base64,${fonte.toString('base64')}) format('woff2'); }`
  } catch {
    /* cai para Arial */
  }
  ativosEmbutidos = { logoDataUri, fontFaceCss }
  return ativosEmbutidos
}

export function renderizarHtml(view: RelatorioView): string {
  return obterTemplate()({ ...view, ...obterAtivos() })
}

function escapar(t: string): string {
  return t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}

export interface PdfGerado {
  buffer: Buffer
  nomeArquivo: string
  totalVeiculos: number
}

export async function gerarRelatorioPdf(config: RelatorioPdfConfig): Promise<PdfGerado> {
  const { veiculos, multas } = detranRepository.listarVeiculosParaRelatorio(
    config.selecao as SelecaoRelatorioRepo
  )
  const agora = new Date()
  const view = montarRelatorio(config, veiculos, multas, agora)
  const html = renderizarHtml(view)

  const browser = await obterBrowserDetran()
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts?.ready)
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        `<div style="width:100%;font-family:Arial,sans-serif;font-size:7px;color:#7a8896;padding:0 14mm;display:flex;justify-content:space-between;">` +
        `<span>FORCE · ${escapar(view.titulo)}</span>` +
        `<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
      margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '14mm' },
    })

    const pad = (n: number) => String(n).padStart(2, '0')
    const stamp = `${agora.getFullYear()}${pad(agora.getMonth() + 1)}${pad(agora.getDate())}_${pad(agora.getHours())}${pad(agora.getMinutes())}`
    return {
      buffer: Buffer.from(pdf),
      nomeArquivo: `relatorio_detran_${stamp}.pdf`,
      totalVeiculos: view.totalVeiculos,
    }
  } finally {
    await page.close().catch(() => undefined)
  }
}
