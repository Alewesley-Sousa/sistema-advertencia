// src/renderer/features/infracoes/components/InfracaoTelemetria.tsx

import type { Infracao } from '../services/infracoes'

interface InfracaoTelemetriaProps {
  item: Infracao
}

export function InfracaoTelemetria({ item }: InfracaoTelemetriaProps) {
  const excesso = Math.max(0, item.velocidade - 100)
  const percentualBarra = Math.min(100, (item.velocidade / Math.max(100 * 1.5, 1)) * 100)
  const percentualLimite = Math.min(100, (100 / Math.max(100 * 1.5, 1)) * 100)

  return (
    <div className="px-4 py-3.5 border-b border-slate-100 dark:border-petrol-800 transition-colors">
      <div className="section-label mb-3">Telemetria</div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <BlocoNumero
          valor={item.velocidade}
          unidade="km/h"
          label="Registrado"
          cor="rose"
        />
        <BlocoNumero
          valor={100}
          unidade="km/h"
          label="Limite"
          cor="slate"
        />
        <BlocoNumero
          valor={`+${excesso}`}
          unidade="km/h"
          label="Excesso"
          cor={excesso > 0 ? 'rose' : 'slate'}
        />
      </div>

      <div className="relative">
        {/* Barra de fundo */}
        <div className="h-1 rounded-full bg-slate-100 dark:bg-petrol-800 overflow-hidden transition-colors">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 dark:from-amber-500 dark:to-rose-500"
            style={{ width: `${percentualBarra}%` }}
          />
        </div>

        {/* Marcador do limite */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-px h-2.5 bg-slate-700 dark:bg-petrol-200 transition-colors"
          style={{ left: `${percentualLimite}%` }}
        />

        <div className="flex justify-between mt-1 text-[9px] mono text-slate-400 dark:text-petrol-400/60 transition-colors">
          <span>0</span>
          <span className="text-slate-600 dark:text-petrol-200 font-semibold">
            limite {100}
          </span>
          <span>{100 * 1.5}</span>
        </div>
      </div>
    </div>
  )
}

function BlocoNumero({
  valor,
  unidade,
  label,
  cor,
}: {
  valor: number | string
  unidade: string
  label: string
  cor: 'rose' | 'slate'
}) {
  return (
    <div>
      <div className="flex items-baseline gap-0.5">
        <span
          className={`mono text-[20px] font-bold leading-none transition-colors ${
            cor === 'rose'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-700 dark:text-petrol-100'
          }`}
        >
          {valor}
        </span>
        <span className="text-[9px] text-slate-400 dark:text-petrol-400/60 transition-colors">
          {unidade}
        </span>
      </div>
      <div className="text-[9px] text-slate-500 dark:text-petrol-300/60 mt-1 transition-colors">
        {label}
      </div>
    </div>
  )
}