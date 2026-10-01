/**
 * ASYNC HANDLER
 *
 * Responsabilidade:
 * Encapsular controllers async para encaminhar erros ao middleware
 * global de tratamento de erros.
 *
 * Objetivo:
 * Evitar try/catch repetitivo em todos os controllers.
 *
 * Exemplo futuro:
 * router.get("/", asyncHandler(controller.listar))
 */

import { Request, Response, NextFunction, RequestHandler } from 'express'

export function asyncHandler(
  handler: RequestHandler
): RequestHandler {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    Promise
      .resolve(handler(req, res, next))
      .catch(next)
  }
}
