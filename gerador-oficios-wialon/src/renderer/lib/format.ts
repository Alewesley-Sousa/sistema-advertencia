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