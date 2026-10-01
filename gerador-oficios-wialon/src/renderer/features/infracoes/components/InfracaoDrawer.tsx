// src/renderer/features/infracoes/components/InfracaoDrawer.tsx

import { FileText, MoreHorizontal, MapPin, X } from 'lucide-react'
import type { Infracao } from '../services/infracoes'
import { Button } from '../../../components/ui/Button'
import { InfracaoWorkflow } from './InfracaoWorkflow'
import { InfracaoTelemetria } from './InfracaoTelemetria'
import { formatarDataHora } from '../../../lib/format'
import { cn } from '../../../lib/cn'

interface InfracaoDrawerProps {
  item: Infracao
  onFechar: () => void
  onGerarPdf: (id: number) => void
  gerandoPdf: boolean
}

const STATUS_INFO: Record<string, { label: string; cor: string; dot: string }> = {
  PENDENTE: { label: 'PENDENTE', cor: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  REGISTRADO: { label: 'REGISTRADO', cor: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  PROCESSANDO: { label: 'PROCESSANDO', cor: 'text-petrol-700 dark:text-petrol-300', dot: 'bg-petrol-600 dark:bg-petrol-400' },
  GERADO: { label: 'GERADO', cor: 'text-slate-600 dark:text-petrol-200/80', dot: 'bg-slate-400 dark:bg-petrol-400/70' },
  ENVIADO: { label: 'ENVIADO', cor: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  ERRO: { label: 'ERRO', cor: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
}

export function InfracaoDrawer({
  item,
  onFechar,
  onGerarPdf,
  gerandoPdf,
}: InfracaoDrawerProps) {
  const cfg = STATUS_INFO[item.status] ?? STATUS_INFO.PENDENTE
  const podeGerarPdf = item.status === 'PENDENTE' || item.status === 'REGISTRADO' || item.status === 'ERRO'

  return (
    <aside className="
      slide-in w-[380px] flex-none flex flex-col transition-colors
      bg-white dark:bg-petrol-900
      border-l border-slate-200/80 dark:border-petrol-800
    ">
      {/* Header */}
      <div className="flex-none px-4 pt-4 pb-3.5 border-b border-slate-100 dark:border-petrol-800 transition-colors">
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
            <span className={cn('text-[10px] font-bold tracking-wider', cfg.cor)}>
              {cfg.label}
            </span>
            <span className="text-[10px] text-slate-300 dark:text-petrol-700 transition-colors">·</span>
            <span className="text-[10px] text-slate-500 dark:text-petrol-300/60 mono transition-colors">#{item.id}</span>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="
              w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer
              text-slate-400 dark:text-petrol-300/60
              hover:text-slate-700 dark:hover:text-white
              hover:bg-slate-100 dark:hover:bg-petrol-800
            "
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-baseline gap-2.5">
          <span className="mono text-[22px] font-bold text-slate-900 dark:text-white tracking-tight transition-colors">
            {item.placa}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-petrol-300/60 transition-colors">
            Veículo #{item.item_id}
          </span>
        </div>
        <div className="text-[10px] text-slate-500 dark:text-petrol-300/60 mt-1 flex items-center gap-1.5 transition-colors">
          <span>{item.condutor || 'Não informado'}</span>
          <span className="text-slate-300 dark:text-petrol-700">·</span>
          <span>Excesso de velocidade</span>
        </div>
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto scroll">
        <InfracaoWorkflow status={item.status} />
        <InfracaoTelemetria item={item} />

        {/* Veículo */}
        <div className="px-4 py-3.5 border-b border-slate-100 dark:border-petrol-800 transition-colors">
          <div className="section-label mb-3">Veículo</div>
          <div className="space-y-2">
            <Linha label="Placa" valor={item.placa} mono />
            <Linha label="ID Wialon" valor={String(item.item_id)} mono />
            <Linha label="Task" valor={item.task_id || '—'} mono />
            <Linha label="Condutor" valor={item.condutor || 'Não informado'} />
          </div>
        </div>

        {/* Localização */}
        <div className="px-4 py-3.5 border-b border-slate-100 dark:border-petrol-800 transition-colors">
          <div className="section-label mb-3">Localização</div>
          <div className="flex items-start gap-2.5">
            <div className="
              w-6 h-6 rounded flex items-center justify-center flex-none mt-0.5 transition-colors
              bg-rose-50 dark:bg-rose-950/40
              border border-rose-100 dark:border-rose-900/50
            ">
              <MapPin className="w-3 h-3 text-rose-600 dark:text-rose-400 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-slate-800 dark:text-petrol-100 leading-snug transition-colors">
                {item.endereco || 'Endereço não informado'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-petrol-300/60 mt-1 mono transition-colors">
                {formatarDataHora(item.data_hora || item.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Processamento */}
        <div className="px-4 py-3.5 border-b border-slate-100 dark:border-petrol-800 transition-colors">
          <div className="section-label mb-3">Processamento</div>
          <div className="space-y-2">
            <Linha label="Detectado em" valor={formatarDataHora(item.created_at)} mono />
            <Linha label="Registro" valor={formatarDataHora(item.created_at)} mono />
            <LinhaComDot label="Origem" dot="emerald" texto="Wialon" />
            <Linha
              label="Situação"
              valor={podeGerarPdf ? 'Aguardando ação' : 'Processado'}
              destaque={podeGerarPdf}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="
        flex-none px-4 py-3 border-t transition-colors
        border-slate-100 dark:border-petrol-800
        bg-slate-50/50 dark:bg-petrol-950/40
      ">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => onGerarPdf(item.id)}
            loading={gerandoPdf}
            disabled={!podeGerarPdf}
            className="flex-1 h-9 text-[12px] gap-1.5 bg-petrol-600 hover:bg-petrol-700 dark:bg-petrol-500 dark:hover:bg-petrol-400"
          >
            {!gerandoPdf && <FileText className="w-3.5 h-3.5" />}
            {item.status === 'GERADO' || item.status === 'ENVIADO'
              ? 'Ofício gerado'
              : 'Gerar Ofício'}
          </Button>
          <button
            type="button"
            className="
              w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer
              bg-white dark:bg-petrol-800
              hover:bg-slate-100 dark:hover:bg-petrol-700
              border border-slate-200 dark:border-petrol-700
              text-slate-500 dark:text-petrol-300
              hover:text-slate-800 dark:hover:text-white
            "
            title="Mais ações"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

/* ---------- Sub-componentes ---------- */

function Linha({
  label,
  valor,
  mono,
  destaque,
}: {
  label: string
  valor: string
  mono?: boolean
  destaque?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-slate-500 dark:text-petrol-300/60 transition-colors">
        {label}
      </span>
      <span
        className={cn(
          'text-[11px] truncate transition-colors',
          mono && 'mono',
          destaque
            ? 'text-amber-700 dark:text-amber-400 font-semibold'
            : 'text-slate-800 dark:text-petrol-100 font-medium'
        )}
      >
        {valor}
      </span>
    </div>
  )
}

function LinhaComDot({
  label,
  dot,
  texto,
}: {
  label: string
  dot: 'emerald' | 'rose' | 'amber'
  texto: string
}) {
  const cores = { emerald: 'bg-emerald-500', rose: 'bg-rose-500', amber: 'bg-amber-500' }
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-slate-500 dark:text-petrol-300/60 transition-colors">
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-petrol-100 font-medium transition-colors">
        <span className={cn('w-1.5 h-1.5 rounded-full', cores[dot])} />
        {texto}
      </span>
    </div>
  )
}