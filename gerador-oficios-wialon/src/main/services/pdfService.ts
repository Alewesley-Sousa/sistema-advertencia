// src/main/services/pdfService.ts

import puppeteer from 'puppeteer'
import path from 'node:path'
import fs from 'node:fs'
import {
  gerarHtmlOficio,
  type OficioTemplateData,
} from '../domains/infracoes/templates/oficioTemplate'

/* ═══════════════════════════════════════════════════════════════════
   Helper — encontra o Chrome no Windows
   ═══════════════════════════════════════════════════════════════════ */

function encontrarChrome(): string | undefined {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA
      ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
      : undefined,
  ].filter((p): p is string => Boolean(p))

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p
  }
  return undefined
}

/* ═══════════════════════════════════════════════════════════════════
   Helper — renderiza HTML em PDF (em memória)
   ═══════════════════════════════════════════════════════════════════ */

async function renderizarPdf(htmlContent: string): Promise<Uint8Array> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: encontrarChrome(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()

    // 'load' já é suficiente: o template é 100% inline (sem CDN)
    await page.setContent(htmlContent, { waitUntil: 'load' })

    // Garante que fontes locais terminaram de carregar antes do print
    await page.evaluate(() => document.fonts.ready)

    // Aplica as regras de @media print (o Chrome usa para PDF)
    await page.emulateMediaType('print')

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    })

    // Em Puppeteer moderno, `page.pdf()` sem `path` retorna Uint8Array
    return pdf
  } finally {
    await browser.close()
  }
}

/* ═══════════════════════════════════════════════════════════════════
   API 1 — Gera e SALVA em disco (fluxo normal)
   ═══════════════════════════════════════════════════════════════════ */

export async function gerarPdfOficio(
  dados: OficioTemplateData
): Promise<string> {
  const pdfDir = path.resolve(
    process.cwd(),
    'storage',
    'documentos',
    'oficios'
  )
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true })
  }

  const nomeArquivo = `oficio_${dados.placa.replace(
    /[^a-zA-Z0-9]/g,
    '_'
  )}_${Date.now()}.pdf`
  const pdfPath = path.join(pdfDir, nomeArquivo)

  const htmlContent = gerarHtmlOficio(dados)
  const buffer = await renderizarPdf(htmlContent)

  fs.writeFileSync(pdfPath, buffer)

  return pdfPath
}

/* ═══════════════════════════════════════════════════════════════════
   API 2 — Gera e retorna o buffer em memória (preview)
   ═══════════════════════════════════════════════════════════════════ */

export async function gerarPdfOficioBuffer(
  dados: OficioTemplateData
): Promise<Uint8Array> {
  const htmlContent = gerarHtmlOficio(dados)
  return renderizarPdf(htmlContent)
}