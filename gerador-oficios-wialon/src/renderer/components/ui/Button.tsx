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
  primary:   'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-sm active:scale-95',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200',
  ghost:     'bg-transparent hover:bg-slate-100 text-slate-600 font-medium',
  danger:    'bg-rose-500 hover:bg-rose-400 text-white font-bold shadow-sm active:scale-95',
  outline:   'bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 shadow-sm',
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