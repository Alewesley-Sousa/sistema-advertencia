import { Loader2 } from 'lucide-react'
import type { Infracao } from '../../../services/infracoes'
import { InfracaoTableRow } from './InfracaoTableRow'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableEmpty,
} from '../../../components/ui/Table'
import type {
  CampoOrdenacao,
  DirecaoOrdenacao,
} from '../hooks/useInfracoesOrdenacao'

interface InfracaoTableProps {
  lista: Infracao[]
  loading?: boolean
  loadingMessage?: string
  emptyMessage?: string

  campoOrdenacao: CampoOrdenacao
  direcaoOrdenacao: DirecaoOrdenacao
  onOrdenar: (campo: CampoOrdenacao) => void

  onAbrirPdf: (id: number, placa: string, condutor: string) => void
  onGerarPdf: (id: number) => void
  onEnviarEmail: (id: number) => void

  loadingPdfId: number | null
  gerandoPdfId: number | null
  enviandoEmailId: number | null
}

export function InfracaoTable({
  lista,
  loading,
  loadingMessage = 'Carregando...',
  emptyMessage = 'Nenhum registro encontrado.',
  campoOrdenacao,
  direcaoOrdenacao,
  onOrdenar,
  onAbrirPdf,
  onGerarPdf,
  onEnviarEmail,
  loadingPdfId,
  gerandoPdfId,
  enviandoEmailId,
}: InfracaoTableProps) {
  const dir = (campo: CampoOrdenacao) =>
    campoOrdenacao === campo ? direcaoOrdenacao : null

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-slate-200">
          <TableHead
            sortable
            sortDirection={dir('created_at')}
            onSort={() => onOrdenar('created_at')}
          >
            ID / Data
          </TableHead>
          <TableHead
            sortable
            sortDirection={dir('condutor')}
            onSort={() => onOrdenar('condutor')}
          >
            Condutor / Placa
          </TableHead>
          <TableHead
            sortable
            sortDirection={dir('velocidade')}
            onSort={() => onOrdenar('velocidade')}
          >
            Velocidade
          </TableHead>
          <TableHead>Endereço</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-center">Ações</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {loading ? (
          <tr>
            <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
              <div className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                {loadingMessage}
              </div>
            </td>
          </tr>
        ) : lista.length > 0 ? (
          lista.map((item) => (
            <InfracaoTableRow
              key={item.id}
              item={item}
              onAbrirPdf={onAbrirPdf}
              onGerarPdf={onGerarPdf}
              onEnviarEmail={onEnviarEmail}
              loadingPdfId={loadingPdfId}
              gerandoPdfId={gerandoPdfId}
              enviandoEmailId={enviandoEmailId}
            />
          ))
        ) : (
          <TableEmpty colSpan={6}>{emptyMessage}</TableEmpty>
        )}
      </TableBody>
    </Table>
  )
}