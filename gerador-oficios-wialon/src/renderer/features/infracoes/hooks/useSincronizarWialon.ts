import { useState } from 'react'
import { sincronizarDadosWialon } from '../../../services/infracoes'
import { showToast } from '../../../components/ui/Toast'

export function useSincronizarWialon(onSucesso?: () => void) {
  const [sincronizando, setSincronizando] = useState(false)

  const sincronizar = async () => {
    const toastId = showToast.loading('Sincronizando dados com a Wialon...')
    try {
      setSincronizando(true)
      await sincronizarDadosWialon()
      showToast.dismiss(toastId)
      showToast.success('Dados sincronizados com sucesso!')
      onSucesso?.()
    } catch (error: any) {
      console.error('[useSincronizarWialon] Falha ao sincronizar:', error)
      showToast.dismiss(toastId)
      showToast.error(
        error?.response?.data?.message ||
          'Não foi possível sincronizar os dados da Wialon.'
      )
    } finally {
      setSincronizando(false)
    }
  }

  return { sincronizar, sincronizando }
}