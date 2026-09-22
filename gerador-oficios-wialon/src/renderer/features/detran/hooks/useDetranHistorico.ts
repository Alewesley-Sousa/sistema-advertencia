import { useCallback, useEffect, useState } from 'react'
import { listarHistoricoDetran, type InfracaoDetran } from '../../../services/detran'

export function useDetranHistorico() {
  const [consultas, setConsultas] = useState<InfracaoDetran[]>([])
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      const resposta: any = await listarHistoricoDetran()
      // Aceita array puro ou { data: [...] }
      const lista: InfracaoDetran[] = Array.isArray(resposta)
        ? resposta
        : Array.isArray(resposta?.data)
          ? resposta.data
          : []
      setConsultas(lista)
    } catch (err) {
      console.error('[useDetranHistorico] Erro ao buscar histórico:', err)
      setConsultas([])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { consultas, carregando, recarregar }
}