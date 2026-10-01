// src/renderer/features/infracoes/components/InfracaoTableRow.tsx

import { Eye, Download, Mail, FileText, Loader2 } from 'lucide-react'
import {
  type Infracao,
  formatarDataHoraInfracao,
} from '../services/infracoes'
import { StatusBadge } from '../../../components/ui/StatusBadge'

interface InfracaoTableRowProps {
  item: Infracao
  onAbrirPdf: (id: number, placa: string, condutor: string) => void
  onGerarPdf?: (id: number) => void
  onEnviarEmail: (id: number) => void
  loadingPdfId?: number | null
  gerandoPdfId?: number | null
  enviandoEmailId?: number | null
  textoBotaoEmail?: string
}

export function InfracaoTableRow({
  item,
  onAbrirPdf,
  onGerarPdf,
  onEnviarEmail,
  loadingPdfId,
  gerandoPdfId,
  enviandoEmailId,
  textoBotaoEmail = 'E-mail',
}: InfracaoTableRowProps) {
  const isAbrindoPdf = loadingPdfId === item.id
  const isGerandoPdf = gerandoPdfId === item.id
  const isEnviando = enviandoEmailId === item.id

  const condutorExibicao = item.condutor || 'Não informado'
  const enderecoExibicao = item.endereco || 'Endereço não informado'

  const handleGerarClick = () => {
    if (typeof onGerarPdf === 'function') {
      onGerarPdf(item.id)
    } else {
      console.warn('[InfracaoTableRow] Handler onGerarPdf não foi fornecido.')
    }
  }

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-petrol-800/60 transition-colors">
      {/* ID / Data da ocorrência */}
      <td className="py-3.5 px-5 font-mono text-xs">
        <span className="font-semibold text-slate-700 dark:text-petrol-100 transition-colors">
          #{item.id}
        </span>
        <br />
        <span className="text-[10px] text-slate-400 dark:text-petrol-400/70 transition-colors">
          {formatarDataHoraInfracao(item.data_hora)}
        </span>
      </td>

      {/* Condutor / Placa */}
      <td className="py-3.5 px-5">
        <div className="font-semibold text-slate-900 dark:text-white transition-colors">
          {condutorExibicao}
        </div>
        <div className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-petrol-50 dark:bg-petrol-800/60 text-petrol-700 dark:text-petrol-200 border border-petrol-600/20 dark:border-petrol-700 transition-colors">
          {item.placa}
        </div>
      </td>

      {/* Velocidade */}
      <td className="py-3.5 px-5">
        <span className="font-bold text-rose-600 dark:text-rose-400 transition-colors">
          {item.velocidade} km/h
        </span>
      </td>

      {/* Endereço */}
      <td
        className="py-3.5 px-5 max-w-xs truncate text-xs text-slate-600 dark:text-petrol-300/80 transition-colors"
        title={item.endereco || ''}
      >
        {enderecoExibicao}
      </td>

      {/* Status */}
      <td className="py-3.5 px-5">
        <StatusBadge status={item.status} />
      </td>

      {/* Ações */}
      <td className="py-3.5 px-5 text-center">
        <div className="flex items-center justify-center gap-2">
          {item.pdf_path ? (
            <>
              <button
                type="button"
                onClick={() => onAbrirPdf(item.id, item.placa, condutorExibicao)}
                disabled={isAbrindoPdf}
                className="
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                  text-xs font-medium border transition-colors
                  bg-petrol-50 dark:bg-petrol-800/60
                  hover:bg-petrol-100 dark:hover:bg-petrol-700/60
                  text-petrol-700 dark:text-petrol-200
                  border-petrol-600/20 dark:border-petrol-700
                  disabled:opacity-50 cursor-pointer
                "
              >
                {isAbrindoPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                {isAbrindoPdf ? 'Abrindo...' : 'Ver'}
              </button>

              <a
                href={`http://localhost:3333/api/infracoes/${item.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                  text-xs font-medium transition-colors
                  bg-petrol-700 hover:bg-petrol-800
                  dark:bg-petrol-600 dark:hover:bg-petrol-500
                  text-white
                "
              >
                <Download className="w-3.5 h-3.5" />
                Baixar
              </a>
            </>
          ) : (
            <button
              type="button"
              onClick={handleGerarClick}
              disabled={isGerandoPdf}
              className="
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                text-xs font-medium border transition-colors
                bg-amber-50 dark:bg-amber-950/40
                hover:bg-amber-100 dark:hover:bg-amber-950/60
                text-amber-800 dark:text-amber-300
                border-amber-300/70 dark:border-amber-900/50
                disabled:opacity-50 cursor-pointer
              "
            >
              {isGerandoPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              {isGerandoPdf ? 'Gerando...' : 'Gerar Ofício'}
            </button>
          )}

          <button
            type="button"
            onClick={() => onEnviarEmail(item.id)}
            disabled={isEnviando || !item.pdf_path}
            className="
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-xs font-medium border transition-colors
              bg-slate-100 dark:bg-petrol-800
              hover:bg-slate-200 dark:hover:bg-petrol-700
              text-slate-700 dark:text-petrol-200
              border-slate-300 dark:border-petrol-700
              disabled:opacity-50 cursor-pointer
            "
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