export function chaveMulta(
  ait: string,
  dataInfracao: string
): string {
  return `${(ait || '').trim()}|${(dataInfracao || '').trim()}`
}

export function sanitizarNome(s: string): string {
  return String(s)
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .slice(0, 100)
}

/**
 * Normaliza placa/chassi para o formato usado no banco (A-Z e 0-9).
 */
export function normalizarIdentificador(v: unknown): string {
  return String(v ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim()
}

/* ==========================================================================
 * Valores e datas do DETRAN (usados pelos relatórios)
 * ========================================================================*/

export function valorDetranEmCentavos(valor: string | null | undefined): number {
  const limpo = String(valor ?? '').replace(/[^\d,.-]/g, '')
  if (!limpo) return 0

  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo
  const numero = Number(normalizado)

  return Number.isFinite(numero) ? Math.round(numero * 100) : 0
}

/** Extrai "AAAA-MM" de datas do Detran (dd/mm/aaaa [hh:mm]) ou ISO (aaaa-mm-dd). */
export function mesDaInfracao(data: string | null | undefined): string | null {
  const texto = String(data ?? '').trim()
  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  const ano = br ? br[3] : iso?.[1]
  const mes = Number(br ? br[2] : iso?.[2])

  if (!ano || !Number.isInteger(mes) || mes < 1 || mes > 12) return null
  return `${ano}-${String(mes).padStart(2, '0')}`
}

/** Lista todos os meses "AAAA-MM" entre início e fim, inclusive. */
export function mesesEntre(inicio: string, fim: string): string[] {
  const meses: string[] = []
  let [ano, mes] = inicio.split('-').map(Number)
  const [anoFim, mesFim] = fim.split('-').map(Number)

  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    meses.push(`${ano}-${String(mes).padStart(2, '0')}`)
    mes++
    if (mes > 12) {
      mes = 1
      ano++
    }
  }
  return meses
}
