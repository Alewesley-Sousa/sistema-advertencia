import type { Page } from 'puppeteer'

/* ============================================================================
 * HELPERS EXECUTADOS DENTRO DA PÁGINA
 *
 * As funções passadas para page.evaluate()/waitForFunction() são serializadas
 * e rodam no Chrome, sem acesso ao escopo do Node. Por isso o helper é
 * injetado como texto em cada documento (evaluateOnNewDocument) e fica em
 * `window.__visivel`.
 *
 * Regras para `elementoVisivel`:
 *   - NÃO declarar funções aninhadas aqui dentro. O bundler injeta chamadas
 *     a `__name(...)`, que não existe na página (ReferenceError).
 *   - Só usar APIs do navegador (window, getBoundingClientRect...).
 * ========================================================================== */

declare global {
  interface Window {
    __visivel(elemento: Element | null | undefined): boolean
  }
}

/** Roda NA PÁGINA: true se o elemento existe e está realmente visível. */
export function elementoVisivel(
  elemento: Element | null | undefined
): boolean {
  if (!elemento) {
    return false
  }

  const style = window.getComputedStyle(elemento)
  const rect = elemento.getBoundingClientRect()

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    rect.width > 0 &&
    rect.height > 0
  )
}

/** Instala `window.__visivel` em todo documento aberto pela página. */
export async function instalarHelpersDom(page: Page): Promise<void> {
  await page.evaluateOnNewDocument(
    `window.__visivel = ${elementoVisivel.toString()};`
  )
}
