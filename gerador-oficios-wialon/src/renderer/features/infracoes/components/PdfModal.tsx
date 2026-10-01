// src/renderer/features/infracoes/components/PdfModal.tsx

import { FileText, X } from 'lucide-react'

interface PdfModalProps {
  url: string | null
  title: string
  onClose: () => void
}

export function PdfModal({ url, title, onClose }: PdfModalProps) {
  if (!url) return null

  return (
    <div className="
      fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors
      bg-petrol-950/60 dark:bg-petrol-950/80 backdrop-blur-sm
    ">
      <div className="
        w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-colors
        bg-white dark:bg-petrol-900
        border border-slate-200 dark:border-petrol-800
      ">
        {/* Header */}
        <div className="
          px-6 py-4 flex justify-between items-center transition-colors
          bg-petrol-950 dark:bg-petrol-950
          text-white
          border-b border-petrol-600/30 dark:border-petrol-800
        ">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-petrol-300" />
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="
              p-1 rounded-lg transition-colors cursor-pointer
              text-petrol-300
              hover:bg-petrol-800 hover:text-white
            "
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 bg-slate-100 dark:bg-petrol-950 p-2 transition-colors">
          <iframe
            src={url}
            className="
              w-full h-full rounded-xl transition-colors
              border border-slate-200 dark:border-petrol-800
            "
            title="Visualizador de PDF"
          />
        </div>

        {/* Footer */}
        <div className="
          px-6 py-3 flex justify-end transition-colors
          bg-slate-50 dark:bg-petrol-950/60
          border-t border-slate-200 dark:border-petrol-800
        ">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              font-semibold text-xs px-4 py-2 rounded-lg shadow-sm transition-colors
              bg-petrol-600 hover:bg-petrol-700
              dark:bg-petrol-500 dark:hover:bg-petrol-400
              text-white
            "
          >
            Abrir em Nova Aba / Baixar
          </a>
        </div>
      </div>
    </div>
  )
}