// src/renderer/components/ui/Table.tsx

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

/**
 * Cabeçalho — sobe um tom em relação ao Card no dark.
 *
 * Hierarquia de superfícies:
 *   Card     → petrol-900
 *   Header   → petrol-800   ← contraste real, não se funde com o card
 *   Hover    → petrol-800/60
 *   Divisores→ petrol-800
 *
 * No light, `slate-50/80` sobre `white` já funciona sem mudanças.
 */
export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      'text-[11px] font-bold uppercase tracking-wider select-none transition-colors',
      'text-slate-500 dark:text-petrol-200',
      'bg-slate-50/80 dark:bg-petrol-800',
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
  <tbody
    ref={ref}
    className={cn(
      'divide-y divide-slate-100 dark:divide-petrol-800 text-sm transition-colors',
      className
    )}
    {...props}
  >
    {apenasElementos(children)}
  </tbody>
))
TableBody.displayName = 'TableBody'

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, children, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-slate-200 dark:border-petrol-800 transition-colors',
        className
      )}
      {...props}
    >
      {apenasElementos(children)}
    </tr>
  )
)
TableRow.displayName = 'TableRow'

/* ---------- Head com ordenação opcional ---------- */

export type SortDirection = 'asc' | 'desc' | null

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean
  sortDirection?: SortDirection
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
          'py-3 px-5 text-left align-middle transition-colors',
          isInteractive &&
            'cursor-pointer hover:bg-slate-100/80 dark:hover:bg-petrol-700/60 transition group',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-1.5">
          {children}
          {isInteractive && (
            <>
              {sortDirection === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-petrol-600 dark:text-petrol-300 transition-colors" />
              ) : sortDirection === 'desc' ? (
                <ArrowDown className="w-3.5 h-3.5 text-petrol-600 dark:text-petrol-300 transition-colors" />
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 dark:text-petrol-300/40 group-hover:text-slate-500 dark:group-hover:text-petrol-200 transition-colors" />
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
    <td
      ref={ref}
      className={cn(
        'py-3 px-5 align-middle text-slate-700 dark:text-petrol-100 transition-colors',
        className
      )}
      {...props}
    />
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
      <td
        colSpan={colSpan}
        className="py-10 text-center text-slate-400 dark:text-petrol-300/60 text-xs transition-colors"
      >
        {children}
      </td>
    </tr>
  )
}