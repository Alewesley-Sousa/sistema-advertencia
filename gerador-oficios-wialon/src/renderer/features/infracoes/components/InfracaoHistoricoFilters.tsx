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
    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
      <div className="flex-1">
        <SearchInput
          placeholder="Buscar no histórico por condutor, placa ou local..."
          value={busca}
          onChange={onBuscaChange}
          loading={loadingBusca}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filtroStatus}
            onChange={(e) => onFiltroStatusChange(e.target.value)}
            className="bg-transparent outline-none text-slate-700 font-semibold cursor-pointer"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="GERADO">Gerados</option>
            <option value="ENVIADO">Enviados</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-400">De:</span>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => onDataInicioChange(e.target.value)}
            className="outline-none text-slate-700 font-semibold bg-transparent cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-400">Até:</span>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => onDataFimChange(e.target.value)}
            className="outline-none text-slate-700 font-semibold bg-transparent cursor-pointer"
          />
        </div>

        {temFiltroData && (
          <Button
            variant="outline"
            size="icon"
            onClick={onLimparDatas}
            title="Limpar período de datas"
            className="text-slate-400 hover:text-rose-600 hover:border-rose-200"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}