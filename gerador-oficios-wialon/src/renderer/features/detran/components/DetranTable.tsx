import { Download, Loader2, ListChecks } from 'lucide-react'
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
import { obterUrlPdfDetran, type InfracaoDetran } from '../../../services/detran'
import { formatarDataHora } from '../../../lib/format'

interface DetranTableProps {
  consultas: InfracaoDetran[]
  carregando?: boolean
  onVerMultas?: (consultaId: number, placa: string) => void
}

export function DetranTable({ consultas, carregando, onVerMultas }: DetranTableProps) {
  const lista = Array.isArray(consultas) ? consultas : []

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-slate-200">
          <TableHead>Placa</TableHead>
          <TableHead>Chassi</TableHead>
          <TableHead>Última consulta</TableHead>   {/* ← NOVO */}
          <TableHead>Status</TableHead>
          <TableHead>Tipo Débito</TableHead>
          <TableHead className="text-center">Multas</TableHead>
          <TableHead className="text-center">Boleto / PDF</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {carregando ? (
          <tr>
            <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
              <div className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                Carregando histórico de consultas...
              </div>
            </td>
          </tr>
        ) : lista.length > 0 ? (
          lista.map((item, index) => (
            <TableRow
              key={item.id ?? index}
              className="cursor-pointer hover:bg-slate-50/60 transition"
              onClick={() => item.id && onVerMultas?.(item.id, item.placa)}
            >
              <TableCell className="font-bold text-slate-800">{item.placa}</TableCell>
              <TableCell className="font-mono text-xs text-slate-500">{item.chassi}</TableCell>

              {/* NOVO */}
              <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                {formatarDataHora(item.updated_at || item.created_at)}
              </TableCell>

              <TableCell>
                <DetranStatusBadge status={item.statusConsulta} />
              </TableCell>
              <TableCell className="text-xs font-semibold text-slate-600">
                {item.tipoDebito || '-'}
              </TableCell>

              <TableCell className="text-center">
                {item.statusConsulta === 'COM_DEBITO' ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (item.id) onVerMultas?.(item.id, item.placa)
                    }}
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    Ver multas
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">-</span>
                )}
              </TableCell>

              <TableCell className="text-center">
                {item.id && item.caminhoPdf ? (
                  <a
                    href={obterUrlPdfDetran(item.id)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 hover:text-cyan-700"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">-</span>
                )}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableEmpty colSpan={7}>Nenhuma consulta efetuada até o momento.</TableEmpty>
        )}
      </TableBody>
    </Table>
  )
}