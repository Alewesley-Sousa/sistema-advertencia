import { FileText, X } from 'lucide-react'

interface PdfModalProps {
  url: string | null
  title: string
  onClose: () => void
}

export function PdfModal({ url, title, onClose }: PdfModalProps) {
  if (!url) return null

  return (
    <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-blue-950 text-white flex justify-between items-center border-b border-cyan-500/30">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            {title}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-blue-900 rounded-lg text-slate-300 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 bg-slate-100 p-2">
          <iframe src={url} className="w-full h-full rounded-xl border border-slate-200" title="Visualizador de PDF" />
        </div>
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-cyan-500 hover:bg-cyan-400 text-blue-950 font-semibold text-xs px-4 py-2 rounded-lg transition shadow-sm"
          >
            Abrir em Nova Aba / Baixar
          </a>
        </div>
      </div>
    </div>
  )
}