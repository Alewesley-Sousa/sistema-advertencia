// src/renderer/features/detran/components/DetranForm.tsx

import type { FormEvent, ReactNode } from 'react'
import { Search } from 'lucide-react'
import { normalizarPlaca, normalizarChassi } from '../utils'

interface DetranFormProps {
  placa: string
  chassi: string
  onPlacaChange: (v: string) => void
  onChassiChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
  loading?: boolean
  disabled?: boolean
  children?: ReactNode
}

export function DetranForm({
  placa,
  chassi,
  onPlacaChange,
  onChassiChange,
  onSubmit,
  loading,
  disabled,
  children,
}: DetranFormProps) {
  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 transition-colors">
      {/* Indicador de seção */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-petrol-600 dark:bg-petrol-400 transition-colors" />
        <span className="text-[10px] font-bold text-petrol-600 dark:text-petrol-300 tracking-[0.16em] uppercase transition-colors">
          Consulta individual
        </span>
      </div>

      {/* Cabeçalho */}
      <div className="pb-5 mb-5 border-b border-petrol-600/12 dark:border-petrol-500/20 transition-colors">
        <h2 className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight transition-colors">
          Identificação do veículo
        </h2>
        <p className="text-[13px] text-slate-600 dark:text-petrol-200/70 mt-1.5 transition-colors">
          Informe placa e chassi para consultar débitos e multas deste veículo.
        </p>
      </div>

      <form id="form-individual" onSubmit={onSubmit} className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="sm:col-span-2">
            <label
              htmlFor="input-placa"
              className="block text-[10px] font-bold text-slate-600 dark:text-petrol-200/70 tracking-[0.14em] uppercase mb-2 transition-colors"
            >
              Placa
            </label>
            <input
              id="input-placa"
              type="text"
              maxLength={7}
              placeholder="ABC1D23"
              autoComplete="off"
              value={placa}
              onChange={(e) => onPlacaChange(normalizarPlaca(e.target.value))}
              disabled={disabled}
              required
              className="
                w-full h-12 px-3.5 rounded-md
                font-mono text-[16px] font-bold text-slate-900 dark:text-white
                uppercase tracking-[0.08em]
                bg-white dark:bg-petrol-900
                border border-slate-300 dark:border-petrol-700
                focus:outline-none focus:border-petrol-600 dark:focus:border-petrol-400
                focus:ring-2 focus:ring-petrol-600/20 dark:focus:ring-petrol-400/25
                transition placeholder:text-slate-400 dark:placeholder:text-petrol-300/40 placeholder:font-medium
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="input-chassi"
              className="block text-[10px] font-bold text-slate-600 dark:text-petrol-200/70 tracking-[0.14em] uppercase mb-2 transition-colors"
            >
              Chassi
            </label>
            <input
              id="input-chassi"
              type="text"
              maxLength={17}
              placeholder="9BWZZZ377VT004251"
              autoComplete="off"
              value={chassi}
              onChange={(e) => onChassiChange(normalizarChassi(e.target.value))}
              disabled={disabled}
              required
              className="
                w-full h-12 px-3.5 rounded-md
                font-mono text-[13px] font-semibold text-slate-800 dark:text-petrol-100
                uppercase tracking-wider
                bg-white dark:bg-petrol-900
                border border-slate-300 dark:border-petrol-700
                focus:outline-none focus:border-petrol-600 dark:focus:border-petrol-400
                focus:ring-2 focus:ring-petrol-600/20 dark:focus:ring-petrol-400/25
                transition placeholder:text-slate-400 dark:placeholder:text-petrol-300/40 placeholder:font-medium
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
          </div>
        </div>
      </form>

      {children && <div className="mb-6">{children}</div>}

      {/* Rodapé — mt-auto empurra pro fundo */}
      <div className="mt-auto flex items-center justify-between flex-wrap gap-3 pt-5 border-t border-petrol-600/12 dark:border-petrol-500/20 transition-colors">
        <p className="text-[11px] text-slate-600 dark:text-petrol-300/70 flex items-center gap-1.5 transition-colors">
          <svg
            className="w-3 h-3 text-petrol-600/70 dark:text-petrol-400/70 transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Consulta direta ao portal do DETRAN-CE
        </p>

        <button
          type="submit"
          form="form-individual"
          disabled={disabled || loading || !placa || !chassi}
          className="
            inline-flex items-center gap-2 h-11 px-6 rounded-md
            bg-petrol-600 hover:bg-petrol-700
            dark:bg-petrol-500 dark:hover:bg-petrol-400
            text-white text-[13px] font-semibold
            transition-colors active:scale-[.99]
            disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
          "
        >
          <Search className="w-4 h-4" />
          {loading ? 'Consultando…' : 'Consultar DETRAN'}
        </button>
      </div>
    </div>
  )
}