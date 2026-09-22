import puppeteer, { Browser, Page } from 'puppeteer'
import path from 'node:path'
import fs from 'node:fs'

/* ============================================================================
 * TIPOS
 * ==========================================================================*/

export interface DadosConsultaDetran {
  placa: string
  chassi: string
  /**
   * Chaves "AIT|DATA_INFRACAO" que já foram baixadas com sucesso pra essa placa.
   * Multas que casarem com essas chaves são marcadas como `jaBaixada: true`
   * e NÃO são baixadas de novo.
   */
  aitJaBaixados?: Set<string>
}

export interface MultaDetran {
  ait: string
  motivo: string
  dataInfracao: string
  dataVencimento: string
  valor: string
  valorPagar: string
  /** Preenchido após baixar o boleto individual dessa multa */
  caminhoPdf?: string
  /** Preenchido quando o DETRAN recusa emitir o boleto (ex: vencimento em dia não útil) */
  erroEmissao?: string
  /** true = já tinha sido baixada antes, pulamos o download */
  jaBaixada?: boolean
}

export interface ResultadoConsultaDetran {
  sucesso: boolean
  placa: string
  chassi: string
  statusConsulta: 'QUITADO' | 'COM_DEBITO' | 'ERRO'
  tipoDebito?: string
  multas?: MultaDetran[]
  caminhoPdf?: string
  mensagemErro?: string
}

/**
 * Chave natural da multa: "AIT|DATA_INFRACAO".
 *
 * Usada em dois lugares:
 *   - No scraper: pra pular boletos já baixados
 *   - No repository: pra montar o Set de chaves já baixadas
 *
 * Fonte única da verdade — se um dia a regra mudar, muda aqui só.
 */
export function chaveMulta(ait: string, dataInfracao: string): string {
  return `${(ait || '').trim()}|${(dataInfracao || '').trim()}`
}

/* ============================================================================
 * CONFIGURAÇÃO
 * ==========================================================================*/

const TAG = '[DETRAN Scraper]'

const CONFIG = {
  urls: {
    central: 'https://sistemas.detran.ce.gov.br/central/',
  },
  seletores: {
    linkTaxasMultas: '#taxas_multas, a[data-title="Taxas / Multas"]',
    inputPlaca: '#veiculo_placa',
    inputChassi: '#veiculo_renavam_chassi',
    btnConfirmar: '#submit-veiculo',
    alertaMultas:
      '.alert.multas.links-veiculo-danger, .alert.multas.links-veiculo',
    modalMultas: '#outros-servicos-modal',
    tabelaMultas: '#emissao-multas',
    checkboxMulta: 'input.multas',
    btnVerOpcoes: '#btn-emitir-extrato',
    btnBaixarBoleto: '#btn-exibir-extrato',
    /** Alerta de erro do DETRAN dentro do modal (ex: "A data de validade deve ser um dia útil") */
    alertaErroDETRAN: '.multas-alert',
  },
  timeouts: {
    navegacao: 60_000,
    padrao: 30_000,
    seletor: 15_000,
    novaAba: 10_000,
  },
} as const

/* ============================================================================
 * LOG
 * ==========================================================================*/

function log(...args: any[]) {
  console.log(TAG, new Date().toISOString(), ...args)
}
function logErr(...args: any[]) {
  console.error(TAG, new Date().toISOString(), ...args)
}

/* ============================================================================
 * HELPERS DE INFRA
 * ==========================================================================*/

function getChromeExecutablePath(): string | undefined {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ]
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      log('Chrome encontrado em:', p)
      return p
    }
  }
  logErr('Chrome NÃO encontrado. Usando Chromium do Puppeteer.')
  return undefined
}

async function salvarDebug(page: Page, contexto: string) {
  try {
    const dir = path.resolve(process.cwd(), 'storage', 'debug', 'detran')
    fs.mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const base = `${stamp}_${contexto}`

    fs.writeFileSync(path.join(dir, `${base}.html`), await page.content().catch(() => ''))
    await page.screenshot({ path: path.join(dir, `${base}.png`), fullPage: true }).catch(() => {})

    logErr(`Debug salvo em storage/debug/detran/${base}.{html,png}`)
    logErr(`  URL: ${page.url()}`)
  } catch (e) {
    logErr('Falha ao salvar debug:', e)
  }
}

async function limparEDigitar(page: Page, seletor: string, valor: string) {
  await page.click(seletor).catch(() => null)
  await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLInputElement | null
    if (el) {
      el.value = ''
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }, seletor)
  await page.type(seletor, valor)
}

