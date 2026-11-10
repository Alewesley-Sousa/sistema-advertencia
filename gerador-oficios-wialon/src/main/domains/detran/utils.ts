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
