/**
 * LOGGER
 *
 * Responsabilidade:
 * Centralizar logs da aplicação.
 *
 * Objetivos futuros:
 * - padronizar níveis de log;
 * - incluir timestamp;
 * - incluir contexto/domínio;
 * - facilitar investigação de erros;
 * - permitir trocar console por outro sistema de logs sem
 *   alterar todos os services.
 *
 * Evitar console.log espalhado pelo projeto conforme este
 * logger for sendo adotado.
 */

function formatMessage(
  message: string,
  context?: string
): string {
  const timestamp =
    new Date().toISOString()

  return context
    ? `[${timestamp}] [${context}] ${message}`
    : `[${timestamp}] ${message}`
}

export const logger = {
  info(
    message: string,
    context?: string
  ): void {
    console.log(
      formatMessage(message, context)
    )
  },

  warn(
    message: string,
    context?: string
  ): void {
    console.warn(
      formatMessage(message, context)
    )
  },

  error(
    message: string,
    context?: string
  ): void {
    console.error(
      formatMessage(message, context)
    )
  },

  debug(
    message: string,
    context?: string
  ): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        formatMessage(message, context)
      )
    }
  },
}
