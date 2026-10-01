// src/renderer/features/detran/components/DetranProgressModal.tsx

import { Modal } from '../../../components/ui/Modal'
import { Loader2, ChevronUp, X, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { DetranProgresso } from '../types'

interface DetranProgressModalProps {
  open: boolean
  progresso: DetranProgresso | null
  onCancelar?: () => void
  onFechar: () => void
}

export function DetranProgressModal({
  open,
  progresso,
  onFechar,
}: DetranProgressModalProps) {
  const [minimizado, setMinimizado] = useState(false)

  useEffect(() => {
    if (!open) setMinimizado(false)
  }, [open])

  if (!progresso) return null

  const terminou =
    progresso.status === 'CONCLUIDO' || progresso.status === 'CANCELADO'

  const itens = progresso.itens ?? []
  const sucesso = itens.filter((i) => i.status === 'ok').length
  const erros = itens.filter((i) => i.status === 'erro').length
  const pendentes = Math.max(0, progresso.total - progresso.processados)

  const ultimos = [...itens].slice(-5).reverse()

  const modalAberto = open && !minimizado
  const miniVisivel = open && minimizado

  const handleClose = () => {
    if (!terminou) return
    onFechar()
  }

  return (
    <>
      <Modal open={modalAberto} onClose={handleClose} size="lg">
        {/* Header */}
        <div className="pb-5 mb-6 border-b border-slate-100 dark:border-petrol-800 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-petrol-500 opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-petrol-600 dark:bg-petrol-400" />
            </span>
            <span className="text-[10px] font-bold text-petrol-700 dark:text-petrol-300 tracking-[0.16em] uppercase transition-colors">
              Operação em andamento
            </span>
          </div>
          <h3 className="text-[16px] font-bold text-slate-900 dark:text-white transition-colors">
            {terminou ? 'Consulta concluída' : 'Processando consultas DETRAN'}
          </h3>
          <p className="text-[12.5px] text-slate-500 dark:text-petrol-300/60 mt-1 transition-colors">
            {terminou
              ? `${progresso.total} veículos processados`
              : 'Aguarde enquanto consultamos os veículos no portal do DETRAN-CE.'}
          </p>
        </div>

        {/* Progresso */}
        <div className="flex items-baseline justify-between mb-3">
          <span className="font-mono text-[11.5px] text-slate-500 dark:text-petrol-300/60 truncate transition-colors">
            {progresso.itemAtual || 'Iniciando…'}
          </span>
          <span className="font-mono text-[18px] font-bold text-slate-900 dark:text-white leading-none transition-colors">
            {progresso.percentual}%
          </span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-petrol-800 overflow-hidden mb-2 transition-colors">
          <div
            className="h-full rounded-full bg-petrol-500 dark:bg-petrol-400 transition-all duration-300"
            style={{ width: `${progresso.percentual}%` }}
          />
        </div>
        <div className="flex justify-between font-mono text-[10.5px] text-slate-400 dark:text-petrol-300/50 mb-6 transition-colors">
          <span>
            {progresso.processados} de {progresso.total}
          </span>
          <span>{terminou ? 'Concluído' : 'Em andamento'}</span>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-4 border-y border-slate-100 dark:border-petrol-800 mb-6 transition-colors">
          <div className="py-3.5 pr-3">
            <div className="text-[9.5px] font-bold text-slate-400 dark:text-petrol-300/50 uppercase tracking-[0.14em] mb-1.5 transition-colors">
              Processados
            </div>
            <div className="font-mono text-[18px] font-bold text-slate-900 dark:text-white leading-none transition-colors">
              {progresso.processados}
            </div>
          </div>
          <div className="py-3.5 px-3 border-l border-slate-100 dark:border-petrol-800 transition-colors">
            <div className="text-[9.5px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.14em] mb-1.5 transition-colors">
              Sucesso
            </div>
            <div className="font-mono text-[18px] font-bold text-emerald-700 dark:text-emerald-400 leading-none transition-colors">
              {sucesso}
            </div>
          </div>
          <div className="py-3.5 px-3 border-l border-slate-100 dark:border-petrol-800 transition-colors">
            <div className="text-[9.5px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-[0.14em] mb-1.5 transition-colors">
              Erros
            </div>
            <div className="font-mono text-[18px] font-bold text-rose-700 dark:text-rose-400 leading-none transition-colors">
              {erros}
            </div>
          </div>
          <div className="py-3.5 pl-3 border-l border-slate-100 dark:border-petrol-800 transition-colors">
            <div className="text-[9.5px] font-bold text-slate-400 dark:text-petrol-300/50 uppercase tracking-[0.14em] mb-1.5 transition-colors">
              Pendentes
            </div>
            <div className="font-mono text-[18px] font-bold text-slate-500 dark:text-petrol-300/70 leading-none transition-colors">
              {pendentes}
            </div>
          </div>
        </div>

        {/* Atividade recente */}
        <div className="pt-5 border-t border-slate-100 dark:border-petrol-800 transition-colors">
          <div className="text-[9.5px] font-bold text-slate-400 dark:text-petrol-300/50 uppercase tracking-[0.14em] mb-3 transition-colors">
            Atividade recente
          </div>
          {ultimos.length === 0 ? (
            <div className="flex items-center gap-2 text-[11.5px] text-slate-400 dark:text-petrol-300/50 transition-colors">
              <Loader2 className="w-3 h-3 animate-spin" />
              Iniciando processamento...
            </div>
          ) : (
            <ul className="space-y-2 text-[11.5px]">
              {ultimos.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  {item.status === 'erro' ? (
                    <span className="text-rose-600 dark:text-rose-400 text-[10px] transition-colors">⚠</span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] transition-colors">✓</span>
                  )}
                  <span className="font-mono text-slate-700 dark:text-petrol-100 transition-colors">
                    {item.placa}
                  </span>
                  {item.mensagem && (
                    <span className="text-slate-400 dark:text-petrol-300/50 transition-colors">
                      — {item.mensagem}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-5 mt-6 border-t border-slate-100 dark:border-petrol-800 transition-colors">
          {!terminou && (
            <button
              type="button"
              onClick={() => setMinimizado(true)}
              className="h-9 px-4 rounded-md text-[12px] font-semibold text-slate-600 dark:text-petrol-200 hover:bg-slate-100 dark:hover:bg-petrol-800 transition-colors cursor-pointer"
            >
              Minimizar
            </button>
          )}
          {terminou && (
            <button
              type="button"
              onClick={onFechar}
              className="h-9 px-4 rounded-md bg-petrol-600 hover:bg-petrol-700 dark:bg-petrol-500 dark:hover:bg-petrol-400 text-white text-[12px] font-semibold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          )}
        </div>
      </Modal>

      {miniVisivel && (
        <MiniLoteWidget
          progresso={progresso}
          terminou={terminou}
          onExpandir={() => setMinimizado(false)}
          onFechar={terminou ? onFechar : undefined}
        />
      )}
    </>
  )
}

/* ════════════════════════════════════════════════════════════════════════ */

function MiniLoteWidget({
  progresso,
  terminou,
  onExpandir,
  onFechar,
}: {
  progresso: DetranProgresso
  terminou: boolean
  onExpandir: () => void
  onFechar?: () => void
}) {
  return (
    <>
      <style>{`
        @keyframes mini-lote-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mini-lote-ping {
          0%   { transform: scale(.7); opacity: .5; }
          80%  { transform: scale(2);  opacity: 0; }
          100% { transform: scale(2);  opacity: 0; }
        }
        .mini-lote-in {
          animation: mini-lote-in 240ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .mini-lote-ping {
          animation: mini-lote-ping 2.6s cubic-bezier(0, 0, .2, 1) infinite;
        }
      `}</style>

      <div
        role="status"
        aria-live="polite"
        className="mini-lote-in fixed bottom-5 right-5 z-40 w-80 max-w-[calc(100vw-2.5rem)]"
      >
        <div className="
          bg-white dark:bg-petrol-900
          border border-slate-200 dark:border-petrol-800
          rounded-md shadow-lg overflow-hidden
          transition-colors
        ">
          {/* Linha superior */}
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex w-1.5 h-1.5 shrink-0">
                {!terminou && (
                  <span className="absolute inline-flex w-full h-full rounded-full bg-petrol-500 opacity-60 mini-lote-ping" />
                )}
                <span
                  className={`relative inline-flex rounded-full w-1.5 h-1.5 transition-colors ${
                    terminou
                      ? 'bg-emerald-500 dark:bg-emerald-400'
                      : 'bg-petrol-600 dark:bg-petrol-400'
                  }`}
                />
              </span>

              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-800 dark:text-white truncate transition-colors">
                  {terminou ? 'Consulta concluída' : 'Consulta em lote'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-petrol-300/60 font-mono mt-0.5 transition-colors">
                  {progresso.processados} / {progresso.total} ·{' '}
                  {progresso.percentual}%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onExpandir}
                aria-label="Expandir consulta em lote"
                className="
                  inline-flex items-center gap-1 h-7 px-2.5 rounded-md
                  text-[11px] font-semibold
                  text-petrol-700 dark:text-petrol-300
                  hover:bg-petrol-50 dark:hover:bg-petrol-800
                  transition-colors cursor-pointer
                "
              >
                {terminou ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Ver
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Abrir
                  </>
                )}
              </button>

              {terminou && onFechar && (
                <button
                  type="button"
                  onClick={onFechar}
                  aria-label="Dispensar notificação"
                  className="
                    w-7 h-7 rounded-md flex items-center justify-center
                    text-slate-400 dark:text-petrol-300/60
                    hover:text-slate-700 dark:hover:text-white
                    hover:bg-slate-100 dark:hover:bg-petrol-800
                    transition-colors cursor-pointer
                  "
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="px-4 pb-3">
            <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-petrol-800 overflow-hidden transition-colors">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  terminou
                    ? 'bg-emerald-500 dark:bg-emerald-400'
                    : 'bg-petrol-500 dark:bg-petrol-400'
                }`}
                style={{ width: `${progresso.percentual}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}