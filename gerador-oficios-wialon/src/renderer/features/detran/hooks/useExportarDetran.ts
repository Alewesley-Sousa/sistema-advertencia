// src/renderer/features/detran/hooks/useExportarDetran.ts

import { useCallback, useState } from 'react'
import { exportarMultasDetran } from '../services/detran'

export function useExportarDetran() {
  const [exportando, setExportando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const exportar = useCallback(
    async (ids?: number[]) => {
      if (exportando) return false

      setExportando(true)
      setErro(null)

      try {
        await exportarMultasDetran(ids)
        return true
      } catch (e: any) {
        setErro(e?.message || 'Erro ao exportar multas.')
        return false
      } finally {
        setExportando(false)
      }
    },
    [exportando]
  )

  return { exportando, erro, exportar }
}