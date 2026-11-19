import type { BrowserContext, Page } from 'puppeteer'
import path from 'node:path'
import fs from 'node:fs'
import type { MultaDetran } from '../../types'
import { CONFIG, log, logErr } from './config'
import { gerarNomeArquivoBoleto } from './debug'
import { abrirModalMultas, limparEstadoAnterior, obterEstadoModal, voltarParaSelecaoMultas } from './modal'
import { marcarApenasUm } from './tabelaMultas'

/* ============================================================================
 * PAGAMENTO
 * ========================================================================== */

export type EstadoPagamento =
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
export async function esperarEstadoPagamento(
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
          if (
            window.__visivel(btnBaixar)
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
          if (
            window.__visivel(btnVerOpcoes)
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
export async function esperarBoletoOuAlerta(
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
          if (
            window.__visivel(alerta)
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
          if (
            window.__visivel(btnBaixar)
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
export async function prepararDownloadBoleto(
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
export async function abrirBoleto(
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

export async function montarCookieHeader(
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

export interface SessaoDownloadDetran {
  userAgent: string
  cookieHeader: string
}

export async function baixarPdfDeMulta(
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

export async function prepararProximaMulta(
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

export async function processarMulta(
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
