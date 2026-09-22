import toast, { Toaster as HotToaster } from 'react-hot-toast'
import { CheckCircle2, AlertCircle, Info, Loader2, X } from 'lucide-react'

// Exporta o Toaster configurado com estilo e posição padrão
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

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-xl pointer-events-auto flex items-center justify-between border border-emerald-100 p-4 gap-3`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-800 truncate">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      { duration: options?.duration || 4000 }
    )
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-xl pointer-events-auto flex items-center justify-between border border-rose-100 p-4 gap-3`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-800 truncate">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      { duration: options?.duration || 5000 }
    )
  },

  info: (message: string, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-xl pointer-events-auto flex items-center justify-between border border-cyan-100 p-4 gap-3`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-800 truncate">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      { duration: options?.duration || 4000 }
    )
  },

  loading: (message: string) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-xl pointer-events-auto flex items-center gap-3 border border-slate-200 p-4`}
        >
          <div className="p-2 bg-slate-50 text-cyan-600 rounded-lg shrink-0">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-800 truncate">
            {message}
          </p>
        </div>
      )
    )
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId)
  }
}