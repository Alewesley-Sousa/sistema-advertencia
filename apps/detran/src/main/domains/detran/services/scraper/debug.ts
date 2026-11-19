import type { Page } from 'puppeteer'
import path from 'node:path'
import fs from 'node:fs'
import type { MultaDetran } from '../../types'
import { logErr } from './config'

/* ============================================================================
 * DEBUG
 * ========================================================================== */

export function sanitizarNomeArquivo(
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

export async function salvarDebug(
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
 * NOMES DE ARQUIVO
 * ========================================================================== */

export function formatarDataParaNome(
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

export function gerarNomeArquivoBoleto(
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
