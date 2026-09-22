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
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
  }
  if (status === 'erro') {
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
  }
  return <Ban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
}

/* ---------- Sub-render: linha do item ---------- */

function LinhaItem({ item }: { item: ProgressoItem }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <IconeItem status={item.status} />
      <span className="font-mono font-semibold text-slate-700">{item.placa}</span>
      {item.mensagem && (
        <span className="text-slate-400 truncate">— {item.mensagem}</span>
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

  // Últimos 5 itens na ordem em que foram processados (mais recente primeiro)
  const ultimosItens = [...itens].slice(-5).reverse()

  return (
    <Card
      padding="md"
      className={cn(
        'space-y-4 transition-colors',
        concluido && 'border-emerald-200 bg-emerald-50/30',
        cancelado && 'border-slate-200 bg-slate-50/50',
        rodando && variante === 'simulacao' && 'border-amber-200',
        rodando && variante === 'real' && 'border-cyan-200'
      )}
    >
      {/* ================= Header ================= */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'p-2 rounded-xl border shrink-0',
              concluido && 'bg-emerald-50 text-emerald-600 border-emerald-200',
              cancelado && 'bg-slate-100 text-slate-500 border-slate-200',
              rodando && 'bg-cyan-50 text-cyan-600 border-cyan-200'
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
            <h3 className="text-sm font-bold text-slate-800 truncate">
              {concluido
                ? 'Lote concluído'
                : cancelado
                  ? 'Lote cancelado'
                  : 'Processando lote de veículos'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
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
                  <span className="font-mono font-semibold text-slate-700">
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
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
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
              className="text-slate-400 hover:text-slate-700"
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
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={cn(
              'h-2.5 rounded-full transition-all duration-500 ease-out relative',
              concluido && 'bg-emerald-500',
              cancelado && 'bg-slate-400',
              rodando && 'bg-cyan-500'
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
          <span className="text-slate-500">{percentual}% concluído</span>
          <span className="text-slate-400">
            {processados}/{total}
          </span>
        </div>
      </div>

      {/* ================= Últimos itens ================= */}
      {ultimosItens.length > 0 && (
        <div className="border-t border-slate-100 pt-3 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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