function esperarNovaAba(browser: Browser, timeoutMs: number): Promise<Page | null> {
  return new Promise((resolve) => {
    const handler = async (target: any) => {
      if (target.type() === 'page') {
        const p = await target.page()
        resolve(p)
      }
    }
    browser.once('targetcreated', handler)
    setTimeout(() => resolve(null), timeoutMs)
  })
}

function formatarDataParaNome(dataInfracao: string | undefined): string {
  const trimmed = (dataInfracao || '').trim()
  if (!trimmed) return 'sem-data'

  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`

  return trimmed.replace(/[^a-zA-Z0-9]/g, '-')
}

function gerarNomeArquivoBoleto(placa: string, multa: MultaDetran): string {
  const placaUpper = placa.toUpperCase().trim()
  const dataFormatada = formatarDataParaNome(multa.dataInfracao)
  return `MULTA-${placaUpper}-${dataFormatada}.pdf`
}

/* ============================================================================
 * HELPERS DE DOMÍNIO — PASSO INICIAL
 * ==========================================================================*/

async function abrirFormularioTaxasMultas(page: Page): Promise<void> {
  log('Abrindo Taxas / Multas...')
  await page.waitForSelector(CONFIG.seletores.linkTaxasMultas, {
    timeout: CONFIG.timeouts.seletor,
  })
  await page.click(CONFIG.seletores.linkTaxasMultas)

  await page.waitForSelector(CONFIG.seletores.inputPlaca, {
    timeout: CONFIG.timeouts.seletor,
    visible: true,
  })
  log('Formulário pronto.')
}

async function submeterConsulta(page: Page, placa: string, chassi: string): Promise<void> {
  log('Preenchendo placa e chassi...')
  await limparEDigitar(page, CONFIG.seletores.inputPlaca, placa)
  await limparEDigitar(page, CONFIG.seletores.inputChassi, chassi)

  log('Clicando em CONFIRMAR...')
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.timeouts.padrao }).catch(() => null),
    page.click(CONFIG.seletores.btnConfirmar).catch(() => null),
  ])
  log('Pós-clique. URL:', page.url())
}

async function detectarMultas(page: Page): Promise<{ qtd: number; texto: string } | null> {
  await page
    .waitForSelector(CONFIG.seletores.alertaMultas, { timeout: 5000, visible: true })
    .catch(() => null)

  const texto = await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    return el ? (el as HTMLElement).innerText.trim().replace(/\s+/g, ' ') : null
  }, CONFIG.seletores.alertaMultas)

  if (!texto) return null

  const match = texto.match(/(\d+)\s+multa/i)
  const qtd = match ? Number(match[1]) : 0

  return { qtd, texto }
}

async function reabrirModalMultas(page: Page): Promise<void> {
  log('Reabrindo modal de multas (estado limpo)...')

  const modalAberto = await page.evaluate((sel) => {
    const modal = document.querySelector(sel) as HTMLElement | null
    if (!modal) return false
    return window.getComputedStyle(modal).display !== 'none'
  }, CONFIG.seletores.modalMultas)

  if (modalAberto) {
    await page.evaluate((sel) => {
      const w = window as any
      if (w.$ && typeof w.$(sel).modal === 'function') {
        try {
          w.$(sel).modal('hide')
        } catch {
          /* ignore */
        }
      }
      const modal = document.querySelector(sel) as HTMLElement | null
      if (modal) {
        modal.style.display = 'none'
        modal.classList.remove('in')
      }
      document.body.classList.remove('modal-open')
      document.querySelectorAll('.modal-backdrop').forEach((b) => b.remove())
    }, CONFIG.seletores.modalMultas)

    await new Promise((r) => setTimeout(r, 500))
  }

  await page.click(CONFIG.seletores.alertaMultas)

  await page.waitForFunction(
    (selModal: string, selTabela: string) => {
      const modal = document.querySelector(selModal) as HTMLElement | null
      if (!modal) return false
      const style = window.getComputedStyle(modal)
      return style.display !== 'none' && !!document.querySelector(`${selTabela} tbody tr`)
    },
    { timeout: CONFIG.timeouts.seletor },
    CONFIG.seletores.modalMultas,
    CONFIG.seletores.tabelaMultas
  )

  await new Promise((r) => setTimeout(r, 400))
  log('Modal pronto.')
}

async function extrairMultas(page: Page): Promise<MultaDetran[]> {
  return page.evaluate((selTabela: string) => {
    const linhas = Array.from(document.querySelectorAll(`${selTabela} tbody tr`))

    const resultado: MultaDetran[] = []

    for (const tr of linhas) {
      const tds = Array.from(tr.querySelectorAll('td'))
      if (tds.length < 7) continue
      if (tr.querySelector('b')?.innerText?.toUpperCase().includes('TOTAL')) continue

      const ait = (tds[1]?.innerText || '').trim()
      if (!ait || ait === '--') continue

      resultado.push({
        ait,
        motivo: (tds[3]?.innerText || '').trim(),
        dataInfracao: (tds[4]?.innerText || '').trim(),
        dataVencimento: (tds[5]?.innerText || '').trim(),
        valor: (tds[6]?.innerText || '').trim(),
        valorPagar: (tds[7]?.innerText || '').trim(),
      })
    }

    return resultado
  }, CONFIG.seletores.tabelaMultas)
}

/* ============================================================================
 * HELPERS DE DOMÍNIO — SELEÇÃO E DOWNLOAD POR MULTA
 * ==========================================================================*/

async function marcarApenasUm(page: Page, ait: string): Promise<void> {
  log(`Marcando checkbox do AIT ${ait}...`)

  const seletorAlvo = `#multas_${ait}`

  const existe = await page.$(seletorAlvo)
  if (!existe) {
    logErr(`Checkbox ${seletorAlvo} não encontrado no DOM.`)
    return
  }

  await page.evaluate((sel, aitAlvo: string) => {
    const boxes = Array.from(document.querySelectorAll<HTMLInputElement>(sel))
    for (const cb of boxes) {
      cb.disabled = false

      if (cb.id !== `multas_${aitAlvo}` && cb.checked) {
        cb.checked = false
        cb.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }

    const alvo = document.querySelector<HTMLInputElement>(`#multas_${aitAlvo}`)
    if (alvo) {
      alvo.disabled = false
      alvo.checked = false
    }
  }, CONFIG.seletores.checkboxMulta, ait)

  await new Promise((r) => setTimeout(r, 200))

  try {
    await page.click(seletorAlvo, { delay: 30 })
  } catch (err: any) {
    logErr(`Clique real falhou no ${seletorAlvo}: ${err?.message}`)
  }

  const marcouAposClique = await page.evaluate((sel) => {
    const cb = document.querySelector(sel) as HTMLInputElement | null
    return !!cb && cb.checked
  }, seletorAlvo)

  if (marcouAposClique) return

  log('Clique real não marcou. Tentando via jQuery/prop...')

  await page.evaluate((sel) => {
    const cb = document.querySelector(sel) as HTMLInputElement | null
    if (!cb) return

    const w = window as any
    if (w.$) {
      try {
        w.$(cb).prop('checked', true).trigger('change')
        return
      } catch {
        /* segue pro fallback manual */
      }
    }

    cb.disabled = false
    cb.checked = true
    cb.dispatchEvent(new Event('change', { bubbles: true }))
    cb.dispatchEvent(new Event('input', { bubbles: true }))
  }, seletorAlvo)
}

async function confirmarMarcado(page: Page, ait: string): Promise<boolean> {
  return page.evaluate((aitAlvo: string) => {
    const cb = document.querySelector(`#multas_${aitAlvo}`) as HTMLInputElement | null
    return !!cb && cb.checked
  }, ait)
}

type ResultadoVerOpcoes = 'ok' | 'alerta'

async function clicarVerOpcoes(page: Page): Promise<ResultadoVerOpcoes> {
  log('Clicando em "Ver opções de pagamento"...')
  await page.click(CONFIG.seletores.btnVerOpcoes)

  const handle = await page
    .waitForFunction(
      (selBaixar: string, selAlerta: string) => {
        const alerta = document.querySelector(selAlerta) as HTMLElement | null
        if (alerta) {
          const sA = window.getComputedStyle(alerta)
          if (sA.display !== 'none' && sA.visibility !== 'hidden') {
            const texto = (alerta.innerText || '').trim()
            if (texto) return { status: 'alerta', mensagem: texto }
          }
        }

        const btn = document.querySelector(selBaixar) as HTMLElement | null
        if (btn) {
          const sB = window.getComputedStyle(btn)
          if (sB.display !== 'none' && sB.visibility !== 'hidden') {
            return { status: 'ok' }
          }
        }

        return false
      },
      { timeout: CONFIG.timeouts.seletor },
      CONFIG.seletores.btnBaixarBoleto,
      CONFIG.seletores.alertaErroDETRAN
    )
    .catch(() => null)

  if (!handle) {
    logErr('Timeout aguardando "Baixar boleto" ou alerta de erro do DETRAN.')
    return 'alerta'
  }

  const valor = (await handle.jsonValue()) as
    | { status: 'ok' }
    | { status: 'alerta'; mensagem?: string }

  if (valor.status === 'alerta') {
    logErr(`DETRAN retornou alerta: "${valor.mensagem || '(sem texto)'}"`)
    return 'alerta'
  }

  return 'ok'
}

async function abrirBoleto(browser: Browser, page: Page): Promise<string | null> {
  log('Clicando em "Baixar boleto para pagamento à vista"...')

  const novaAbaPromise = esperarNovaAba(browser, CONFIG.timeouts.novaAba)
  await page.click(CONFIG.seletores.btnBaixarBoleto).catch(() => null)

  const pdfPage = await novaAbaPromise
  if (!pdfPage) {
    logErr('Nenhuma nova aba abriu após clicar em baixar boleto.')
    return null
  }

  log('Nova aba aberta. URL:', pdfPage.url())

  await new Promise((r) => setTimeout(r, 2500))

  const url = pdfPage.url()
  log('URL do boleto:', url)

  await pdfPage.close().catch(() => null)
  return url
}

async function baixarPdfDeMulta(
  page: Page,
  pdfUrl: string,
  placa: string,
  multa: MultaDetran,
  destinoDir: string
): Promise<string | undefined> {
  const nomeArquivo = gerarNomeArquivoBoleto(placa, multa)
  const pdfPath = path.join(destinoDir, nomeArquivo)

  log('Baixando PDF como:', nomeArquivo)

  try {
    const pdfBase64 = await page.evaluate(async (url: string) => {
      const resp = await fetch(url, { credentials: 'include' })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const buf = await resp.arrayBuffer()
      const bytes = new Uint8Array(buf)

      let binary = ''
      const chunk = 0x8000
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(
          null,
          Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]
        )
      }
      return btoa(binary)
    }, pdfUrl)

    fs.writeFileSync(pdfPath, Buffer.from(pdfBase64, 'base64'))
    log('PDF salvo:', pdfPath)
    return pdfPath
  } catch (err: any) {
    logErr('Falha ao baixar PDF:', err?.message)
    return undefined
  }
}

