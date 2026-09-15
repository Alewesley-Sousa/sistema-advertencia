import puppeteer from 'puppeteer'
import path from 'node:path'
import fs from 'node:fs'
import { gerarHtmlOficio, OficioTemplateData } from '../templates/oficioTemplate'

export async function gerarPdfOficio(dados: OficioTemplateData): Promise<string> {
  const pdfDir = path.resolve(process.cwd(), 'storage', 'documentos', 'oficios')
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true })
  }

  const nomeArquivo = `oficio_${dados.placa.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`
  const pdfPath = path.join(pdfDir, nomeArquivo)

  const htmlContent = gerarHtmlOficio(dados)

  // Caminhos comuns onde o Google Chrome fica instalado no Windows
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ]

  let chromePath = undefined
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      chromePath = p
      break
    }
  }

  // Inicializa o Puppeteer usando o Chrome do Windows (se encontrado) ou o padrão
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath, // Usa o Chrome nativo do Windows se existir
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' })

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm',
      bottom: '10mm',
      left: '10mm',
      right: '10mm'
    }
  })

  await browser.close()
  return pdfPath
}