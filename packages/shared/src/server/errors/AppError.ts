/**
 * ERRO DE APLICAÇÃO
 *
 * Representa erros conhecidos da aplicação.
 *
 * Exemplo:
 *
 * throw new AppError(
 *   'Veículo não encontrado.',
 *   404,
 *   'VEHICLE_NOT_FOUND'
 * )
 *
 * Não colocar regras específicas de DETRAN, Wialon ou Infrações aqui.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}