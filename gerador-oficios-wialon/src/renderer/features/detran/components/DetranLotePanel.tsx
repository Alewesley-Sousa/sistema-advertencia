// src/renderer/features/detran/components/DetranLotePanel.tsx

import { Upload, Download } from 'lucide-react'

interface DetranLotePanelProps {
  onImportar: () => void
  onBaixarModelo?: () => void
  disabled?: boolean
}

const EXEMPLO = [
  ['ABC1D23', '9BWZZZ377VT004251'],
  ['DEF4G56', '9BWYYY377VT004252'],
  ['GHI7J89', '9BWXXX377VT004253'],
]

export function DetranLotePanel({
  onImportar,
  onBaixarModelo,
  disabled,
}: DetranLotePanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-petrol-400/60 transition-colors" />
        <span className="text-[10px] font-bold text-slate-500 dark:text-petrol-300/70 tracking-[0.16em] uppercase transition-colors">
          Consulta em lote
        </span>
      </div>

      <h2 className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight transition-colors">
        Importação de frota
      </h2>
      <p className="text-[12.5px] text-slate-500 dark:text-petrol-300/60 mt-1 mb-6 leading-relaxed transition-colors">
        Prepare uma operação de consulta em massa a partir de planilha.
      </p>

      <div className="mb-5">
        <div className="text-[9.5px] font-bold text-slate-500 dark:text-petrol-300/70 tracking-[0.14em] uppercase mb-2 transition-colors">
          Estrutura do arquivo
        </div>
        <div className="border border-slate-200 dark:border-petrol-800 rounded-md overflow-hidden bg-white dark:bg-petrol-900 transition-colors">
          <div className="grid grid-cols-2 bg-slate-100 dark:bg-petrol-950 border-b border-slate-200 dark:border-petrol-800 transition-colors">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-700 dark:text-petrol-100 border-r border-slate-200 dark:border-petrol-800 tracking-wider transition-colors">
              <span className="text-slate-400 dark:text-petrol-300/50 font-mono">A ·</span> PLACA
            </div>
            <div className="px-3 py-2 text-[10px] font-bold text-slate-700 dark:text-petrol-100 tracking-wider transition-colors">
              <span className="text-slate-400 dark:text-petrol-300/50 font-mono">B ·</span> CHASSI
            </div>
          </div>
          <div className="grid grid-cols-2 text-[10.5px] font-mono">
            {EXEMPLO.map(([placa, chassi], i) => (
              <div key={placa} className="contents">
                <div
                  className={`
                    px-3 py-1.5 text-slate-600 dark:text-petrol-200/80
                    border-r border-slate-100 dark:border-petrol-800
                    transition-colors
                    ${i < EXEMPLO.length - 1 ? 'border-b' : ''}
                  `}
                >
                  {placa}
                </div>
                <div
                  className={`
                    px-3 py-1.5 text-slate-600 dark:text-petrol-200/80
                    transition-colors
                    ${i < EXEMPLO.length - 1 ? 'border-b border-slate-100 dark:border-petrol-800' : ''}
                  `}
                >
                  {chassi}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-petrol-300/60 leading-relaxed transition-colors">
        O sistema lê{' '}
        <b className="text-slate-700 dark:text-petrol-100">exclusivamente as duas primeiras colunas</b>.
        Colunas adicionais são ignoradas.
      </p>

      <div className="flex-1 min-h-[20px]" />

      <div className="space-y-2 mt-6 pt-6 border-t border-slate-200/80 dark:border-petrol-800 transition-colors">
        <button
          type="button"
          onClick={onImportar}
          disabled={disabled}
          className="
            w-full inline-flex items-center justify-center gap-2 h-11 rounded-md
            bg-slate-900 hover:bg-slate-800
            dark:bg-petrol-500 dark:hover:bg-petrol-400
            text-white text-[12.5px] font-semibold
            transition-colors cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <Upload className="w-4 h-4" />
          Importar veículos
        </button>
        {onBaixarModelo && (
          <button
            type="button"
            onClick={onBaixarModelo}
            className="
              w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-md
              text-slate-500 dark:text-petrol-300/70
              hover:text-petrol-700 dark:hover:text-petrol-200
              hover:bg-white dark:hover:bg-petrol-800
              text-[11px] font-semibold transition-colors cursor-pointer
            "
          >
            <Download className="w-3 h-3" />
            Baixar modelo XLSX
          </button>
        )}
      </div>
    </div>
  )
}