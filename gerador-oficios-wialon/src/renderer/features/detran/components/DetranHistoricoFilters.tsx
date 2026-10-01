// src/renderer/features/detran/components/DetranHistoricoFilters.tsx

import type { ChangeEvent } from 'react'
import { Filter } from 'lucide-react'
import { SearchInput } from '../../../components/ui/SearchInput'

export type FiltroStatusDetran =
  | 'TODOS'
  | 'COM_DEBITO'
  | 'QUITADO'
  | 'PROCESSANDO'
  | 'PENDENTE'
  | 'ERRO'

interface DetranHistoricoFiltersProps {
  busca: string
  onBuscaChange: (e: ChangeEvent<HTMLInputElement>) => void
  loadingBusca?: boolean
  filtroStatus: FiltroStatusDetran
  onFiltroStatusChange: (valor: FiltroStatusDetran) => void
}

export function DetranHistoricoFilters({
  busca,
  onBuscaChange,
  loadingBusca,
  filtroStatus,
  onFiltroStatusChange,
}: DetranHistoricoFiltersProps) {
  return (
    <div className="
      p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center
      border-b border-slate-100 dark:border-petrol-800
      bg-slate-50/50 dark:bg-petrol-900/40
      transition-colors
    ">
      <div className="flex-1">
        <SearchInput
          placeholder="Buscar por placa ou chassi..."
          value={busca}
          onChange={onBuscaChange}
          loading={loadingBusca}
        />
      </div>

      <div className="
        flex items-center gap-2 px-3 py-2 rounded-xl shadow-sm
        bg-white dark:bg-petrol-900
        border border-slate-200 dark:border-petrol-800
        transition-colors
      ">
        <Filter className="w-4 h-4 text-slate-400 dark:text-petrol-300/60 shrink-0 transition-colors" />
        <select
          value={filtroStatus}
          onChange={(e) =>
            onFiltroStatusChange(e.target.value as FiltroStatusDetran)
          }
          className="
            bg-transparent outline-none cursor-pointer
            text-slate-700 dark:text-petrol-100
            font-semibold text-xs
            transition-colors
          "
        >
          <option value="TODOS">Todos os Status</option>
          <option value="COM_DEBITO">Com Multas</option>
          <option value="QUITADO">Quitado</option>
          <option value="PROCESSANDO">Processando</option>
          <option value="PENDENTE">Pendente</option>
          <option value="ERRO">Erro</option>
        </select>
      </div>
    </div>
  )
}