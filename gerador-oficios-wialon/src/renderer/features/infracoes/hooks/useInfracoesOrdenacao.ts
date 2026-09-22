import { useCallback, useState } from 'react'
import type { Infracao } from '../../../services/infracoes'

export type CampoOrdenacao = 'id' | 'condutor' | 'velocidade' | 'created_at'
export type DirecaoOrdenacao = 'asc' | 'desc'

export function useInfracoesOrdenacao(
  campoInicial: CampoOrdenacao = 'created_at',
  direcaoInicial: DirecaoOrdenacao = 'desc'
) {
  const [campoOrdenacao, setCampoOrdenacao] = useState<CampoOrdenacao>(campoInicial)
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<DirecaoOrdenacao>(direcaoInicial)

  const handleOrdenar = useCallback(
    (campo: CampoOrdenacao) => {
      if (campoOrdenacao === campo) {
        setDirecaoOrdenacao((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setCampoOrdenacao(campo)
        setDirecaoOrdenacao('asc')
      }
    },
    [campoOrdenacao]
  )

  const ordenarLista = useCallback(
    (lista: Infracao[]) => {
      return [...lista].sort((a, b) => {
        let valorA: any = (a as any)[campoOrdenacao] ?? ''
        let valorB: any = (b as any)[campoOrdenacao] ?? ''

        if (campoOrdenacao === 'created_at') {
          const tA = new Date(a.created_at).getTime()
          const tB = new Date(b.created_at).getTime()
          valorA = isNaN(tA) ? 0 : tA
          valorB = isNaN(tB) ? 0 : tB
        } else if (typeof valorA === 'string') {
          valorA = valorA.toLowerCase()
          valorB = String(valorB).toLowerCase()
        }

        if (valorA < valorB) return direcaoOrdenacao === 'asc' ? -1 : 1
        if (valorA > valorB) return direcaoOrdenacao === 'asc' ? 1 : -1
        return 0
      })
    },
    [campoOrdenacao, direcaoOrdenacao]
  )

  const direcaoDoCampo = useCallback(
    (campo: CampoOrdenacao): DirecaoOrdenacao | null =>
      campoOrdenacao === campo ? direcaoOrdenacao : null,
    [campoOrdenacao, direcaoOrdenacao]
  )

  return {
    campoOrdenacao,
    direcaoOrdenacao,
    handleOrdenar,
    ordenarLista,
    direcaoDoCampo,
  }
}