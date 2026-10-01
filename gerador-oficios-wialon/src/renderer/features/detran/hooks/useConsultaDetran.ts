import { useState } from 'react'
import {
  consultarVeiculoDetran,
  type ConsultarDetranResult,
} from '../services/detran'
import { showToast } from '../../../components/ui/Toast'

interface ConsultarParams {
  placa: string
  chassi: string
}

export function useConsultaDetran(onSucesso?: () => void) {
  const [consultando, setConsultando] = useState(false)
  const [ultimoResultado, setUltimoResultado] =
    useState<ConsultarDetranResult | null>(null)

  const consultar = async ({ placa, chassi }: ConsultarParams): Promise<boolean> => {
    setConsultando(true)
    setUltimoResultado(null)

    const toastId = showToast.loading(`Consultando ${placa} no DETRAN-CE...`)

    try {
      const win = window as any
      const resultado: ConsultarDetranResult | null = win.electron?.ipcRenderer
        ? ((await win.electron.ipcRenderer.invoke('infracao:consultar-veiculo', {
            placa,
            chassi,
          })) as ConsultarDetranResult)
        : await consultarVeiculoDetran({ placa, chassi })

      setUltimoResultado(resultado ?? null)

      showToast.dismiss(toastId)
      showToast.success(`Consulta de ${placa} concluída.`)
      onSucesso?.()
      return true
    } catch (error: any) {
      console.error('[useConsultaDetran] Erro:', error)
      showToast.dismiss(toastId)
      showToast.error(
        error?.response?.data?.message ||
          `Falha ao consultar o veículo ${placa}.`
      )
      return false
    } finally {
      setConsultando(false)
    }
  }

  return { consultar, consultando, ultimoResultado }
}