/* ============================================================================
 * FLUXO PRINCIPAL
 * ==========================================================================*/

export async function consultarVeiculoDetran(
  dados: DadosConsultaDetran
): Promise<ResultadoConsultaDetran> {
  const { placa, chassi, aitJaBaixados } = dados

  log('======================================================')
  log(`Iniciando consulta: placa=${placa} chassi=${chassi}`)
  if (aitJaBaixados && aitJaBaixados.size > 0) {
    log(`Multas já baixadas em execuções anteriores: ${aitJaBaixados.size}`)
  }

  const storageDir = path.resolve(process.cwd(), 'storage', 'documentos', 'detran')
  fs.mkdirSync(storageDir, { recursive: true })

  let browser: Browser | null = null

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: getChromeExecutablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    log('Browser OK. Versão:', await browser.version())

    const page = await browser.newPage()

    page.on('requestfailed', (req) => {
      logErr(`Requisição falhou: ${req.method()} ${req.url()} — ${req.failure()?.errorText}`)
    })
    page.on('pageerror', (err: unknown) => {
      logErr('Erro de JS na página:', err instanceof Error ? err.message : String(err))
    })

    const client = await page.target().createCDPSession()
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: storageDir,
    })

    page.setDefaultNavigationTimeout(CONFIG.timeouts.navegacao)
    page.setDefaultTimeout(CONFIG.timeouts.padrao)

    // ---- 1. Central ----
    log('Navegando para a central...')
    await page.goto(CONFIG.urls.central, { waitUntil: 'networkidle2' })

    // ---- 2. Abrir Taxas/Multas ----
    await abrirFormularioTaxasMultas(page)

    // ---- 3. Preencher e confirmar ----
    await submeterConsulta(page, placa, chassi)

    // ---- 4. Verificar se tem multas ----
    const deteccao = await detectarMultas(page)
    log('Detecção:', deteccao ? `${deteccao.qtd} multa(s)` : 'sem multas')

    if (!deteccao || deteccao.qtd <= 0) {
      return {
        sucesso: true,
        placa,
        chassi,
        statusConsulta: 'QUITADO',
      }
    }

    // ---- 5. Abrir modal, extrair a lista ----
    await reabrirModalMultas(page)
    const multas = await extrairMultas(page)

    log('Multas extraídas:', JSON.stringify(multas, null, 2))

    if (multas.length === 0) {
      logErr('Alerta indicava multas, mas tabela veio vazia.')
      await salvarDebug(page, 'multas-vazias')
      return {
        sucesso: false,
        placa,
        chassi,
        statusConsulta: 'ERRO',
        mensagemErro: 'Alerta indicava multas, mas a lista do modal veio vazia.',
      }
    }

    const tipoDebito = `${multas.length} multa${multas.length > 1 ? 's' : ''} de trânsito`

    // ---- 6. Loop: reabre modal → marca 1 → baixa 1 (só as que ainda não baixamos) ----
    log('======================================================')
    log(`Iniciando processamento de ${multas.length} multa(s)...`)
    log('======================================================')

    let primeiroPdfOk: string | undefined

    for (let i = 0; i < multas.length; i++) {
      const multa = multas[i]
      log(`\n----- Boleto ${i + 1}/${multas.length}: AIT ${multa.ait} (${multa.dataInfracao}) -----`)

      // ---- Já foi baixada antes pra essa placa? ----
      const chave = chaveMulta(multa.ait, multa.dataInfracao)
      if (aitJaBaixados?.has(chave)) {
        log(`Multa já baixada anteriormente. Pulando download.`)
        multa.jaBaixada = true
        continue
      }

      try {
        await reabrirModalMultas(page)

        await marcarApenasUm(page, multa.ait)
        await new Promise((r) => setTimeout(r, 400))

        const marcado = await confirmarMarcado(page, multa.ait)
        if (!marcado) {
          logErr(`Checkbox do AIT ${multa.ait} não marcou. Pulando.`)
          multa.erroEmissao = 'Não foi possível selecionar a multa no formulário.'
          continue
        }

        const resultadoVerOpcoes = await clicarVerOpcoes(page)
        if (resultadoVerOpcoes === 'alerta') {
          logErr(`DETRAN recusou emissão do boleto ${multa.ait}. Pulando.`)
          multa.erroEmissao =
            'DETRAN recusou a emissão do boleto (provavelmente vencimento em dia não útil).'
          continue
        }

        const pdfUrl = await abrirBoleto(browser, page)
        if (!pdfUrl) {
          logErr(`Boleto sem URL pro AIT ${multa.ait}. Pulando.`)
          multa.erroEmissao = 'Não foi possível capturar a URL do PDF.'
          continue
        }

        const caminho = await baixarPdfDeMulta(page, pdfUrl, placa, multa, storageDir)
        if (caminho) {
          multa.caminhoPdf = caminho
          if (!primeiroPdfOk) primeiroPdfOk = caminho
        } else {
          logErr(`Falha ao salvar PDF da multa ${multa.ait}.`)
          multa.erroEmissao = 'Falha ao salvar o PDF no disco.'
        }
      } catch (errMulta: any) {
        logErr(`Erro no boleto da multa ${multa.ait}:`, errMulta?.message)
        multa.erroEmissao = errMulta?.message || 'Erro inesperado na emissão.'
        await salvarDebug(page, `falha-boleto-${multa.ait}`)
      }
    }

    log('======================================================')
    const baixadas = multas.filter((m) => m.caminhoPdf).length
    const puladas = multas.filter((m) => m.jaBaixada).length
    const comErro = multas.filter((m) => m.erroEmissao)

    log(`Resumo: ${baixadas} nova(s), ${puladas} já baixada(s), ${comErro.length} com erro`)
    if (comErro.length) {
      comErro.forEach((m) => log(`  ⚠ ${m.ait}: ${m.erroEmissao}`))
    }
    log('======================================================')

    return {
      sucesso: true,
      placa,
      chassi,
      statusConsulta: 'COM_DEBITO',
      tipoDebito,
      multas,
      caminhoPdf: primeiroPdfOk,
    }
  } catch (error: any) {
    logErr('ERRO NÃO TRATADO:', error?.message)
    logErr('Stack:', error?.stack)
    return {
      sucesso: false,
      placa,
      chassi,
      statusConsulta: 'ERRO',
      mensagemErro: error?.message || 'Erro desconhecido durante a automação.',
    }
  } finally {
    if (browser) {
      log('Fechando browser.')
      await browser.close().catch(() => {})
    }
    log('Consulta finalizada.')
    log('======================================================')
  }
}