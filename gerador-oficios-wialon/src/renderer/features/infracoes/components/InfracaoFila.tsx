// src/renderer/features/infracoes/components/InfracaoFila.tsx

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { Infracao } from '../services/infracoes'
import { InfracaoFilaItem } from './InfracaoFilaItem'
import { cn } from '../../../lib/cn'

interface InfracaoFilaProps {
  infracoes: Infracao[]
  carregando?: boolean
  selecionadaId: number | null
  onSelecionar: (infracao: Infracao) => void
  busca: string
  onBuscaChange: (valor: string) => void

  /** Paginação (opcional — se não vier, o controle some) */
  pagina?: number
  totalPages?: number
  total?: number
  onPageChange?: (page: number) => void
}

export function InfracaoFila({
  infracoes,
  carregando,
  selecionadaId,
  onSelecionar,
  busca,
  onBuscaChange,
  pagina = 1,
  totalPages = 1,
  total,
  onPageChange,
}: InfracaoFilaProps) {
  const temPaginacao = Boolean(onPageChange) && totalPages > 1
  const totalExibido = total ?? infracoes.length
  const podeVoltar = pagina > 1 && !carregando
  const podeAvancar = pagina < totalPages && !carregando

  return (
    <aside className="
      w-[400px] flex-none flex flex-col transition-colors
      bg-white dark:bg-petrol-900
      border-r border-slate-200/80 dark:border-petrol-800
    ">
      {/* ═══ Filtros compactos ═══ */}
      <div className="flex-none px-3 py-2.5 border-b border-slate-100 dark:border-petrol-800 transition-colors">
        <div className="relative mb-2">
          <svg
            className="
              w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors
              text-slate-400 dark:text-petrol-400/60
            "
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar placa, condutor, local…"
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            className="
              w-full h-8 pl-8 pr-3 rounded text-[12px] transition-colors
              bg-slate-50 dark:bg-petrol-950
              border border-slate-200 dark:border-petrol-800
              text-slate-700 dark:text-petrol-100
              placeholder:text-slate-400 dark:placeholder:text-petrol-300/40
              focus:outline-none focus:bg-white dark:focus:bg-petrol-900
              focus:border-petrol-500 dark:focus:border-petrol-400
              focus:ring-2 focus:ring-petrol-100 dark:focus:ring-petrol-800
            "
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button className="
            flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors
            bg-petrol-50 dark:bg-petrol-800
            border border-petrol-600/20 dark:border-petrol-700
            text-petrol-700 dark:text-petrol-300
          ">
            <span className="w-1 h-1 rounded-full bg-petrol-600 dark:bg-petrol-400" />
            Ativas
          </button>
          <button className="
            px-2 py-0.5 rounded text-[10px] font-semibold transition-colors
            bg-white dark:bg-petrol-900
            hover:bg-slate-50 dark:hover:bg-petrol-800
            border border-slate-200 dark:border-petrol-800
            text-slate-500 dark:text-petrol-300/70
          ">
            Todas
          </button>
          <button className="
            px-2 py-0.5 rounded text-[10px] font-semibold transition-colors
            bg-white dark:bg-petrol-900
            hover:bg-slate-50 dark:hover:bg-petrol-800
            border border-slate-200 dark:border-petrol-800
            text-slate-500 dark:text-petrol-300/70
          ">
            Hoje
          </button>
        </div>
      </div>

      {/* ═══ Lista ═══ */}
      <div className="flex-1 overflow-y-auto scroll">
        {carregando && infracoes.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-petrol-300/60 text-xs transition-colors">
            <Loader2 className="w-4 h-4 animate-spin text-petrol-600 dark:text-petrol-400 mx-auto mb-2" />
            Carregando ocorrências…
          </div>
        ) : infracoes.length === 0 ? (
          <div className="py-12 px-6 text-center text-slate-400 dark:text-petrol-300/60 text-xs transition-colors">
            Nenhuma ocorrência encontrada com os filtros atuais.
          </div>
        ) : (
          infracoes.map((item) => (
            <InfracaoFilaItem
              key={item.id}
              item={item}
              selecionado={item.id === selecionadaId}
              onClick={() => onSelecionar(item)}
            />
          ))
        )}
      </div>

      {/* ═══ Footer com paginação compacta ═══ */}
      <div className="
        flex-none px-3 py-2 border-t flex items-center justify-between gap-2 transition-colors
        border-slate-100 dark:border-petrol-800
        bg-slate-50/50 dark:bg-petrol-950/40
      ">
        {/* Contagem */}
        <span className="text-[10px] text-slate-500 dark:text-petrol-300/60 transition-colors truncate">
          <span className="font-semibold text-slate-700 dark:text-petrol-100 mono">
            {infracoes.length}
          </span>
          {total !== undefined && (
            <>
              {' de '}
              <span className="font-semibold text-slate-700 dark:text-petrol-100 mono">
                {totalExibido}
              </span>
            </>
          )}{' '}
          em exibição
        </span>

        {/* Controles — só aparecem se houver mais de 1 página */}
        {temPaginacao && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onPageChange?.(pagina - 1)}
              disabled={!podeVoltar}
              aria-label="Página anterior"
              className={cn(
                'w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer',
                'text-slate-400 dark:text-petrol-300/60',
                'hover:bg-slate-200 dark:hover:bg-petrol-800 hover:text-slate-700 dark:hover:text-white',
                'disabled:opacity-30 disabled:cursor-not-allowed',
                'disabled:hover:bg-transparent dark:disabled:hover:bg-transparent',
                'disabled:hover:text-slate-400 dark:disabled:hover:text-petrol-300/60'
              )}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="
              px-1.5 text-[10px] font-semibold mono leading-none transition-colors
              text-slate-700 dark:text-petrol-100
            ">
              {pagina}
              <span className="text-slate-400 dark:text-petrol-400/60 font-normal">
                {' / '}
                {totalPages}
              </span>
            </span>

            <button
              type="button"
              onClick={() => onPageChange?.(pagina + 1)}
              disabled={!podeAvancar}
              aria-label="Próxima página"
              className={cn(
                'w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer',
                'text-slate-400 dark:text-petrol-300/60',
                'hover:bg-slate-200 dark:hover:bg-petrol-800 hover:text-slate-700 dark:hover:text-white',
                'disabled:opacity-30 disabled:cursor-not-allowed',
                'disabled:hover:bg-transparent dark:disabled:hover:bg-transparent',
                'disabled:hover:text-slate-400 dark:disabled:hover:text-petrol-300/60'
              )}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}