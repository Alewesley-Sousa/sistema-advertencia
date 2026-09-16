// components/Pagination.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-600">
      <span>
        Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({total} registros)
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}