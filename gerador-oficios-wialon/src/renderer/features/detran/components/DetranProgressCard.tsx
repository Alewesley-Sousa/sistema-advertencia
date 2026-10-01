// src/renderer/features/detran/components/DetranProgressCard.tsx

import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  X,
  Sparkles,
  Ban,
} from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { DetranFleetAnimation } from './DetranFleetAnimation'
import type {
  DetranProgresso,
  ProgressoItem,
  ProgressoItemStatus,
} from '../types'

interface DetranProgressCardProps {
  progresso: DetranProgresso
  onCancelar?: () => void
  onFechar?: () => void
}

/* ---------- Sub-render: ícone do item já processado ---------- */

function IconeItem({ status }: { status: ProgressoItemStatus }) {
  if (status === 'ok') {
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 transition-colors" />
  }
  if (status === 'erro') {
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 transition-colors" />
  }
  return <Ban className="w-3.5 h-3.5 text-slate-400 dark:text-petrol-300/50 shrink-0 transition-colors" />
}

/* ---------- Sub-render: linha do item ---------- */

function LinhaItem({ item }: { item: ProgressoItem }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <IconeItem status={item.status} />
      <span className="font-mono font-semibold text-slate-700 dark:text-petrol-100 transition-colors">
        {item.placa}
      </span>
      {item.mensagem && (
        <span className="text-slate-400 dark:text-petrol-300/50 truncate transition-colors">
          — {item.mensagem}
        </span>
      )}
    </li>
  )
}

/* ---------- Componente ---------- */

export function DetranProgressCard({
  progresso,
  onCancelar,
  onFechar,
}: DetranProgressCardProps) {
  const {
    processados,
    total,
    percentual,
    itemAtual,
    status,
    itens = [],
    variante = 'real',
  } = progresso

  const concluido = status === 'CONCLUIDO'
  const cancelado = status === 'CANCELADO'
  const rodando = status === 'PROCESSANDO'

  const ultimosItens = [...itens].slice(-5).reverse()

  return (
    <Card
      padding="md"
      className={cn(
        'space-y-4 transition-colors',
        concluido && 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20',
        cancelado && 'border-slate-200 dark:border-petrol-800 bg-slate-50/50 dark:bg-petrol-900/40',
        rodando && variante === 'simulacao' && 'border-amber-200 dark:border-amber-900/50',
        rodando && variante === 'real' && 'border-petrol-600/30 dark:border-petrol-500/40'
      )}
    >
      {/* ================= Header ================= */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'p-2 rounded-xl border shrink-0 transition-colors',
              concluido && 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50',
              cancelado && 'bg-slate-100 dark:bg-petrol-900 text-slate-500 dark:text-petrol-300/60 border-slate-200 dark:border-petrol-800',
              rodando && 'bg-petrol-50 dark:bg-petrol-800/60 text-petrol-600 dark:text-petrol-300 border-petrol-600/20 dark:border-petrol-500/30'
            )}
          >
            {concluido ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : cancelado ? (
              <XCircle className="w-5 h-5" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate transition-colors">
              {concluido
                ? 'Lote concluído'
                : cancelado
                  ? 'Lote cancelado'
                  : 'Processando lote de veículos'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-petrol-300/60 mt-0.5 transition-colors">
              {concluido ? (
                <>
                  {processados} de {total} processado{total === 1 ? '' : 's'}
                </>
              ) : cancelado ? (
                <>
                  Parou em {processados} de {total}
                </>
              ) : (
                <>
                  Processando{' '}
                  <span className="font-mono font-semibold text-slate-700 dark:text-petrol-100">
                    {itemAtual || '...'}
                  </span>{' '}
                  — {processados} de {total}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {variante === 'simulacao' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded-full transition-colors">
              <Sparkles className="w-3 h-3" />
              Simulação
            </span>
          )}

          {concluido && onFechar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onFechar}
              title="Fechar"
              className="text-slate-400 dark:text-petrol-300/60 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ================= Animação de frota ================= */}
      <DetranFleetAnimation
        percentual={percentual}
        variante={variante}
        className="pt-1"
      />

      {/* ================= Barra ================= */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-100 dark:bg-petrol-800 rounded-full h-2.5 overflow-hidden transition-colors">
          <div
            className={cn(
              'h-2.5 rounded-full transition-all duration-500 ease-out relative',
              concluido && 'bg-emerald-500 dark:bg-emerald-400',
              cancelado && 'bg-slate-400 dark:bg-petrol-500',
              rodando && 'bg-petrol-500 dark:bg-petrol-400'
            )}
            style={{ width: `${percentual}%` }}
          >
            {rodando && (
              <span
                className="absolute inset-0 bg-white/20 animate-pulse rounded-full"
                aria-hidden
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 dark:text-petrol-300/60 transition-colors">
            {percentual}% concluído
          </span>
          <span className="text-slate-400 dark:text-petrol-300/50 transition-colors">
            {processados}/{total}
          </span>
        </div>
      </div>

      {/* ================= Últimos itens ================= */}
      {ultimosItens.length > 0 && (
        <div className="border-t border-slate-100 dark:border-petrol-800 pt-3 space-y-1.5 transition-colors">
          <span className="text-[10px] font-bold text-slate-400 dark:text-petrol-300/50 uppercase tracking-wider transition-colors">
            Últimos processados
          </span>
          <ul className="space-y-1">
            {ultimosItens.map((item, idx) => (
              <LinhaItem key={`${item.placa}-${idx}`} item={item} />
            ))}
          </ul>
        </div>
      )}

      {/* ================= Ação ================= */}
      {rodando && onCancelar && (
        <div className="pt-1 flex justify-end">
          <Button variant="outline" size="sm" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      )}
    </Card>
  )
}