// src/renderer/features/detran/hooks/useDetranMultas.ts

import { useCallback, useState } from 'react'
import { listarMultasDaConsulta, type MultaDetran } from '../services/detran'
import { showToast } from '../../../components/ui/Toast'

export function useDetranMultas() {
  const [multas, setMultas] = useState<MultaDetran[]>([])
  const [carregando, setCarregando] = useState(false)
  const [consultaId, setConsultaId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)

  const abrir = useCallback(async (id: number) => {
    setConsultaId(id)
    setOpen(true)
    setCarregando(true)
    setMultas([])

    try {
      const lista = await listarMultasDaConsulta(id)
      setMultas(lista)
    } catch (error: any) {
      console.error('[useDetranMultas] Erro ao listar multas:', error)
      showToast.error(error?.message || 'Falha ao carregar as multas.')
      setMultas([])
    } finally {
      setCarregando(false)
    }
  }, [])

  const fechar = useCallback(() => {
    setOpen(false)
    setConsultaId(null)
    setMultas([])
  }, [])

  return { multas, carregando, consultaId, open, abrir, fechar }
}