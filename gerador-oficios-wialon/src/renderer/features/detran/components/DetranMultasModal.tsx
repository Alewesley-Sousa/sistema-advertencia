// src/renderer/features/detran/components/DetranMultasModal.tsx

import { Download, Loader2 } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '../../../components/ui/Table'
import { DetranMultaStatusBadge } from './DetranMultaStatusBadge'
import {
  obterUrlPdfMultaDetran,
  type MultaDetran,
} from '../services/detran'

interface DetranMultasModalProps {
  open: boolean
  onClose: () => void
  placa?: string
  multas: MultaDetran[]
  carregando?: boolean
}

export function DetranMultasModal({
  open,
  onClose,
  placa,
  multas,
  carregando,
}: DetranMultasModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={placa ? `Multas do veículo ${placa}` : 'Multas'}
      description={`${multas.length} multa${multas.length === 1 ? '' : 's'} encontrada${multas.length === 1 ? '' : 's'}`}
    >
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200 dark:border-petrol-800 transition-colors">
            <TableHead>AIT</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Data Infração</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Valor a Pagar</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Boleto</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {carregando ? (
            <tr>
              <td
                colSpan={7}
                className="py-8 text-center text-slate-400 dark:text-petrol-300/60 text-xs transition-colors"
              >
                <div className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-petrol-600 dark:text-petrol-300" />
                  Carregando multas...
                </div>
              </td>
            </tr>
          ) : multas.length > 0 ? (
            multas.map((multa, idx) => (
              <TableRow key={multa.id ?? multa.ait ?? idx}>
                <TableCell className="font-mono text-xs font-semibold text-slate-800 dark:text-petrol-100">
                  {multa.ait}
                </TableCell>
                <TableCell className="text-xs text-slate-600 dark:text-petrol-200/80 max-w-xs">
                  {multa.motivo}
                </TableCell>
                <TableCell className="text-xs text-slate-600 dark:text-petrol-200/80">
                  {multa.dataInfracao}
                </TableCell>
                <TableCell className="text-xs text-slate-600 dark:text-petrol-200/80">
                  {multa.dataVencimento}
                </TableCell>
                <TableCell className="text-xs font-bold text-slate-800 dark:text-petrol-100">
                  {multa.valorPagar}
                </TableCell>
                <TableCell>
                  <DetranMultaStatusBadge multa={multa} />
                </TableCell>
                <TableCell className="text-center">
                  {multa.id && multa.caminhoPdf ? (
                    <a
                      href={obterUrlPdfMultaDetran(multa.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-petrol-600 dark:text-petrol-300 hover:text-petrol-700 dark:hover:text-petrol-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-petrol-300/40 transition-colors">
                      -
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableEmpty colSpan={7}>Nenhuma multa encontrada para esta consulta.</TableEmpty>
          )}
        </TableBody>
      </Table>
    </Modal>
  )
}