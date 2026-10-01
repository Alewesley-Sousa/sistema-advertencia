// src/renderer/features/infracoes/components/InfracaoHistoricoFilters.tsx

import type { ChangeEvent } from 'react'
import { Calendar, Filter, X } from 'lucide-react'
import { SearchInput } from '../../../components/ui/SearchInput'
import { Button } from '../../../components/ui/Button'

interface InfracaoHistoricoFiltersProps {
  busca: string
  onBuscaChange: (e: ChangeEvent<HTMLInputElement>) => void
  loadingBusca?: boolean

  filtroStatus: string
  onFiltroStatusChange: (valor: string) => void

  dataInicio: string
  dataFim: string
  onDataInicioChange: (valor: string) => void
  onDataFimChange: (valor: string) => void
  onLimparDatas: () => void
}

export function InfracaoHistoricoFilters({
  busca,
  onBuscaChange,
  loadingBusca,
  filtroStatus,
  onFiltroStatusChange,
  dataInicio,
  dataFim,
  onDataInicioChange,
  onDataFimChange,
  onLimparDatas,
}: InfracaoHistoricoFiltersProps) {
  const temFiltroData = Boolean(dataInicio || dataFim)

  return (
    <div className="
      p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center transition-colors
      border-b border-slate-100 dark:border-petrol-800
      bg-slate-50/50 dark:bg-petrol-900/40
    ">
      <div className="flex-1">
        <SearchInput
          placeholder="Buscar no histórico por condutor, placa ou local..."
          value={busca}
          onChange={onBuscaChange}
          loading={loadingBusca}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-petrol-300/70 transition-colors">

        {/* Filtro de status */}
        <div className="
          flex items-center gap-2 px-3 py-2 rounded-xl shadow-sm transition-colors
          bg-white dark:bg-petrol-900
          border border-slate-200 dark:border-petrol-800
        ">
          <Filter className="w-4 h-4 text-slate-400 dark:text-petrol-300/60 shrink-0 transition-colors" />
          <select
            value={filtroStatus}
            onChange={(e) => onFiltroStatusChange(e.target.value)}
            className="
              bg-transparent outline-none cursor-pointer transition-colors
              text-slate-700 dark:text-petrol-100 font-semibold
            "
          >
            <option value="TODOS">Todos os Status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="REGISTRADO">Registrados</option>
            <option value="GERADO">Gerados</option>
            <option value="ENVIADO">Enviados</option>
            <option value="ERRO">Com erro</option>
            <option value="DESCARTADO">Descartados</option>
            <option value="IGNORADO_MENOR_GRAVIDADE">Ignorados</option>
          </select>
        </div>

        {/* Data inicial */}
        <div className="
          flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-sm transition-colors
          bg-white dark:bg-petrol-900
          border border-slate-200 dark:border-petrol-800
        ">
          <Calendar className="w-4 h-4 text-slate-400 dark:text-petrol-300/60 shrink-0 transition-colors" />
          <span className="font-medium text-slate-400 dark:text-petrol-300/60 transition-colors">
            De:
          </span>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => onDataInicioChange(e.target.value)}
            className="
              outline-none cursor-pointer bg-transparent transition-colors
              text-slate-700 dark:text-petrol-100 font-semibold
            "
          />
        </div>

        {/* Data final */}
        <div className="
          flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-sm transition-colors
          bg-white dark:bg-petrol-900
          border border-slate-200 dark:border-petrol-800
        ">
          <Calendar className="w-4 h-4 text-slate-400 dark:text-petrol-300/60 shrink-0 transition-colors" />
          <span className="font-medium text-slate-400 dark:text-petrol-300/60 transition-colors">
            Até:
          </span>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => onDataFimChange(e.target.value)}
            className="
              outline-none cursor-pointer bg-transparent transition-colors
              text-slate-700 dark:text-petrol-100 font-semibold
            "
          />
        </div>

        {/* Limpar */}
        {temFiltroData && (
          <Button
            variant="outline"
            size="icon"
            onClick={onLimparDatas}
            title="Limpar período de datas"
            className="text-slate-400 dark:text-petrol-300/60 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/50"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}