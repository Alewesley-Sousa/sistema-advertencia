// src/renderer/features/infracoes/components/InfracaoWorkflow.tsx

import { Check } from 'lucide-react'
import type { Infracao } from '../services/infracoes'
import { cn } from '../../../lib/cn'

interface InfracaoWorkflowProps {
  status: Infracao['status']
}

type Etapa = 'DETECTADO' | 'ANALISADO' | 'OFICIO' | 'ENVIADO'

function classificar(status: Infracao['status']) {
  const idx = (() => {
    switch (status) {
      case 'REGISTRADO':
      case 'PENDENTE':
        return 2
      case 'PROCESSANDO':
        return 2
      case 'GERADO':
        return 3
      case 'ENVIADO':
        return 4
      default:
        return 2
    }
  })()

  return idx
}

const ETAPAS: { id: Etapa; label: string }[] = [
  { id: 'DETECTADO', label: 'Detectado' },
  { id: 'ANALISADO', label: 'Analisado' },
  { id: 'OFICIO', label: 'Ofício' },
  { id: 'ENVIADO', label: 'Enviado' },
]

export function InfracaoWorkflow({ status }: InfracaoWorkflowProps) {
  if (status === 'ERRO') {
    return (
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-petrol-800 transition-colors">
        <div className="section-label mb-3">Fluxo</div>
        <div className="
          flex items-center gap-2 text-[11px] rounded px-3 py-2 transition-colors
          text-rose-700 dark:text-rose-400
          bg-rose-50 dark:bg-rose-950/40
          border border-rose-100 dark:border-rose-900/50
        ">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Falha na sincronização — fluxo interrompido
        </div>
      </div>
    )
  }

  const etapaAtual = classificar(status)

  return (
    <div className="px-4 py-3.5 border-b border-slate-100 dark:border-petrol-800 transition-colors">
      <div className="section-label mb-3">Fluxo</div>

      <div className="flex items-start">
        {ETAPAS.map((etapa, idx) => {
          const concluida = idx < etapaAtual
          const atual = idx === etapaAtual

          return (
            <div key={etapa.id} className="flex items-start flex-1">
              <div className="flex flex-col items-center flex-none" style={{ width: 46 }}>
                <div
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center transition-colors',
                    concluida && 'bg-petrol-600 dark:bg-petrol-500',
                    atual && 'bg-white dark:bg-petrol-900 border-2 border-amber-500 dark:border-amber-400',
                    !concluida && !atual && 'bg-white dark:bg-petrol-900 border-2 border-slate-200 dark:border-petrol-700'
                  )}
                >
                  {concluida ? (
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  ) : (
                    <span
                      className={cn(
                        'w-1 h-1 rounded-full',
                        atual
                          ? 'bg-amber-500 dark:bg-amber-400'
                          : 'bg-slate-300 dark:bg-petrol-600'
                      )}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[9px] mt-1.5 text-center leading-tight transition-colors',
                    concluida && 'text-slate-600 dark:text-petrol-200 font-semibold',
                    atual && 'text-amber-700 dark:text-amber-400 font-bold',
                    !concluida && !atual && 'text-slate-400 dark:text-petrol-400/60 font-semibold'
                  )}
                >
                  {etapa.label}
                </span>
              </div>

              {idx < ETAPAS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px mt-2.5 transition-colors',
                    concluida
                      ? 'bg-petrol-600 dark:bg-petrol-500'
                      : 'bg-slate-200 dark:bg-petrol-700'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}