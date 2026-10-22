// src/renderer/features/detran/components/DetranTable.tsx

import {
  Loader2,
  ListChecks,
  Info,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Circle,
  Inbox,
  Download,
  Check,
  Minus,
} from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '../../../components/ui/Table'
import { DetranStatusBadge } from './DetranStatusBadge'
import {
  obterUrlPdfDetran,
  type InfracaoDetran,
  type SituacaoDebito as SituacaoDebitoTipo,
} from '../services/detran'
import { formatarDataHora } from '../../../lib/format'

/**
 * Regra de seleção: só dá pra marcar/exportar consultas que já têm pelo
 * menos 1 boleto baixado. Exportada pra que a página aplique a mesma
 * regra nos handlers de toggle (senão shift+click e "selecionar todos"
 * marcariam itens inelegíveis).
 */
export function podeExportar(item: InfracaoDetran): boolean {
  return (item.qtdBoletosBaixados ?? 0) > 0
}

function SituacaoDebito({
  label,
  status,
}: {
  label: string
  status?: SituacaoDebitoTipo
}) {
  const configuracao = {
    DEBITO: {
      texto: 'Com débito',
      classe: 'text-rose-700 dark:text-rose-400',
    },
    SEM_DEBITO: {
      texto: 'Regular',
      classe: 'text-emerald-700 dark:text-emerald-400',
    },
    INFORMACAO: {
      texto: 'Informativo',
      classe: 'text-amber-700 dark:text-amber-400',
    },
    DESCONHECIDO: {
      texto: 'Não identificado',
      classe: 'text-slate-400 dark:text-petrol-300/60',
    },
  }[status ?? 'DESCONHECIDO']

  return (
    <span className="flex items-center justify-between gap-2 whitespace-nowrap">
      <span className="text-slate-400 dark:text-petrol-300/60">{label}</span>
      <span className={`font-semibold ${configuracao.classe}`}>
        {configuracao.texto}
      </span>
    </span>
  )
}

interface DetranTableProps {
  consultas: InfracaoDetran[]
  carregando?: boolean
  onVerMultas?: (consultaId: number, placa: string) => void
  onExportar?: (consultaId: number) => void
  exportandoId?: number | null

  /** Se false, a coluna de checkboxes nem é renderizada */
  mostrarSelecao?: boolean
  /** IDs (consultas) selecionados — persistem entre páginas */
  selecionados?: Set<number>
  /** Alternar seleção de um item. `index` é o índice na página atual. */
  onToggleSelecao?: (index: number, shiftKey: boolean) => void
  /** Marca/desmarca todos os itens elegíveis da página atual */
  onToggleTodos?: (selecionar: boolean) => void
}

/* ─────────────────────────────────────────────────────────────
   Checkbox customizado
───────────────────────────────────────────────────────────── */
function CheckboxCustom({
  checked,
  indeterminate = false,
  disabled = false,
  onClick,
  ariaLabel,
  title,
}: {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  ariaLabel: string
  title?: string
}) {
  const ativo = checked || indeterminate

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        'w-[16px] h-[16px] shrink-0',
        'inline-flex items-center justify-center',
        'rounded-[3px] border',
        'transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-petrol-900',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        ativo
          ? 'bg-petrol-600 border-petrol-600 dark:bg-petrol-500 dark:border-petrol-500'
          : 'bg-white dark:bg-petrol-900 border-slate-300 dark:border-petrol-600 hover:border-petrol-500 dark:hover:border-petrol-400',
        disabled ? '' : 'cursor-pointer',
      ].join(' ')}
    >
      {indeterminate ? (
        <Minus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
      ) : checked ? (
        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
      ) : null}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   Célula Multas
