// src/renderer/components/ui/Card.tsx

import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const PADDINGS = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-white dark:bg-petrol-900 rounded-2xl border border-slate-200/80 dark:border-petrol-800 shadow-sm transition-colors',
        PADDINGS[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)

Card.displayName = 'Card'

// ── Subcomponentes para composição ─────────────────────────────────

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between pb-4 border-b border-slate-100 dark:border-petrol-800 mb-6 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-base font-bold text-slate-900 dark:text-white transition-colors', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-xs text-slate-500 dark:text-petrol-300/60 transition-colors', className)}
      {...props}
    >
      {children}
    </p>
  )
}