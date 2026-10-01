// src/renderer/components/ui/Modal.tsx

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: ReactNode
  footer?: ReactNode
}

const SIZES = {
  sm:   'max-w-md',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[95vw] h-[90vh]',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-950/60 dark:bg-petrol-950/75 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Conteúdo */}
      <div
        className={cn(
          'relative z-10 w-full flex flex-col max-h-[90vh]',
          'bg-white dark:bg-petrol-900',
          'border border-transparent dark:border-petrol-800',
          'rounded-2xl shadow-2xl',
          'animate-modal-in',
          SIZES[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-petrol-800 transition-colors">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white transition-colors">
                {title}
              </h2>
              {description && (
                <p className="text-xs text-slate-500 dark:text-petrol-300/60 mt-1 transition-colors">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 dark:text-petrol-300/60 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-petrol-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-5 border-t border-slate-100 dark:border-petrol-800 flex justify-end gap-2 transition-colors">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}