───────────────────────────────────────────────────────────── */
function CelulaMultas({
  qtd,
  status,
}: {
  qtd: number
  status: InfracaoDetran['statusConsulta']
}) {
  if (status !== 'COM_DEBITO' && status !== 'QUITADO') {
    return (
      <span className="text-[11px] text-slate-400 dark:text-petrol-400/60 transition-colors">
        —
      </span>
    )
  }
  if (qtd <= 0) {
    return (
      <span className="text-[11px] text-slate-400 dark:text-petrol-400/60 transition-colors">
        —
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-800 dark:text-petrol-100 transition-colors">
      <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 transition-colors" />
      {qtd}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   Célula Boletos
───────────────────────────────────────────────────────────── */
function CelulaBoletos({
  item,
  status,
}: {
  item: InfracaoDetran
  status: InfracaoDetran['statusConsulta']
}) {
  if (status === 'PROCESSANDO') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-petrol-400/70 transition-colors">
        <Loader2 className="w-3 h-3 animate-spin" />
        Processando
      </span>
    )
  }
  if (status === 'PENDENTE') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-petrol-400/70 italic transition-colors">
        <Circle className="w-3 h-3" />
        Na fila
      </span>
    )
  }
  if (status === 'ERRO') {
    return (
      <span className="text-[11px] text-slate-400 dark:text-petrol-400/60 transition-colors">
        —
      </span>
    )
  }

  const baixados = item.qtdBoletosBaixados ?? 0
  const indisponiveis = item.qtdBoletosIndisponiveis ?? 0
  const falhas = item.qtdBoletosFalhas ?? 0
  const total = baixados + indisponiveis + falhas

  if (total === 0) {
    return (
      <span className="text-[11px] text-slate-400 dark:text-petrol-400/60 transition-colors">
        —
      </span>
    )
  }

  if (falhas > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 transition-colors">
        <AlertTriangle className="w-3 h-3" />
        {baixados} baixado{baixados === 1 ? '' : 's'} · {falhas} falha
        {falhas === 1 ? '' : 's'}
      </span>
    )
  }

  if (baixados === 0 && indisponiveis > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-petrol-300/80 transition-colors">
        <Circle className="w-3 h-3" />
        {indisponiveis} indisponíve{indisponiveis === 1 ? 'l' : 'is'}
      </span>
    )
  }

  const label = `${baixados} baixado${baixados === 1 ? '' : 's'}`

  if (item.id && item.caminhoPdf) {
    return (
      <a
        href={obterUrlPdfDetran(item.id)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
      >
        <CheckCircle2 className="w-3 h-3" />
        {label}
      </a>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 transition-colors">
      <CheckCircle2 className="w-3 h-3" />
      {label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   Célula Ação
───────────────────────────────────────────────────────────── */
function CelulaAcao({
  item,
  onVerMultas,
  onExportar,
  exportandoId,
}: {
  item: InfracaoDetran
  onVerMultas?: DetranTableProps['onVerMultas']
  onExportar?: DetranTableProps['onExportar']
  exportandoId?: number | null
}) {
  const status = item.statusConsulta

  if (status === 'COM_DEBITO' || status === 'QUITADO') {
    const temPdf = podeExportar(item)
    const exportandoEste = exportandoId != null && exportandoId === item.id

    return (
      <div className="inline-flex items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-petrol-600 dark:text-petrol-300 hover:text-petrol-700 dark:hover:text-petrol-200 cursor-pointer transition-colors"
          onClick={() => item.id && onVerMultas?.(item.id, item.placa)}
        >
          <ListChecks className="w-3.5 h-3.5" />
          Ver multas
        </button>

        {temPdf && (
          <>
            <span className="w-px h-3 bg-slate-200 dark:bg-petrol-700 transition-colors" />
            <button
              type="button"
              title="Exportar boletos desta consulta"
              disabled={exportandoEste || exportandoId != null}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-petrol-200 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              onClick={() => item.id && onExportar?.(item.id)}
            >
              {exportandoEste ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Exportar
            </button>
          </>
        )}
      </div>
    )
  }

  if (status === 'PROCESSANDO') {
    return (
      <span className="text-[11px] text-slate-400 dark:text-petrol-400/70 italic transition-colors">
        em andamento…
      </span>
    )
  }
  if (status === 'PENDENTE') {
    return (
      <span className="text-[11px] text-slate-400 dark:text-petrol-400/70 italic transition-colors">
        na fila…
      </span>
    )
  }
  if (status === 'ERRO') {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer transition-colors"
        onClick={() => item.id && onVerMultas?.(item.id, item.placa)}
      >
        <Info className="w-3.5 h-3.5" />
        Ver detalhes
      </button>
    )
  }

  return (
    <span className="text-[11px] text-slate-400 dark:text-petrol-400/60 transition-colors">
      —
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   Componente
───────────────────────────────────────────────────────────── */
export function DetranTable({
  consultas,
  carregando,
  onVerMultas,
  onExportar,
  exportandoId,
  mostrarSelecao = false,
  selecionados,
  onToggleSelecao,
  onToggleTodos,
}: DetranTableProps) {
  const lista = Array.isArray(consultas) ? consultas : []
  const selecionadosSet = selecionados ?? new Set<number>()
  const colSpan = mostrarSelecao ? 9 : 8

  // Só contam pro header os itens que podem ser exportados
  const idsElegiveis = lista
    .filter(podeExportar)
    .map((c) => c.id)
    .filter((id): id is number => typeof id === 'number')

  const todosSelecionados =
    mostrarSelecao &&
    idsElegiveis.length > 0 &&
    idsElegiveis.every((id) => selecionadosSet.has(id))

  const algumSelecionado = idsElegiveis.some((id) => selecionadosSet.has(id))
  const parcial = algumSelecionado && !todosSelecionados
  const semElegiveis = idsElegiveis.length === 0

  return (
    <Table className="w-full text-left">
      <TableHeader>
        <TableRow className="border-b border-slate-200 dark:border-petrol-700 transition-colors">
          {mostrarSelecao && (
            <TableHead className="py-2.5 px-4 w-[40px]">
              <CheckboxCustom
                checked={todosSelecionados}
                indeterminate={parcial}
                disabled={semElegiveis}
                ariaLabel="Selecionar todos os exportáveis desta página"
                title={
                  semElegiveis
                    ? 'Nenhuma consulta desta página tem boleto para exportar'
                    : undefined
                }
                onClick={() => onToggleTodos?.(!todosSelecionados)}
              />
            </TableHead>
          )}

          <TableHead className="py-2.5 px-4 text-[10px] tracking-[0.12em]">Placa</TableHead>
          <TableHead className="py-2.5 px-4 text-[10px] tracking-[0.12em] hidden md:table-cell">
            Chassi
          </TableHead>
          <TableHead className="py-2.5 px-4 text-[10px] tracking-[0.12em]">Status</TableHead>
          <TableHead className="py-2.5 px-4 text-[10px] tracking-[0.12em]">IPVA / Licenciamento</TableHead>
          <TableHead className="py-2.5 px-4 text-[10px] tracking-[0.12em] hidden lg:table-cell">
            Última consulta
          </TableHead>
          <TableHead className="py-2.5 px-4 text-[10px] tracking-[0.12em]">Multas</TableHead>
          <TableHead className="py-2.5 px-4 text-[10px] tracking-[0.12em]">Boletos</TableHead>
          <TableHead className="py-2.5 px-4 text-[10px] tracking-[0.12em] text-right">
            Ação
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {carregando ? (
          <tr>
            <td colSpan={colSpan} className="py-16 text-center">
              <div className="inline-flex flex-col items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-petrol-600 dark:text-petrol-400" />
                <p className="text-[12px] text-slate-500 dark:text-petrol-300/80 transition-colors">
                  Carregando histórico de consultas…
                </p>
              </div>
            </td>
          </tr>
        ) : lista.length > 0 ? (
          lista.map((item, index) => {
            const status = item.statusConsulta
            const selecionado = item.id != null && selecionadosSet.has(item.id)
            const elegivel = podeExportar(item)

            return (
              <TableRow
                key={item.id ?? index}
                className={
                  'transition-colors ' +
                  (selecionado
                    ? 'bg-petrol-50/60 dark:bg-petrol-800/40 '
                    : 'hover:bg-slate-50 dark:hover:bg-petrol-800/60 ')
                }
              >
                {mostrarSelecao && (
                  <TableCell className="py-3.5 px-4">
                    <CheckboxCustom
                      checked={selecionado}
                      disabled={item.id == null || !elegivel}
                      ariaLabel={
                        elegivel
                          ? `Selecionar consulta ${item.placa}`
                          : `${item.placa} não tem boleto para exportar`
                      }
                      title={
                        elegivel
                          ? 'Clique para selecionar · Shift+clique para intervalo'
                          : 'Sem boletos disponíveis para exportar'
                      }
                      onClick={(e) => onToggleSelecao?.(index, e.shiftKey)}
                    />
                  </TableCell>
                )}

                <TableCell className="py-3.5 px-4">
                  <span className="font-mono text-[13px] font-bold text-slate-900 dark:text-white tracking-[0.02em] transition-colors">
                    {item.placa}
                  </span>
                </TableCell>

                <TableCell className="py-3.5 px-4 hidden md:table-cell">
                  <span className="font-mono text-[10.5px] text-slate-400 dark:text-petrol-400/70 tracking-wider transition-colors">
                    {item.chassi}
                  </span>
                </TableCell>

                <TableCell className="py-3.5 px-4">
                  <DetranStatusBadge status={status} />
                </TableCell>

                <TableCell className="py-3 px-4">
                  <div className="flex min-w-[112px] flex-col gap-1 text-[10px]">
                    <SituacaoDebito label="IPVA" status={item.ipvaStatus} />
                    <SituacaoDebito label="Licenciamento" status={item.licenciamentoStatus} />
                  </div>
                </TableCell>

                <TableCell className="py-3.5 px-4 hidden lg:table-cell">
                  <span className="font-mono text-[11px] text-slate-500 dark:text-petrol-300/80 transition-colors">
                    {formatarDataHora(item.updated_at || item.created_at)}
                  </span>
                </TableCell>

                <TableCell className="py-3.5 px-4">
                  <CelulaMultas qtd={item.qtdMultas ?? 0} status={status} />
                </TableCell>

                <TableCell className="py-3.5 px-4">
                  <CelulaBoletos item={item} status={status} />
                </TableCell>

                <TableCell className="py-3.5 px-4 text-right">
                  <CelulaAcao
                    item={item}
                    onVerMultas={onVerMultas}
                    onExportar={onExportar}
                    exportandoId={exportandoId}
                  />
                </TableCell>
              </TableRow>
            )
          })
        ) : (
          <TableEmpty colSpan={colSpan}>
            <div className="inline-flex flex-col items-center gap-3 py-12">
              <div className="w-11 h-11 rounded-md bg-slate-50 dark:bg-petrol-800 border border-slate-200 dark:border-petrol-700 flex items-center justify-center transition-colors">
                <Inbox className="w-5 h-5 text-slate-400 dark:text-petrol-300/70 transition-colors" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-700 dark:text-petrol-100 transition-colors">
                  Nenhuma consulta encontrada
                </p>
                <p className="text-[11.5px] text-slate-400 dark:text-petrol-400/70 mt-1 transition-colors">
                  As consultas realizadas aparecerão aqui.
                </p>
              </div>
            </div>
          </TableEmpty>
        )}
      </TableBody>
    </Table>
  )
}