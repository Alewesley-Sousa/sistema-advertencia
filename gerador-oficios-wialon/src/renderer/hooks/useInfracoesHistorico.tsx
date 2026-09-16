import { useState, useEffect, useCallback } from 'react'
import { buscarHistoricoInfracoes, type HistoricoResponse, type HistoricoFiltros } from '../services/api'

export function useInfracoesHistorico(abaAtiva: 'OPERACIONAL' | 'HISTORICO') {
  const [data, setData] = useState<HistoricoResponse | null>(null)
  const [busca, setBusca] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)

  const carregarHistorico = useCallback(async () => {
    if (abaAtiva !== 'HISTORICO') return
    try {
      setLoading(true)
      const filtros: HistoricoFiltros = {
        busca,
        dataInicio,
        dataFim,
        pagina,
        limite: 10
      }
      const res = await buscarHistoricoInfracoes(filtros)
      setData(res)
    } catch (err) {
      console.error('Erro ao buscar histórico:', err)
    } finally {
      setLoading(false)
    }
  }, [abaAtiva, busca, dataInicio, dataFim, pagina])

  useEffect(() => {
    if (abaAtiva !== 'HISTORICO') return

    // Ativa o loading imediatamente ao mudar filtros (mesmo no debounce)
    setLoading(true)
    const timer = setTimeout(() => {
      carregarHistorico()
    }, 400)

    return () => clearTimeout(timer)
  }, [carregarHistorico, abaAtiva])

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusca(e.target.value)
    setPagina(1)
  }

  return {
    data,
    busca,
    dataInicio,
    dataFim,
    loading,
    setDataInicio: (d: string) => { setDataInicio(d); setPagina(1); },
    setDataFim: (d: string) => { setDataFim(d); setPagina(1); },
    setPagina,
    handleBuscaChange
  }
}