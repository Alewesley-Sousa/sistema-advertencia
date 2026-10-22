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