// components/InfracaoTableRow.tsx
import { Eye, Download, Mail, Loader2 } from 'lucide-react'
import { type Infracao } from '../services/api'
import { StatusBadge } from './StatusBadge'

interface InfracaoTableRowProps {
  item: Infracao
  onAbrirPdf: (id: number, placa: string, condutor: string) => void
  onEnviarEmail: (id: number) => void
  loadingPdfId?: number | null
  enviandoEmailId: number | null
  textoBotaoEmail?: string
}

export function InfracaoTableRow({
  item,
  onAbrirPdf,
  onEnviarEmail,
  loadingPdfId,
  enviandoEmailId,
  textoBotaoEmail = 'E-mail'
}: InfracaoTableRowProps) {
  const isAbringoPdf = loadingPdfId === item.id
  const isEnviando = enviandoEmailId === item.id

  return (
    <tr className="hover:bg-slate-50/80 transition">
      <td className="py-3.5 px-5 font-mono text-xs text-slate-500">
        #{item.id} <br />
        <span className="text-[10px] text-slate-400">
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </span>
      </td>
      <td className="py-3.5 px-5">
        <div className="font-semibold text-blue-950">{item.condutor}</div>
        <div className="text-[11px] font-mono bg-blue-50 text-blue-800 border border-blue-100 font-medium px-2 py-0.5 rounded-md inline-block mt-0.5">
          {item.placa}
        </div>
      </td>
      <td className="py-3.5 px-5">
        <span className="font-bold text-rose-600">{item.velocidade} km/h</span>
        <div className="text-[11px] text-slate-400">Via: {item.limite_via} km/h</div>
      </td>
      <td className="py-3.5 px-5 max-w-xs truncate text-xs text-slate-600" title={item.endereco}>
        {item.endereco || 'Endereço não geocodificado'}
      </td>
      <td className="py-3.5 px-5">
        <StatusBadge status={item.status} />
      </td>
      <td className="py-3.5 px-5 text-center">
        <div className="flex items-center justify-center gap-2">
          {item.pdf_path ? (
            <>
              <button
                onClick={() => onAbrirPdf(item.id, item.placa, item.condutor)}
                disabled={isAbringoPdf}
                className="inline-flex items-center gap-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200/60 text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50"
              >
                {isAbringoPdf ? (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-600 animate-spin" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-cyan-600" />
                )}
                {isAbringoPdf ? 'Abrindo...' : 'Ver'}
              </button>
              <a
                href={`http://localhost:3333/api/infracoes/${item.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar
              </a>
            </>
          ) : (
            <span className="text-xs text-slate-300">Sem PDF</span>
          )}

          <button
            onClick={() => onEnviarEmail(item.id)}
            disabled={isEnviando || !item.pdf_path}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            {isEnviando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Mail className="w-3.5 h-3.5" />
            )}
            {isEnviando ? 'Enviando...' : textoBotaoEmail}
          </button>
        </div>
      </td>
    </tr>
  )
}