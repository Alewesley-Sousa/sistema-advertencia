// src/renderer/features/infracoes/hooks/useInfracoesOperacionais.ts

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listarInfracoesOperacional,
  type Infracao,
  type PaginationMeta,
} from '../services/infracoes'

const LIMITE_POR_PAGINA = 7
const POLLING_MS = 10_000
const DEBOUNCE_BUSCA_MS = 400

interface UseInfracoesOperacionaisOptions {
  busca?: string
  pollingAtivo?: boolean
}

export function useInfracoesOperacionais({
  busca = '',
  pollingAtivo = true,
}: UseInfracoesOperacionaisOptions = {}) {
  const [data, setData] = useState<Infracao[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [pagina, setPagina] = useState(1)
  const [carregando, setCarregando] = useState(false)

  /* ────────────────────────────────────────────────────────────────
     Debounce da busca
     ──────────────────────────────────────────────────────────────── */
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const timerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerDebounceRef.current) clearTimeout(timerDebounceRef.current)
    timerDebounceRef.current = setTimeout(
      () => setBuscaDebounced(busca),
      DEBOUNCE_BUSCA_MS
    )
    return () => {
      if (timerDebounceRef.current) clearTimeout(timerDebounceRef.current)
    }
  }, [busca])

  /* ────────────────────────────────────────────────────────────────
     Guarda contra race condition
     ────────────────────────────────────────────────────────────────
     Cada `recarregar()` incrementa um contador. Quando a resposta
     chega, ela só é aplicada se ainda for a requisição mais recente.
     Sem isso, mudar de página rápido pode fazer uma resposta antiga
     sobrescrever a nova (que veio primeiro). */
  const requestIdRef = useRef(0)

  /* ────────────────────────────────────────────────────────────────
     Fetch
     ──────────────────────────────────────────────────────────────── */
  const recarregar = useCallback(
    async (opts?: { silencioso?: boolean }) => {
      const silencioso = opts?.silencioso ?? false
      const meuId = ++requestIdRef.current

      if (!silencioso) setCarregando(true)

      try {
        const resposta = await listarInfracoesOperacional({
          pagina,
          limite: LIMITE_POR_PAGINA,
          busca: buscaDebounced || undefined,
        })

        // Ignora se uma requisição mais nova já foi disparada
        if (meuId !== requestIdRef.current) return

        setData(Array.isArray(resposta.data) ? resposta.data : [])
        setMeta(resposta.meta ?? null)
      } catch (err) {
        if (meuId !== requestIdRef.current) return
        console.error('[useInfracoesOperacionais] Erro:', err)
        setData([])
        setMeta(null)
      } finally {
        if (meuId === requestIdRef.current && !silencioso) {
          setCarregando(false)
        }
      }
    },
    [pagina, buscaDebounced]
  )

  /* ────────────────────────────────────────────────────────────────
     Fetch inicial e a cada mudança de página/busca
     ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    recarregar()
  }, [recarregar])

  /* ────────────────────────────────────────────────────────────────
     Polling automático
     ────────────────────────────────────────────────────────────────
     Só recarrega na página 1 e de forma "silenciosa" (sem spinner),
     para não piscar a UI embaixo do usuário.

     Regra: novas infrações sempre chegam no TOPO da lista (mais
     recentes). Se o usuário está na página 2+, ele está navegando
     ativamente — não queremos que a lista mude sozinha.

     O fetch silencioso também evita o spinner de tela cheia que
     apareceria a cada 10s. */
  useEffect(() => {
    if (!pollingAtivo) return
    if (pagina > 1) return

    const interval = setInterval(() => {
      recarregar({ silencioso: true })
    }, POLLING_MS)

    return () => clearInterval(interval)
  }, [recarregar, pollingAtivo, pagina])

  /* ────────────────────────────────────────────────────────────────
     Reset de página ao mudar a busca
     ────────────────────────────────────────────────────────────────
     Guard `if (pagina !== 1)` para não disparar um setState
     desnecessário no mount, que causaria um render extra. */
  useEffect(() => {
    if (pagina !== 1) setPagina(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaDebounced])

  /* ────────────────────────────────────────────────────────────────
     API pública
     ──────────────────────────────────────────────────────────────── */
  return {
    data,
    meta,
    carregando,
    pagina,
    setPagina,
    recarregar,
  }
}