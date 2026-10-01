/**
 * PAGINAÇÃO
 *
 * Responsabilidade:
 * Centralizar parsing e estrutura de paginação utilizada
 * por diferentes endpoints da aplicação.
 *
 * Deve evitar que cada controller implemente sua própria regra
 * de page, limit, offset e totalPages.
 */

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function parsePagination(
  page?: string,
  limit?: string
): PaginationParams {
  const parsedPage = Math.max(
    1,
    Number(page) || 1
  )

  const parsedLimit = Math.min(
    100,
    Math.max(
      1,
      Number(limit) || 20
    )
  )

  return {
    page: parsedPage,
    limit: parsedLimit,
    offset: (parsedPage - 1) * parsedLimit,
  }
}

export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}
