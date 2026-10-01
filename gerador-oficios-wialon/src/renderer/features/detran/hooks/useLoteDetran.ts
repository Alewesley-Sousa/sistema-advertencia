// src/renderer/features/detran/hooks/useLoteDetran.ts

import { useCallback, useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  processarLoteDetran,
  consultarStatusLote,
  type ItemVeiculoLote,
} from '../services/detran'
import { showToast } from '../../../components/ui/Toast'
import {
  normalizarPlaca,
  normalizarChassi,
  precisouNormalizar,
} from '../utils'
import type { DetranProgresso, ProgressoItem } from '../types'

const INTERVALO_POLLING_MS = 2000

/**
 * Pega um valor do row buscando por qualquer chave equivalente,
 * ignorando maiúsculas/minúsculas e espaços nas pontas.
 *
 * Ex: pra `['placa']`, aceita `Placa`, `PLACA`, `placa`, ` placa `, etc.
 */
function valorDe(
  row: Record<string, any>,
  chavesAceitas: string[]
): { valor: string; chaveUsada: string | null } {
  const chavesLower = chavesAceitas.map((c) => c.toLowerCase().trim())

  for (const k of Object.keys(row)) {
    if (chavesLower.includes(k.toLowerCase().trim())) {
      const v = row[k]
      if (v !== undefined && v !== null) {
        return { valor: String(v).trim(), chaveUsada: k }
      }
    }
  }
  return { valor: '', chaveUsada: null }
}

