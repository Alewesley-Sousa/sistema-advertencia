// src/renderer/components/ui/Button.tsx

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: [
    'bg-petrol-600 hover:bg-petrol-700 text-white font-semibold shadow-sm active:scale-95',
    'dark:bg-petrol-500 dark:hover:bg-petrol-400 dark:text-white',
  ].join(' '),

  secondary: [
    'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
    'dark:bg-petrol-900 dark:hover:bg-petrol-800 dark:text-petrol-100 dark:border-petrol-800',
  ].join(' '),

  ghost: [
    'bg-transparent hover:bg-slate-100 text-slate-600 font-medium',
    'dark:hover:bg-petrol-900 dark:text-petrol-200',
  ].join(' '),

  danger: [
    'bg-rose-500 hover:bg-rose-400 text-white font-bold shadow-sm active:scale-95',
    'dark:bg-rose-600 dark:hover:bg-rose-500',
  ].join(' '),

  outline: [
    'bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 shadow-sm',
    'dark:bg-petrol-900 dark:hover:bg-petrol-800 dark:text-petrol-100 dark:border-petrol-800',
  ].join(' '),
}

const SIZES: Record<ButtonSize, string> = {
  sm:   'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md:   'h-10 px-4 text-sm gap-2 rounded-xl',
  lg:   'h-12 px-6 text-base gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center transition cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          VARIANTS[variant],
          SIZES[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'