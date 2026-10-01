// src/renderer/components/ui/Toast.tsx

import toast, { Toaster as HotToaster } from 'react-hot-toast'
import { CheckCircle2, AlertCircle, Info, Loader2, X } from 'lucide-react'

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
      }}
    />
  )
}

interface ToastOptions {
  duration?: number
}

/* ─── Base do card de toast ─────────────────────────────────────── */

function ToastShell({
  visible,
  children,
  border,
}: {
  visible: boolean
  children: React.ReactNode
  border: string
}) {
  return (
    <div
      className={[
        visible ? 'animate-enter' : 'animate-leave',
        'max-w-md w-full pointer-events-auto flex items-center justify-between p-4 gap-3',
        'bg-white dark:bg-petrol-900',
        'border rounded-xl shadow-lg transition-colors',
        border,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-slate-400 dark:text-petrol-300/60 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-petrol-800 transition-colors cursor-pointer"
    >
      <X className="w-4 h-4" />
    </button>
  )
}

/* ─── API ───────────────────────────────────────────────────────── */

export const showToast = {
  success: (message: string, options?: ToastOptions) =>
    toast.custom(
      (t) => (
        <ToastShell visible={t.visible} border="border-emerald-100 dark:border-emerald-900/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg shrink-0 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-petrol-100 truncate transition-colors">
              {message}
            </p>
          </div>
          <CloseButton onClick={() => toast.dismiss(t.id)} />
        </ToastShell>
      ),
      { duration: options?.duration || 4000 }
    ),

  error: (message: string, options?: ToastOptions) =>
    toast.custom(
      (t) => (
        <ToastShell visible={t.visible} border="border-rose-100 dark:border-rose-900/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg shrink-0 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-petrol-100 truncate transition-colors">
              {message}
            </p>
          </div>
          <CloseButton onClick={() => toast.dismiss(t.id)} />
        </ToastShell>
      ),
      { duration: options?.duration || 5000 }
    ),

  info: (message: string, options?: ToastOptions) =>
    toast.custom(
      (t) => (
        <ToastShell visible={t.visible} border="border-petrol-600/25 dark:border-petrol-500/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg shrink-0 bg-petrol-50 dark:bg-petrol-800/60 text-petrol-600 dark:text-petrol-300 transition-colors">
              <Info className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-petrol-100 truncate transition-colors">
              {message}
            </p>
          </div>
          <CloseButton onClick={() => toast.dismiss(t.id)} />
        </ToastShell>
      ),
      { duration: options?.duration || 4000 }
    ),

  loading: (message: string) =>
    toast.custom((t) => (
      <ToastShell visible={t.visible} border="border-slate-200 dark:border-petrol-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg shrink-0 bg-slate-50 dark:bg-petrol-800/60 text-petrol-600 dark:text-petrol-300 transition-colors">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-petrol-100 truncate transition-colors">
            {message}
          </p>
        </div>
      </ToastShell>
    )),

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId)
  },
}