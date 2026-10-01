// src/renderer/components/ui/Badge.tsx

import { cn } from '../../lib/cn'
import type { HTMLAttributes } from 'react'

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'petrol'
  /** @deprecated use 'petrol' */
  | 'cyan'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

const VARIANTS: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
  danger:  'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
  info:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50',
  petrol:  'bg-petrol-50 text-petrol-700 border-petrol-600/20 dark:bg-petrol-900 dark:text-petrol-300 dark:border-petrol-500/30',
  cyan:    'bg-petrol-50 text-petrol-700 border-petrol-600/20 dark:bg-petrol-900 dark:text-petrol-300 dark:border-petrol-500/30',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-petrol-900 dark:text-petrol-300/70 dark:border-petrol-800',
}

const DOT_COLORS: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-rose-500',
  info:    'bg-blue-500',
  petrol:  'bg-petrol-600 dark:bg-petrol-400',
  cyan:    'bg-petrol-600 dark:bg-petrol-400',
  neutral: 'bg-slate-400 dark:bg-petrol-400/60',
}

export function Badge({ variant = 'neutral', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-colors',
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', DOT_COLORS[variant])} />}
      {children}
    </span>
  )
}