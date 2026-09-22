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
} from '../../../services/detran'

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
          <TableRow className="border-b border-slate-200">
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
              <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                <div className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                  Carregando multas...
                </div>
              </td>
            </tr>
          ) : multas.length > 0 ? (
            multas.map((multa, idx) => (
              <TableRow key={multa.id ?? multa.ait ?? idx}>
                <TableCell className="font-mono text-xs font-semibold text-slate-800">
                  {multa.ait}
                </TableCell>
                <TableCell className="text-xs text-slate-600 max-w-xs">
                  {multa.motivo}
                </TableCell>
                <TableCell className="text-xs text-slate-600">
                  {multa.dataInfracao}
                </TableCell>
                <TableCell className="text-xs text-slate-600">
                  {multa.dataVencimento}
                </TableCell>
                <TableCell className="text-xs font-bold text-slate-800">
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
            <TableEmpty colSpan={7}>Nenhuma multa encontrada para esta consulta.</TableEmpty>
          )}
        </TableBody>
      </Table>
    </Modal>
  )
}