export function useLoteDetran(onConcluido?: () => void) {
  const [progresso, setProgresso] = useState<DetranProgresso | null>(null)
  const [processando, setProcessando] = useState(false)
  const loteIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ultimoProcessadoRef = useRef(0)

  const pararPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const encerrar = useCallback(
    (statusFinal: 'CONCLUIDO' | 'ERRO', mensagem?: string) => {
      pararPolling()
      loteIdRef.current = null
      setProcessando(false)

      setProgresso((prev) =>
        prev
          ? {
              ...prev,
              status: statusFinal === 'CONCLUIDO' ? 'CONCLUIDO' : 'ERRO',
              itemAtual:
                statusFinal === 'CONCLUIDO' ? 'Concluído' : mensagem || 'Erro',
            }
          : null
      )

      if (statusFinal === 'CONCLUIDO') {
        onConcluido?.()
      }
    },
    [onConcluido, pararPolling]
  )

  const fazerPolling = useCallback(async () => {
    const loteId = loteIdRef.current
    if (!loteId) return

    try {
      const status = await consultarStatusLote(loteId)

      setProgresso((prev) => {
        if (!prev) return prev

        const novosItens: ProgressoItem[] = [...(prev.itens ?? [])]

        if (status.processados > ultimoProcessadoRef.current) {
          const diff = status.processados - ultimoProcessadoRef.current
          for (let i = 0; i < diff; i++) {
            novosItens.push({
              placa: `Item ${ultimoProcessadoRef.current + i + 1}`,
              status: 'ok',
              mensagem: 'processado',
            })
          }
          ultimoProcessadoRef.current = status.processados
        }

        return {
          ...prev,
          loteId: String(status.loteId),
          processados: status.processados,
          total: status.total,
          percentual: status.percentual,
          itemAtual: status.itemAtual,
          status: status.status === 'PROCESSANDO' ? 'PROCESSANDO' : prev.status,
          itens: novosItens,
        }
      })

      if (status.status === 'CONCLUIDO') {
        encerrar('CONCLUIDO')
        showToast.success('Lote concluído com sucesso!')
      } else if (status.status === 'ERRO') {
        encerrar('ERRO', 'Erro durante o processamento')
        showToast.error('O lote falhou durante o processamento.')
      }
    } catch (error: any) {
      console.error('[useLoteDetran] Erro no polling:', error)
    }
  }, [encerrar])

  const iniciarPolling = useCallback(
    (loteId: number) => {
      pararPolling()
      loteIdRef.current = loteId
      fazerPolling()
      intervalRef.current = setInterval(fazerPolling, INTERVALO_POLLING_MS)
    },
    [fazerPolling, pararPolling]
  )

  const processarArquivo = useCallback(
    async (file: File) => {
      try {
        setProcessando(true)
        ultimoProcessadoRef.current = 0
        setProgresso({
          loteId: 'init',
          processados: 0,
          total: 0,
          percentual: 0,
          itemAtual: 'Lendo planilha...',
          status: 'PROCESSANDO',
          itens: [],
          variante: 'real',
        })

        // ---- 1. Lê o arquivo ----
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet)

        console.log(
          '[useLoteDetran] Cabeçalhos detectados:',
          rows.length > 0 ? Object.keys(rows[0]) : '(planilha vazia)'
        )

        // ---- 2. Extrai e normaliza ----
        let placasAjustadas = 0
        let chassisAjustados = 0

        const veiculos: ItemVeiculoLote[] = rows
          .map((row) => {
            const { valor: placaBruta } = valorDe(row, [
              'placa',
              'plate',
              'placa do veiculo',
              'placa do veículo',
            ])
            const { valor: chassiBruto } = valorDe(row, [
              'chassi',
              'renavam',
              'chassis',
              'chassi/renavam',
            ])

            const placa = normalizarPlaca(placaBruta)
            const chassi = normalizarChassi(chassiBruto)

            if (placaBruta && precisouNormalizar(placaBruta, placa)) {
              placasAjustadas++
            }
            if (chassiBruto && precisouNormalizar(chassiBruto, chassi)) {
              chassisAjustados++
            }

            return { placa, chassi }
          })
          .filter((v) => v.placa && v.chassi)

        // ---- 3. Diagnóstico se nada foi encontrado ----
        if (!veiculos.length) {
          const cabecalhos = rows.length > 0 ? Object.keys(rows[0]) : []

          console.error(
            '[useLoteDetran] Nenhum veículo válido. Cabeçalhos:',
            cabecalhos
          )
          console.error('[useLoteDetran] Primeira linha:', rows[0])

          const amostraCabecalhos = cabecalhos.slice(0, 6).join(', ')
          showToast.error(
            cabecalhos.length > 0
              ? `Nenhum veículo válido. Cabeçalhos encontrados: ${amostraCabecalhos}. É preciso ter colunas "placa" e "chassi" (ou "renavam").`
              : 'Nenhum veículo válido (com Placa e Chassi) no arquivo.'
          )

          setProcessando(false)
          setProgresso(null)
          return
        }

        // ---- 4. Avisa sobre normalização ----
        const totalAjustes = placasAjustadas + chassisAjustados
        if (totalAjustes > 0) {
          const detalhes: string[] = []
          if (placasAjustadas > 0) {
            detalhes.push(
              `${placasAjustadas} placa${placasAjustadas > 1 ? 's' : ''}`
            )
          }
          if (chassisAjustados > 0) {
            detalhes.push(
              `${chassisAjustados} chassi${chassisAjustados > 1 ? 's' : ''}`
            )
          }

          showToast.info(
            `${detalhes.join(' e ')} com formato inválido (hífen, espaço ou ponto) ` +
              `${totalAjustes > 1 ? 'foram limpos' : 'foi limpo'} automaticamente.`
          )
        }

        // ---- 5. Envia pro backend ----
        setProgresso((prev) =>
          prev
            ? {
                ...prev,
                total: veiculos.length,
                itemAtual: 'Enviando lote pro servidor...',
              }
            : prev
        )

        const resposta = await processarLoteDetran({
          nomeArquivo: file.name,
          veiculos,
        })

        setProgresso((prev) =>
          prev
            ? {
                ...prev,
                loteId: String(resposta.loteId),
                total: resposta.totalVeiculos,
                itemAtual: 'Aguardando processamento...',
              }
            : prev
        )

        iniciarPolling(resposta.loteId)
      } catch (error: any) {
        console.error('[useLoteDetran] Erro ao processar arquivo:', error)
        showToast.error(error?.message || 'Erro ao processar o lote.')
        setProcessando(false)
        setProgresso(null)
        pararPolling()
      }
    },
    [iniciarPolling, pararPolling]
  )

  const fechar = useCallback(() => {
    pararPolling()
    setProgresso(null)
    setProcessando(false)
  }, [pararPolling])

  useEffect(() => () => pararPolling(), [pararPolling])

  return { processarArquivo, progresso, processando, fechar }
}