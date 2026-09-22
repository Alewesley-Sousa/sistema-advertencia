import { useState } from 'react'
import { consultarVeiculoDetran } from '../../../services/detran'
import { showToast } from '../../../components/ui/Toast'

interface ConsultarParams {
  placa: string
  chassi: string
}

/**
 * Encapsula a consulta avulsa de 1 veículo.
 * Usa IPC quando estiver no Electron; senão cai para HTTP.
 */
export function useConsultaDetran(onSucesso?: () => void) {
  const [consultando, setConsultando] = useState(false)

  const consultar = async ({ placa, chassi }: ConsultarParams): Promise<boolean> => {
    setConsultando(true)
    const toastId = showToast.loading(`Consultando ${placa} no DETRAN-CE...`)

    try {
      const win = window as any
      if (win.electron?.ipcRenderer) {
        await win.electron.ipcRenderer.invoke('infracao:consultar-veiculo', { placa, chassi })
      } else {
        await consultarVeiculoDetran({ placa, chassi })
      }

      showToast.dismiss(toastId)
      showToast.success(`Consulta de ${placa} concluída.`)
      onSucesso?.()
      return true
    } catch (error: any) {
      console.error('[useConsultaDetran] Erro:', error)
      showToast.dismiss(toastId)
      showToast.error(
        error?.response?.data?.message || `Falha ao consultar o veículo ${placa}.`
      )
      return false
    } finally {
      setConsultando(false)
    }
  }

  return { consultar, consultando }
}