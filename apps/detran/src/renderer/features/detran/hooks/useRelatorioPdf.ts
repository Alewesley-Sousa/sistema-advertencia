// apps/detran/src/renderer/features/detran/hooks/useRelatorioPdf.ts

import { useCallback, useEffect, useState } from 'react'
import type { RelatorioPdfConfig, RelatorioPrevia } from '../../../../shared/relatorioContrato'
import { gerarRelatorioPdfDetran, previaRelatorioPdfDetran } from '../services/detran'

/** Gera o PDF e controla estado de carregamento/erro. */
export function useGerarRelatorioPdf() {
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const gerar = useCallback(async (config: RelatorioPdfConfig) => {
    setGerando(true)
    setErro(null)
    try {
      await gerarRelatorioPdfDetran(config)
      return true
    } catch (e: any) {
      setErro(e?.message || 'Erro ao gerar o relatório em PDF.')
      return false
    } finally {
      setGerando(false)
    }
  }, [])

  return { gerando, erro, gerar, limparErro: () => setErro(null) }
}

/** Prévia (contagens) com debounce; cancela a requisição anterior ao mudar a config. */
export function usePreviaRelatorio(config: RelatorioPdfConfig | null, ativo: boolean) {
  const [previa, setPrevia] = useState<RelatorioPrevia | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const chave = config ? JSON.stringify(config) : ''

  useEffect(() => {
    if (!ativo || !config) return
    const controller = new AbortController()
    setCarregando(true)
    const timer = window.setTimeout(async () => {
      try {
        const resultado = await previaRelatorioPdfDetran(config, controller.signal)
        setPrevia(resultado)
        setErro(null)
      } catch (e: any) {
        if (controller.signal.aborted || e?.code === 'ERR_CANCELED') return
        setPrevia(null)
        setErro(e?.message || 'Não foi possível calcular a prévia.')
      } finally {
        if (!controller.signal.aborted) setCarregando(false)
      }
    }, 300)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
    // `chave` representa o conteúdo de `config`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, ativo])

  return { previa, carregando, erro }
}
