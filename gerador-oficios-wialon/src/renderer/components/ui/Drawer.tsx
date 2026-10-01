// src/renderer/components/ui/Drawer.tsx

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Largura máxima do painel em telas grandes. Default: 480px. */
  maxWidth?: string
  /** Esconde o botão X padrão (caso o conteúdo já tenha o dele). */
  hideCloseButton?: boolean
}

const PANEL_MS = 420
const BACKDROP_MS = 300
const TIMEOUT_MS = 480

export function Drawer({
  open,
  onClose,
  children,
  maxWidth = '480px',
  hideCloseButton = true,
}: DrawerProps) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(open)
  const raf1Ref = useRef<number | null>(null)
  const raf2Ref = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (raf1Ref.current) cancelAnimationFrame(raf1Ref.current)
    if (raf2Ref.current) cancelAnimationFrame(raf2Ref.current)
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    raf1Ref.current = raf2Ref.current = timeoutRef.current = null

    if (open) {
      setMounted(true)
      raf1Ref.current = requestAnimationFrame(() => {
        raf2Ref.current = requestAnimationFrame(() => {
          setVisible(true)
        })
      })
      return () => {
        if (raf1Ref.current) cancelAnimationFrame(raf1Ref.current)
        if (raf2Ref.current) cancelAnimationFrame(raf2Ref.current)
      }
    }

    setVisible(false)
    timeoutRef.current = window.setTimeout(() => {
      setMounted(false)
    }, TIMEOUT_MS)

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Backdrop — fade lento. No dark, escurece mais para dar profundidade. */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/40 dark:bg-petrol-950/70 backdrop-blur-sm transition-opacity ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transitionDuration: `${BACKDROP_MS}ms`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        aria-hidden
      />

      {/* Painel — desliza suave da direita */}
      <aside
        className={`absolute top-0 right-0 bottom-0 w-full bg-white dark:bg-petrol-900 border-l border-slate-200 dark:border-petrol-800 shadow-2xl flex flex-col will-change-transform transition-transform ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          maxWidth,
          transitionDuration: `${PANEL_MS}ms`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 z-10 w-7 h-7 rounded-md flex items-center justify-center text-slate-400 dark:text-petrol-300/60 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-petrol-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {children}
      </aside>
    </div>,
    document.body
  )
}