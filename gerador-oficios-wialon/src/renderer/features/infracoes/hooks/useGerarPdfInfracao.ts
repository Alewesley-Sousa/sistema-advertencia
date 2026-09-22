import { useState } from 'react'
import { gerarPdfInfracao } from '../../../services/infracoes'
import { showToast } from '../../../components/ui/Toast'

interface UseGerarPdfOptions {
  /** Callback externo opcional — se passado, delega para ele e não gera localmente */
  onGerarPdfExterno?: (id: number) => void
  /** Chamado após sucesso local (ex: recarregar lista) */
  onSucesso?: () => void
  /** ID em geração vindo de fora (App) — prevalece sobre o estado local */
  gerandoPdfIdExterno?: number | null
}

export function useGerarPdfInfracao({
  onGerarPdfExterno,
  onSucesso,
  gerandoPdfIdExterno,
}: UseGerarPdfOptions = {}) {
  const [gerandoIdLocal, setGerandoIdLocal] = useState<number | null>(null)

  const gerandoPdfId =
    gerandoPdfIdExterno !== undefined ? gerandoPdfIdExterno : gerandoIdLocal

  const gerarPdf = async (id: number) => {
    // Se existe handler externo, delega e nem tenta gerar local
    if (typeof onGerarPdfExterno === 'function') {
      onGerarPdfExterno(id)
      onSucesso?.()
      return
    }

    try {
      setGerandoIdLocal(id)
      await gerarPdfInfracao(id)
      showToast.success(`PDF do ofício #${id} gerado com sucesso!`)
      onSucesso?.()
    } catch (error: any) {
      console.error('[useGerarPdfInfracao] Erro ao gerar PDF:', error)
      showToast.error(
        error?.response?.data?.message ||
          'Ops! Ocorreu um erro ao tentar gerar o PDF do ofício.'
      )
    } finally {
      setGerandoIdLocal(null)
    }
  }

  return { gerarPdf, gerandoPdfId }
}