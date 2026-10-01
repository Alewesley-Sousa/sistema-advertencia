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
import { obterUrlPdfDetran, type InfracaoDetran } from '../services/detran'
import { formatarDataHora } from '../../../lib/format'

interface DetranTableProps {
  consultas: InfracaoDetran[]
  carregando?: boolean
  onVerMultas?: (consultaId: number, placa: string) => void
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
}: {
  item: InfracaoDetran
  onVerMultas?: DetranTableProps['onVerMultas']
}) {
  const status = item.statusConsulta

  if (status === 'COM_DEBITO' || status === 'QUITADO') {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-petrol-600 dark:text-petrol-300 hover:text-petrol-700 dark:hover:text-petrol-200 cursor-pointer transition-colors"
        onClick={() => item.id && onVerMultas?.(item.id, item.placa)}
      >
        <ListChecks className="w-3.5 h-3.5" />
        Ver multas
      </button>
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
}: DetranTableProps) {
  const lista = Array.isArray(consultas) ? consultas : []

  return (
    <Table className="w-full text-left">
      <TableHeader>
        <TableRow className="border-b border-slate-200 dark:border-petrol-700 transition-colors">
          <TableHead className="py-2.5 px-4 text-[10px] tracking-[0.12em]">Placa</TableHead>
          <TableHead className="py-2.5 px-4 text-[10px] tracking-[0.12em] hidden md:table-cell">
            Chassi
          </TableHead>
          <TableHead className="py-2.5 px-4 text-[10px] tracking-[0.12em]">Status</TableHead>
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
            <td colSpan={7} className="py-16 text-center">
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

            return (
              <TableRow
                key={item.id ?? index}
                className="hover:bg-slate-50 dark:hover:bg-petrol-800/60 transition-colors"
              >
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
                  <CelulaAcao item={item} onVerMultas={onVerMultas} />
                </TableCell>
              </TableRow>
            )
          })
        ) : (
          <TableEmpty colSpan={7}>
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