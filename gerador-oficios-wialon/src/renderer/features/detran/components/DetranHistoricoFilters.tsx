// src/renderer/features/detran/components/DetranHistoricoFilters.tsx

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Check, ChevronDown, Filter } from 'lucide-react'
import { SearchInput } from '../../../components/ui/SearchInput'

export type FiltroStatusDetran =
  | 'TODOS'
  | 'COM_DEBITO'
  | 'QUITADO'
  | 'COM_DEBITOS'

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
  const [aberto, setAberto] = useState(false)
  const filtroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return

    const fecharAoClicarFora = (event: PointerEvent) => {
      if (!filtroRef.current?.contains(event.target as Node)) {
        setAberto(false)
      }
    }
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAberto(false)
    }

    document.addEventListener('pointerdown', fecharAoClicarFora)
    document.addEventListener('keydown', fecharComEscape)
    return () => {
      document.removeEventListener('pointerdown', fecharAoClicarFora)
      document.removeEventListener('keydown', fecharComEscape)
    }
  }, [aberto])

  const opcoes: Array<{ valor: FiltroStatusDetran; rotulo: string }> = [
    { valor: 'TODOS', rotulo: 'Todos os veículos' },
    { valor: 'COM_DEBITOS', rotulo: 'Veículos com débitos' },
    { valor: 'COM_DEBITO', rotulo: 'Com multas' },
    { valor: 'QUITADO', rotulo: 'Quitado / sem multas' },
  ]
  const filtroAtual = opcoes.find((opcao) => opcao.valor === filtroStatus)

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

      <div className="relative" ref={filtroRef}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={aberto}
          onClick={() => setAberto((valor) => !valor)}
          className="flex min-w-[210px] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-petrol-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petrol-500/40 dark:border-petrol-800 dark:bg-petrol-900 dark:text-petrol-100"
        >
          <Filter className="h-4 w-4 shrink-0 text-slate-400 dark:text-petrol-300/60" />
          <span className="flex-1">{filtroAtual?.rotulo ?? 'Filtrar veículos'}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
        </button>

        {aberto && (
          <div
            role="listbox"
            aria-label="Filtrar histórico de veículos"
            className="absolute right-0 z-30 mt-2 max-h-[min(22rem,70vh)] w-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-xl dark:border-petrol-700 dark:bg-petrol-900"
          >
            {opcoes.map((opcao) => {
              const selecionada = filtroStatus === opcao.valor
              return (
                <button
                  key={opcao.valor}
                  type="button"
                  role="option"
                  aria-selected={selecionada}
                  onClick={() => {
                    onFiltroStatusChange(opcao.valor)
                    setAberto(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-left text-xs transition-colors ${
                    selecionada
                      ? 'bg-petrol-50 font-semibold text-petrol-800 dark:bg-petrol-800 dark:text-white'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-petrol-100 dark:hover:bg-petrol-800/70'
                  }`}
                >
                  <span className="flex-1">{opcao.rotulo}</span>
                  {selecionada && <Check className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}