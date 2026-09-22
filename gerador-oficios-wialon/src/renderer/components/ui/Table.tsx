import {
  forwardRef,
  Children,
  type HTMLAttributes,
  type ThHTMLAttributes,
  type TdHTMLAttributes,
  type ReactNode,
} from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '../../lib/cn'

/* ---------- Helper: remove whitespace text nodes ---------- */

/**
 * O React reclama quando `<tr>`, `<thead>` ou `<tbody>` recebem strings
 * de espaços (que aparecem naturalmente na indentação do JSX):
 *
 *   <tr>
 *     <th>A</th>
 *     <th>B</th>   ← quebra + indentação vira "   " no DOM
 *   </tr>
 *
 * `Children.toArray` já remove null/undefined/booleanos.
 * O filter extra remove só os strings que são puro whitespace.
 */
function apenasElementos(children: ReactNode): ReactNode {
  return Children.toArray(children).filter(
    (child) => !(typeof child === 'string' && child.trim() === '')
  )
}

/* ---------- Wrappers básicos ---------- */

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto">
      <table
        ref={ref}
        className={cn('w-full text-left border-collapse', className)}
        {...props}
      />
    </div>
  )
)
Table.displayName = 'Table'

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      'text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 select-none',
      className
    )}
    {...props}
  >
    {apenasElementos(children)}
  </thead>
))
TableHeader.displayName = 'TableHeader'

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => (
  <tbody ref={ref} className={cn('divide-y divide-slate-100 text-sm', className)} {...props}>
    {apenasElementos(children)}
  </tbody>
))
TableBody.displayName = 'TableBody'

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, children, ...props }, ref) => (
    <tr ref={ref} className={cn('border-b border-slate-200', className)} {...props}>
      {apenasElementos(children)}
    </tr>
  )
)
TableRow.displayName = 'TableRow'

/* ---------- Head com ordenação opcional ---------- */

export type SortDirection = 'asc' | 'desc' | null

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Quando passado, habilita clique para ordenar */
  sortable?: boolean
  /** Direção atual (só relevante quando sortable) */
  sortDirection?: SortDirection
  /** Callback de clique (só relevante quando sortable) */
  onSort?: () => void
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ sortable, sortDirection, onSort, className, children, ...props }, ref) => {
    const isInteractive = sortable && onSort

    return (
      <th
        ref={ref}
        onClick={isInteractive ? onSort : undefined}
        className={cn(
          'py-3 px-5 text-left align-middle',
          isInteractive && 'cursor-pointer hover:bg-slate-100/80 transition group',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-1.5">
          {children}
          {isInteractive && (
            <>
              {sortDirection === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-cyan-600" />
              ) : sortDirection === 'desc' ? (
                <ArrowDown className="w-3.5 h-3.5 text-cyan-600" />
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
              )}
            </>
          )}
        </div>
      </th>
    )
  }
)
TableHead.displayName = 'TableHead'

/* ---------- Célula ---------- */

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('py-3 px-5 align-middle text-slate-700', className)} {...props} />
  )
)
TableCell.displayName = 'TableCell'

/* ---------- Empty state ---------- */

export interface TableEmptyProps {
  colSpan: number
  children?: ReactNode
}

export function TableEmpty({ colSpan, children = 'Nenhum registro encontrado.' }: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-slate-400 text-xs">
        {children}
      </td>
    </tr>
  )
}