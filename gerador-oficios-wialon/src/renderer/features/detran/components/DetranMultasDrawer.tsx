// src/renderer/features/detran/components/DetranMultasDrawer.tsx

import { useEffect, useState } from 'react'
import {
  ExternalLink,
  Loader2,
  X,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react'
import { Drawer } from '../../../components/ui/Drawer'
import { DetranMultaStatusBadge } from './DetranMultaStatusBadge'
import {
  obterUrlPdfMultaDetran,
  type MultaDetran,
} from '../services/detran'
import {
  contarBoletos,
  derivarStatusBoleto,
  parseValorMulta,
  totalValorMultas,
  traduzirErroEmissaoBoleto,
  URL_PORTAL_DETRAN_CE,
} from '../utils'
import { formatarValorMulta } from '../../../lib/format'

interface DetranMultasDrawerProps {
  open: boolean
  onClose: () => void
  placa?: string
  multas: MultaDetran[]
  carregando?: boolean
}

export function DetranMultasDrawer({
  open,
  onClose,
  placa,
  multas,
  carregando,
}: DetranMultasDrawerProps) {
  const resumo = contarBoletos(multas)
  const total = totalValorMultas(multas)

  const [multaExpandidaKey, setMultaExpandidaKey] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (multas.length > 0) {
      const primeira = multas[0]
      setMultaExpandidaKey(String(primeira.id ?? primeira.ait ?? 0))
    } else {
      setMultaExpandidaKey(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, placa])

  const toggleMulta = (key: string) => {
    setMultaExpandidaKey((prev) => (prev === key ? null : key))
  }

  return (
    <Drawer open={open} onClose={onClose}>
      {/* ═══ CONTEXTO DO VEÍCULO ═══════════════════════════════════════
          Header é sempre escuro (institucional), mas no dark sobe um tom
          para se destacar do body petrol-950. */}
      <div className="flex-none bg-slate-900 dark:bg-petrol-900 px-6 pt-6 pb-5 border-b border-transparent dark:border-petrol-800 transition-colors">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full bg-petrol-400"
              aria-hidden
            />
            <span className="text-[10px] font-bold text-petrol-300 tracking-[0.18em] uppercase">
              Débitos DETRAN-CE
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer -mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-6">
          <div className="font-mono text-[28px] font-bold text-white tracking-tight leading-none">
            {placa || '—'}
          </div>
        </div>

        <div className="flex items-center justify-between pt-5 border-t border-white/10">
          <div>
            <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-[0.16em]">
              Multas
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="font-mono text-[18px] font-bold text-white leading-none">
                {multas.length}
              </span>
              <span className="text-[10.5px] font-medium text-slate-400">
                encontradas
              </span>
            </div>
          </div>

          <span className="w-px h-10 bg-white/10" />

          <div className="text-center px-2">
            <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-[0.16em]">
              Boletos
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5 justify-center">
              {multas.length === 0 ? (
                <span className="font-mono text-[18px] font-bold text-white leading-none">
                  —
                </span>
              ) : (
                <>
                  <span className="font-mono text-[18px] font-bold text-white leading-none">
                    {resumo.baixados}
                  </span>
                  <span className="font-mono text-[13px] text-slate-400 leading-none">
                    / {resumo.total}
                  </span>
                </>
              )}
            </div>
          </div>

          <span className="w-px h-10 bg-white/10" />

          <div className="text-right">
            <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-[0.16em]">
              Valor total
            </div>
            <div className="font-mono text-[16px] font-bold text-rose-400 mt-1.5 leading-none">
              {formatarValorMulta(total)}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTEÚDO ══════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-petrol-950 transition-colors">
        {carregando ? (
          <div className="px-6 py-20 text-center">
            <div className="inline-flex items-center gap-2 text-slate-400 dark:text-petrol-300/60 text-xs transition-colors">
              <Loader2 className="w-4 h-4 animate-spin text-petrol-600 dark:text-petrol-300" />
              Carregando multas...
            </div>
          </div>
        ) : multas.length === 0 ? (
          <div className="px-6 py-12">
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-6 py-10 text-center transition-colors">
              <div className="w-12 h-12 rounded-full bg-white dark:bg-petrol-900 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center mx-auto mb-3.5 transition-colors">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-[14px] font-semibold text-emerald-900 dark:text-emerald-300 transition-colors">
                Nenhuma multa encontrada
              </p>
              <p className="text-[11.5px] text-emerald-700/80 dark:text-emerald-400/70 mt-1.5 leading-relaxed transition-colors">
                Este veículo está em situação regular no DETRAN-CE.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 pt-5 pb-3">
              <div className="text-[10px] font-bold text-slate-400 dark:text-petrol-300/50 uppercase tracking-[0.16em] transition-colors">
                Infrações encontradas
                <span className="text-slate-300 dark:text-petrol-700 mx-1.5 transition-colors">·</span>
                <span className="font-mono text-slate-500 dark:text-petrol-300/70 transition-colors">
                  {String(multas.length).padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="px-4 pb-5 space-y-3">
              {multas.map((multa, i) => {
                const key = String(multa.id ?? multa.ait ?? i)
                const aberta = key === multaExpandidaKey

                return (
                  <MultaBloco
                    key={key}
                    multa={multa}
                    indice={i}
                    aberta={aberta}
                    onToggle={() => toggleMulta(key)}
                  />
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ═══ RODAPÉ ════════════════════════════════════════════════════ */}
      <div className="flex-none px-6 py-3 border-t border-slate-200 dark:border-petrol-800 bg-slate-100 dark:bg-petrol-900 transition-colors">
        <button
          type="button"
          onClick={onClose}
          className="
            w-full h-9 rounded-md text-[12px] font-semibold transition-colors cursor-pointer
            border border-slate-300 dark:border-petrol-700
            bg-white dark:bg-petrol-800
            hover:bg-slate-50 dark:hover:bg-petrol-700
            text-slate-700 dark:text-petrol-100
          "
        >
          Fechar
        </button>
      </div>
    </Drawer>
  )
}

/* ------------------------------------------------------------------ */

function MultaBloco({
  multa,
  indice,
  aberta,
  onToggle,
}: {
  multa: MultaDetran
  indice: number
  aberta: boolean
  onToggle: () => void
}) {
  const status = derivarStatusBoleto(multa)
  const idConteudo = `multa-conteudo-${indice}`

  return (
    <div
      className={`
        rounded-md overflow-hidden transition-all duration-200
        bg-white dark:bg-petrol-900
        border border-slate-200 dark:border-petrol-800 border-l-2
        ${aberta
          ? 'border-l-petrol-500 dark:border-l-petrol-400 shadow-sm'
          : 'border-l-slate-200 dark:border-l-petrol-800'}
      `}
    >
      {/* ─── TRIGGER ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberta}
        aria-controls={idConteudo}
        className="w-full text-left px-5 py-4 hover:bg-slate-50/70 dark:hover:bg-petrol-800/60 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-petrol-300/50 tracking-[0.14em] uppercase shrink-0 transition-colors">
              Multa {String(indice + 1).padStart(2, '0')}
            </span>
            <span className="text-slate-300 dark:text-petrol-700 transition-colors" aria-hidden>
              ·
            </span>
            <span className="font-mono text-[10.5px] font-semibold text-slate-500 dark:text-petrol-300/70 truncate transition-colors">
              {multa.ait}
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <DetranMultaStatusBadge multa={multa} />
            <ChevronDown
              className={`w-4 h-4 text-slate-400 dark:text-petrol-300/60 transition-transform duration-200 ${aberta ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </div>
        </div>

        <p className="text-[12.5px] text-slate-700 dark:text-petrol-100 leading-snug mb-2 line-clamp-1 transition-colors">
          {multa.motivo}
        </p>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono text-[11px] text-slate-500 dark:text-petrol-300/60 transition-colors">
              {multa.dataInfracao}
            </span>
            <span className="text-slate-300 dark:text-petrol-700 transition-colors" aria-hidden>
              ·
            </span>
            <span className="font-mono text-[12.5px] font-bold text-rose-600 dark:text-rose-400 transition-colors">
              {formatarValorMulta(parseValorMulta(multa.valorPagar ?? multa.valor))}
            </span>
          </div>
          <StatusBoletoCompacto multa={multa} />
        </div>
      </button>

      {/* ─── CONTEÚDO EXPANSÍVEL ─────────────────────────────────── */}
      <div
        id={idConteudo}
        className={`grid transition-all duration-200 ease-out ${
          aberta ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
        aria-hidden={!aberta}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-4 pt-1 border-t border-slate-100 dark:border-petrol-800 transition-colors">
            <p className="text-[12.5px] text-slate-800 dark:text-petrol-100 leading-relaxed mb-4 mt-3 transition-colors">
              {multa.motivo}
            </p>

            {/* Caixa técnica */}
            <div className="rounded-md bg-slate-100/70 dark:bg-petrol-800/40 border border-slate-200 dark:border-petrol-800 px-4 py-3 mb-3 transition-colors">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9.5px] font-bold text-slate-400 dark:text-petrol-300/50 uppercase tracking-[0.14em] transition-colors">
                    Data da infração
                  </div>
                  <div className="font-mono text-[12px] text-slate-700 dark:text-petrol-100 mt-1 transition-colors">
                    {multa.dataInfracao}
                  </div>
                  <div className="text-[9.5px] font-bold text-slate-400 dark:text-petrol-300/50 uppercase tracking-[0.14em] mt-2.5 transition-colors">
                    Vencimento
                  </div>
                  <div className="font-mono text-[12px] text-slate-700 dark:text-petrol-100 mt-1 transition-colors">
                    {multa.dataVencimento}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9.5px] font-bold text-slate-400 dark:text-petrol-300/50 uppercase tracking-[0.14em] transition-colors">
                    Valor a pagar
                  </div>
                  <div className="font-mono text-[17px] font-bold text-rose-600 dark:text-rose-400 mt-1 leading-none transition-colors">
                    {formatarValorMulta(parseValorMulta(multa.valorPagar ?? multa.valor))}
                  </div>
                </div>
              </div>
            </div>

            {status === 'BAIXADO' && <BoletoDisponivelBloco multa={multa} />}
            {status === 'FALHA' && <FalhaBoletoBloco erroEmissao={multa.erroEmissao} />}
            {status === 'PENDENTE' && <BoletoIndisponivelBloco />}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function StatusBoletoCompacto({ multa }: { multa: MultaDetran }) {
  const status = derivarStatusBoleto(multa)

  if (status === 'BAIXADO') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0 transition-colors">
        <span
          className="w-3 h-3 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center"
          aria-hidden
        >
          <span className="text-white text-[7px] font-bold leading-none">✓</span>
        </span>
        Boleto disponível
      </span>
    )
  }

  if (status === 'FALHA') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-400 shrink-0 transition-colors">
        <span
          className="w-3 h-3 rounded-full bg-amber-500 dark:bg-amber-400 flex items-center justify-center"
          aria-hidden
        >
          <span className="text-white text-[7px] font-bold leading-none">!</span>
        </span>
        Falha no boleto
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-slate-500 dark:text-petrol-300/60 shrink-0 transition-colors">
      <span
        className="w-3 h-3 rounded-full border border-slate-300 dark:border-petrol-700 transition-colors"
        aria-hidden
      />
      Boleto indisponível
    </span>
  )
}

/* ------------------------------------------------------------------ */

function BoletoDisponivelBloco({ multa }: { multa: MultaDetran }) {
  return (
    <div className="rounded-md border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-2">
          <span
            className="w-3.5 h-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5"
            aria-hidden
          >
            <span className="text-white text-[8px] font-bold leading-none">✓</span>
          </span>
          <div className="min-w-0">
            <div className="text-[9.5px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-[0.14em] transition-colors">
              Boleto disponível
            </div>
            <div className="text-[10.5px] text-emerald-700/80 dark:text-emerald-400/70 mt-0.5 transition-colors">
              {multa.jaBaixada
                ? 'Baixado em execução anterior.'
                : 'Baixado nesta consulta.'}
            </div>
          </div>
        </div>
        {multa.id && (
          <a
            href={obterUrlPdfMultaDetran(multa.id)}
            target="_blank"
            rel="noreferrer"
            className="
              inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md
              bg-white dark:bg-petrol-900
              border border-emerald-200 dark:border-emerald-900/50
              hover:bg-emerald-50 dark:hover:bg-emerald-950/40
              hover:border-emerald-300 dark:hover:border-emerald-800
              text-emerald-800 dark:text-emerald-300
              text-[11px] font-semibold transition-colors shrink-0
            "
          >
            <ExternalLink className="w-3 h-3" />
            Abrir PDF
          </a>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function BoletoIndisponivelBloco() {
  return (
    <div className="rounded-md border border-slate-200 dark:border-petrol-800 bg-slate-50 dark:bg-petrol-800/40 px-4 py-3 transition-colors">
      <div className="flex items-center gap-2.5">
        <span
          className="w-3 h-3 rounded-full border border-slate-300 dark:border-petrol-700 shrink-0 transition-colors"
          aria-hidden
        />
        <div>
          <div className="text-[9.5px] font-bold text-slate-500 dark:text-petrol-300/70 uppercase tracking-[0.14em] transition-colors">
            Boleto indisponível
          </div>
          <div className="text-[10.5px] text-slate-500 dark:text-petrol-300/60 mt-0.5 transition-colors">
            Não disponível para emissão no DETRAN-CE.
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function FalhaBoletoBloco({ erroEmissao }: { erroEmissao?: string | null }) {
  const falha = traduzirErroEmissaoBoleto(erroEmissao)

  return (
    <div className="rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 transition-colors">
      <div className="flex items-start gap-2.5">
        <span
          className="w-3.5 h-3.5 rounded-full bg-amber-500 dark:bg-amber-400 flex items-center justify-center shrink-0 mt-0.5"
          aria-hidden
        >
          <span className="text-white text-[8px] font-bold leading-none">!</span>
        </span>
        <div className="min-w-0">
          <div className="text-[9.5px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-[0.14em] transition-colors">
            {falha.titulo}
          </div>
          <p className="text-[10.5px] text-amber-900/80 dark:text-amber-400/80 mt-0.5 leading-relaxed transition-colors">
            {falha.descricao}
          </p>

          {falha.sugerirPortalDetran && (
            <a
              href={URL_PORTAL_DETRAN_CE}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[10.5px] font-semibold text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 underline underline-offset-2 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Abrir portal do DETRAN-CE
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/* Alias temporário */
export { DetranMultasDrawer as DetranMultasModal }