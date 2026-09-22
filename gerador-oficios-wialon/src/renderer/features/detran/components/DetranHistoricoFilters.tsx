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
    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
      <div className="flex-1">
        <SearchInput
          placeholder="Buscar por placa ou chassi..."
          value={busca}
          onChange={onBuscaChange}
          loading={loadingBusca}
        />
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <select
          value={filtroStatus}
          onChange={(e) =>
            onFiltroStatusChange(e.target.value as FiltroStatusDetran)
          }
          className="bg-transparent outline-none text-slate-700 font-semibold text-xs cursor-pointer"
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