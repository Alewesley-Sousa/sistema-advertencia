// src/renderer/lib/format.ts

export function formatarDataHora(iso?: string): string {
  if (!iso) return '-'

  // SQLite manda "YYYY-MM-DD HH:MM:SS" — troca pra ISO
  const normalizado = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z'
  const data = new Date(normalizado)
  if (isNaN(data.getTime())) return iso

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}



/**
 * Formata um valor monetário vindo do backend.
 * Aceita "293.47", "1255,76" ou 293.47.
 */
export function formatarValorMulta(valor: string | number): string {
  const numero =
    typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor

  if (isNaN(numero)) return 'R$ 0,00'

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}