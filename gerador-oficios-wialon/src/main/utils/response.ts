import { Response } from 'express'

export interface ApiErrorDetails {
  field?: string
  message: string
}

export interface ResponseMeta {
  page?: number
  limit?: number
  totalItems?: number
  totalPages?: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
  [key: string]: any
}

export const sendResponse = {
  success: <T>(res: Response, data: T, statusCode = 200, meta?: ResponseMeta) => {
    return res.status(statusCode).json({
      success: true,
      data,
      ...(meta && { meta })
    })
  },

  paginate: <T>(res: Response, data: T[], page: number, limit: number, totalItems: number) => {
    const totalPages = Math.ceil(totalItems / limit) || 1

    return res.status(200).json({
      success: true,
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })
  },

  error: (
    res: Response, 
    message: string, 
    statusCode = 500, 
    code = 'INTERNAL_ERROR',
    details?: ApiErrorDetails[] | Record<string, any>
  ) => {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details && { details })
      }
    })
  },

  // Helper conveniente para erros de validação
  validationError: (
    res: Response, 
    message = 'Erro de validação nos dados fornecidos', 
    details?: ApiErrorDetails[] | Record<string, any>
  ) => {
    return sendResponse.error(res, message, 400, 'VALIDATION_ERROR', details)
  }
}