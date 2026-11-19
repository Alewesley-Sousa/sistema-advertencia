import { Request, Response, NextFunction } from 'express'
import { AppError } from './AppError'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code ?? 'INTERNAL_ERROR',
        message: err.message
      }
    })
  }

  console.error('[ERROR]', err)

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor.'
    }
  })
}