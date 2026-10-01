export function chaveMulta(
  ait: string,
  dataInfracao: string
): string {
  return `${(ait || '').trim()}|${(dataInfracao || '').trim()}`
}