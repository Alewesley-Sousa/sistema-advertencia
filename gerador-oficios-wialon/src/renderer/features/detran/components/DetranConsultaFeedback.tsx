// src/renderer/features/detran/components/DetranConsultaFeedback.tsx

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, AlertTriangle, X } from 'lucide-react'
import type { ConsultarDetranResult } from '../services/detran'
import { contarBoletos } from '../utils'

interface DetranConsultaFeedbackProps {
  resultado: ConsultarDetranResult
}

const DURACAO_MS = 6000

export function DetranConsultaFeedback({
  resultado,
}: DetranConsultaFeedbackProps) {
  const [aberto, setAberto] = useState(true)
  const [sessao, setSessao] = useState(0)
  const primeiraRenderizacao = useRef(true)

  const multas = resultado.multas ?? []
  const resumo = contarBoletos(multas)
  const qtd = multas.length

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false
    } else {
      setSessao((s) => s + 1)
    }
    setAberto(true)
    const t = setTimeout(() => setAberto(false), DURACAO_MS)
    return () => clearTimeout(t)
  }, [resultado])

  useEffect(() => {
    if (!aberto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto])

  if (!aberto) return null
  if (typeof document === 'undefined') return null

  const semMultas = qtd === 0

  /* ── Tons semânticos, agora com par dark ─────────────────────── */
  const tom = semMultas
    ? {
        border:   'border-emerald-200 dark:border-emerald-900/50',
        iconBg:   'bg-emerald-600 dark:bg-emerald-500',
        title:    'text-emerald-700 dark:text-emerald-400',
        bar:      'bg-emerald-500',
        Icone:    Check,
        titulo:   'Consulta concluída',
        mensagem: 'Nenhuma multa encontrada. Veículo regular no DETRAN-CE.',
      }
    : {
        border:   'border-amber-200 dark:border-amber-900/50',
        iconBg:   'bg-amber-500 dark:bg-amber-400',
        title:    'text-amber-700 dark:text-amber-400',
        bar:      'bg-amber-500',
        Icone:    AlertTriangle,
        titulo:   'Multas encontradas',
        mensagem: 'Registro adicionado ao histórico para análise.',
      }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <style>{`
        @keyframes detran-feedback-backdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes detran-feedback-in {
          from { opacity: 0; transform: translateY(8px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes detran-feedback-countdown {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>

      {/* Backdrop — clique fecha */}
      <div
        className="absolute inset-0 bg-slate-900/25 dark:bg-petrol-950/70 backdrop-blur-[2px] transition-colors"
        style={{ animation: 'detran-feedback-backdrop 180ms ease-out' }}
        onClick={() => setAberto(false)}
        aria-hidden
      />

      {/* Card */}
      <div
        key={sessao}
        role="alertdialog"
        aria-labelledby="detran-feedback-titulo"
        aria-describedby="detran-feedback-resumo"
        className={`
          relative w-full max-w-sm rounded-lg border shadow-xl overflow-hidden
          bg-white dark:bg-petrol-900
          transition-colors
          ${tom.border}
        `}
        style={{
          animation: 'detran-feedback-in 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Barra de countdown */}
        <div
          className={`h-0.5 origin-left ${tom.bar}`}
          style={{
            animation: `detran-feedback-countdown ${DURACAO_MS}ms linear forwards`,
          }}
        />

        <div className="px-5 py-4">
          {/* Cabeçalho */}
          <div className="flex items-start gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${tom.iconBg}`}
            >
              <tom.Icone
                className="w-3.5 h-3.5 text-white"
                strokeWidth={semMultas ? 3 : 2.5}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div
                id="detran-feedback-titulo"
                className={`text-[10px] font-bold uppercase tracking-[0.16em] ${tom.title}`}
              >
                {tom.titulo}
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                <span className="font-mono text-[16px] font-bold text-slate-900 dark:text-white tracking-tight transition-colors">
                  {resultado.placa}
                </span>
                {resultado.tipoDebito && (
                  <span className="inline-flex items-center h-[18px] px-1.5 rounded text-[10px] font-semibold bg-petrol-600/10 dark:bg-petrol-400/15 text-petrol-600 dark:text-petrol-300 border border-petrol-600/20 dark:border-petrol-400/25 transition-colors">
                    {resultado.tipoDebito}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 dark:text-petrol-300/60 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-petrol-800 transition-colors cursor-pointer shrink-0 -mt-0.5 -mr-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Divisor */}
          <div className="h-px bg-slate-100 dark:bg-petrol-800 my-3.5 transition-colors" />

          {/* Métricas */}
          <div
            id="detran-feedback-resumo"
            className="flex items-baseline gap-2 flex-wrap"
          >
            <span className="font-mono text-[15px] font-bold text-slate-900 dark:text-white leading-none transition-colors">
              {String(qtd).padStart(2, '0')}
            </span>
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-petrol-300/60 uppercase tracking-wider transition-colors">
              {qtd === 1 ? 'multa' : 'multas'}
            </span>

            {resumo.baixados > 0 && (
              <>
                <span className="text-slate-300 dark:text-petrol-700 ml-1 transition-colors" aria-hidden>
                  ·
                </span>
                <span className="font-mono text-[15px] font-bold text-emerald-700 dark:text-emerald-400 leading-none transition-colors">
                  {String(resumo.baixados).padStart(2, '0')}
                </span>
                <span className="text-[10.5px] font-semibold text-slate-500 dark:text-petrol-300/60 uppercase tracking-wider transition-colors">
                  baixados
                </span>
              </>
            )}

            {resumo.falhas > 0 && (
              <>
                <span className="text-slate-300 dark:text-petrol-700 ml-1 transition-colors" aria-hidden>
                  ·
                </span>
                <span className="font-mono text-[15px] font-bold text-amber-700 dark:text-amber-400 leading-none transition-colors">
                  {String(resumo.falhas).padStart(2, '0')}
                </span>
                <span className="text-[10.5px] font-semibold text-slate-500 dark:text-petrol-300/60 uppercase tracking-wider transition-colors">
                  {resumo.falhas === 1 ? 'falha' : 'falhas'}
                </span>
              </>
            )}
          </div>

          <p className="text-[10.5px] text-slate-500 dark:text-petrol-300/60 mt-2.5 transition-colors">
            {tom.mensagem}
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}