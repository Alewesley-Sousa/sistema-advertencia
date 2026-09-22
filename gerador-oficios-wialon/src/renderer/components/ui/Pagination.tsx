import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

/** Gera os números a mostrar: 1 … 4 5 [6] 7 8 … 20 */
function gerarPaginas(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')
  pages.push(total)

  return pages
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const paginas = gerarPaginas(page, totalPages)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-100">
      <span className="text-xs text-slate-500">
        <strong className="text-slate-700">{total}</strong> registro{total !== 1 && 's'} • página{' '}
        <strong className="text-slate-700">{page}</strong> de{' '}
        <strong className="text-slate-700">{totalPages}</strong>
      </span>

      <nav className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={cn(
            'inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 transition',
            'hover:bg-slate-100 hover:text-slate-700',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          )}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {paginas.map((p, idx) =>
          p === '...' ? (
            <span key={`gap-${idx}`} className="px-1 text-xs text-slate-400 select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                'inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-lg text-xs font-semibold transition cursor-pointer',
                p === page
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={cn(
            'inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 transition',
            'hover:bg-slate-100 hover:text-slate-700',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          )}
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  )
}