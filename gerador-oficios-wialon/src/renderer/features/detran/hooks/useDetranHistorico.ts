// src/renderer/features/detran/hooks/useDetranHistorico.ts

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listarHistoricoDetran,
  type InfracaoDetran,
} from '../../../services/detran'
import type { Pagination } from '../../../types/api'
import type { FiltroStatusDetran } from '../components/DetranHistoricoFilters'

const LIMITE_POR_PAGINA = 10

export function useDetranHistorico() {
  const [consultas, setConsultas] = useState<InfracaoDetran[]>([])
  const [carregando, setCarregando] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusDetran>('TODOS')
  const [meta, setMeta] = useState<Pagination | null>(null)

  // Debounce da busca pra não disparar request a cada tecla
  const buscaDebouncedRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [buscaDebounced, setBuscaDebounced] = useState('')

  useEffect(() => {
    if (buscaDebouncedRef.current) clearTimeout(buscaDebouncedRef.current)

    buscaDebouncedRef.current = setTimeout(() => {
      setBuscaDebounced(busca)
    }, 400)

    return () => {
      if (buscaDebouncedRef.current) clearTimeout(buscaDebouncedRef.current)
    }
  }, [busca])

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      const resposta = await listarHistoricoDetran({
        pagina,
        limite: LIMITE_POR_PAGINA,
        busca: buscaDebounced || undefined,
        // O backend aceita `status`, só não estava tipado em BaseFiltros
        // (passamos como `any` pra não precisar mexer no tipo global)
        ...({ status: filtroStatus === 'TODOS' ? undefined : filtroStatus } as any),
      })

      const lista = Array.isArray(resposta?.data) ? resposta.data : []
      setConsultas(lista)
      setMeta(resposta.meta ?? null)
    } catch (err) {
      console.error('[useDetranHistorico] Erro ao buscar histórico:', err)
      setConsultas([])
      setMeta(null)
    } finally {
      setCarregando(false)
    }
  }, [pagina, buscaDebounced, filtroStatus])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  /* ---------- Handlers com reset de página ---------- */

  const handleBuscaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBusca(e.target.value)
    setPagina(1) // volta pra página 1 quando o usuário digita
  }, [])

  const handleFiltroStatusChange = useCallback((valor: FiltroStatusDetran) => {
    setFiltroStatus(valor)
    setPagina(1) // idem
  }, [])

  const handlePaginaChange = useCallback((novaPagina: number) => {
    setPagina(novaPagina)
  }, [])

  return {
    consultas,
    carregando,
    recarregar,
    pagina,
    setPagina: handlePaginaChange,
    meta,
    limite: LIMITE_POR_PAGINA,

    // filtros
    busca,
    filtroStatus,
    handleBuscaChange,
    handleFiltroStatusChange,
  }
}