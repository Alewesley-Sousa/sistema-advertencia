// utils/requestHelpers.ts
import { Request, Response } from 'express'
import { sendResponse } from './response'

export function parseParamId(req: Request, res: Response, paramName = 'id'): number | null {
  const rawId = req.params[paramName]
  const parsedId = Number(rawId)

  if (!rawId || isNaN(parsedId) || parsedId <= 0) {
    sendResponse.validationError(res, 'ID inválido', [
      { field: paramName, message: 'O identificador deve ser um número válido.' }
    ])
    return null
  }

  return parsedId
}

export function parseStringParam(req: Request, res: Response, paramName: string): string | null {
  const paramValue = req.params[paramName]

  if (!paramValue || typeof paramValue !== 'string' || paramValue.trim() === '') {
    sendResponse.validationError(res, `Parâmetro "${paramName}" inválido`, [
      { field: paramName, message: `O campo "${paramName}" é obrigatório e deve ser um texto válido.` }
    ])
    return null
  }

  return paramValue.trim()
}

/**
 * Auxiliar reutilizável para extrair paginação segura das query params.
 */
export function parsePaginationParams(req: Request) {
  const { page = '1', limit = '10' } = req.query

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
  const limitNum = Math.max(1, parseInt(limit as string, 10) || 10)
  const offset = (pageNum - 1) * limitNum

  return { page: pageNum, limit: limitNum, offset }
}