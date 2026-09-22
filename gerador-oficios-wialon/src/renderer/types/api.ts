// src/renderer/types/api.ts

export interface Pagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: Pagination
}

export interface BaseFiltros {
  busca?: string
  dataInicio?: string
  dataFim?: string
  pagina?: number
  limite?: number
}

export interface MessageResponse {
  message: string
}