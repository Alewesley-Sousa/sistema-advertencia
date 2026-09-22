// src/renderer/features/detran/utils.ts

/**
 * Normaliza uma placa removendo tudo que não é letra ou número e
 * deixando em caixa alta.
 *
 *   "abc-1234"   → "ABC1234"
 *   "abc 1d23"   → "ABC1D23"
 *   "ABC.1234"   → "ABC1234"
 *   "abc1d23"    → "ABC1D23"
 *
 * O DETRAN não aceita hífen, espaço nem ponto — só 7 caracteres alfanuméricos.
 */
export function normalizarPlaca(valor: string): string {
  return (valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Normaliza um chassi (ou RENAVAM) removendo tudo que não é letra ou número.
 *
 *   "9535-V6TB-9PR0-48086" → "9535V6TB9PR048086"
 *   "9535 1234 5678 9012"  → "9535123456789012"
 */
export function normalizarChassi(valor: string): string {
  return (valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Retorna `true` se a string original tinha caracteres além de letras/números
 * (ou seja, se a normalização alterou algo). Útil pra avisar o usuário.
 */
export function precisouNormalizar(valorOriginal: string, valorNormalizado: string): boolean {
  return (valorOriginal || '').toUpperCase() !== valorNormalizado
}