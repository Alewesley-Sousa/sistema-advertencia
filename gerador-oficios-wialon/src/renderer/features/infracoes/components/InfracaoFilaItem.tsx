// src/renderer/features/infracoes/components/InfracaoFilaItem.tsx

import { MapPin } from 'lucide-react'
import type { Infracao } from '../services/infracoes'
import { cn } from '../../../lib/cn'

interface InfracaoFilaItemProps {
  item: Infracao
  selecionado: boolean
  onClick: () => void
}

const STATUS_CONFIG: Record<
  string,
  { dot: string; badge: string; label: string }
> = {
  PENDENTE: {
    dot: 'bg-amber-500',
    badge: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/50',
    label: 'PENDENTE',
  },
  REGISTRADO: {
    dot: 'bg-amber-500',
    badge: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/50',
    label: 'REGISTRADO',
  },
  PROCESSANDO: {
    dot: 'bg-petrol-600 dark:bg-petrol-400',
    badge: 'text-petrol-700 dark:text-petrol-300 bg-petrol-50 dark:bg-petrol-900 border-petrol-600/20 dark:border-petrol-500/30',
    label: 'PROCESSANDO',
  },
  GERADO: {
    dot: 'bg-slate-400 dark:bg-petrol-400/70',
    badge: 'text-slate-600 dark:text-petrol-200/80 bg-slate-100 dark:bg-petrol-800/60 border-slate-200 dark:border-petrol-700',
    label: 'GERADO',
  },
  ENVIADO: {
    dot: 'bg-emerald-500',
    badge: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50',
    label: 'ENVIADO',
  },
  ERRO: {
    dot: 'bg-rose-500',
    badge: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/50',
    label: 'ERRO',
  },
}

function tempoRelativo(iso?: string): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (isNaN(t)) return '—'

  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min} min`

  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h${min % 60 ? ` ${min % 60}` : ''}`

  const d = Math.floor(h / 24)
  return `${d}d`
}

export function InfracaoFilaItem({ item, selecionado, onClick }: InfracaoFilaItemProps) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDENTE

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 transition-colors cursor-pointer',
        'border-b border-slate-100 dark:border-petrol-800',
        selecionado
          ? 'row-selected'
          : 'hover:bg-slate-50/70 dark:hover:bg-petrol-800/50'
      )}
    >
      {/* Linha 1: dot + placa + badge + tempo */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-1.5 h-1.5 rounded-full flex-none', cfg.dot)} />
          <span className="mono text-[13px] font-bold text-slate-900 dark:text-white truncate transition-colors">
            {item.placa}
          </span>
          <span
            className={cn(
              'text-[9px] font-bold border px-1.5 py-0.5 rounded tracking-wider flex-none transition-colors',
              cfg.badge
            )}
          >
            {cfg.label}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-petrol-400/60 mono flex-none transition-colors">
          {tempoRelativo(item.data_hora || item.created_at)}
        </span>
      </div>

      {/* Linha 2: tipo + velocidade */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-slate-600 dark:text-petrol-200/80 truncate pr-2 transition-colors">
          Excesso de velocidade
        </span>
        <span className="flex items-baseline gap-1 flex-none">
          <span className="text-[13px] font-bold text-rose-600 dark:text-rose-400 mono transition-colors">
            {item.velocidade}
          </span>
          <span className="text-[9px] text-slate-400 dark:text-petrol-400/60 mono transition-colors">
            / 100
          </span>
        </span>
      </div>

      {/* Linha 3: local */}
      <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-petrol-400/60 transition-colors">
        <MapPin className="w-2.5 h-2.5 flex-none" />
        <span className="truncate">{item.endereco || '—'}</span>
      </div>
    </button>
  )
}