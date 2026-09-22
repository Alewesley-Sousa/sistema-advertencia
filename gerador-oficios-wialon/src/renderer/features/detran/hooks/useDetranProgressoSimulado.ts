// src/renderer/features/detran/hooks/useDetranProgressoSimulado.ts

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DetranProgresso, ProgressoItem, ProgressoItemStatus } from '../types'

/* ---------- Geração de dados fake ---------- */

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITOS = '0123456789'

function letraAleatoria() {
  return LETRAS[Math.floor(Math.random() * LETRAS.length)]
}
function digitoAleatorio() {
  return DIGITOS[Math.floor(Math.random() * DIGITOS.length)]
}

/** Placa no padrão Mercosul: ABC1D23 */
function gerarPlaca(): string {
  return (
    letraAleatoria() +
    letraAleatoria() +
    letraAleatoria() +
    digitoAleatorio() +
    letraAleatoria() +
    digitoAleatorio() +
    digitoAleatorio()
  )
}

/** Sorteia o status e a mensagem de contexto */
function gerarResultado(): { status: ProgressoItemStatus; mensagem: string } {
  const r = Math.random()
  if (r < 0.75) {
    const n = 1 + Math.floor(Math.random() * 4)
    return { status: 'ok', mensagem: `${n} multa${n > 1 ? 's' : ''} baixada${n > 1 ? 's' : ''}` }
  }
  if (r < 0.9) {
    return { status: 'erro', mensagem: 'DETRAN recusou emissão' }
  }
  if (r < 0.97) {
    return { status: 'pulado', mensagem: 'Já baixada' }
  }
  return { status: 'ok', mensagem: 'Sem multas' }
}

/* ---------- Hook ---------- */

interface UseDetranProgressoSimuladoOptions {
  /** Quantos veículos serão simulados (default 10) */
  total?: number
  /** Intervalo entre cada item em ms (default 1200) */
  intervalMs?: number
}

export function useDetranProgressoSimulado({
  total = 10,
  intervalMs = 1200,
}: UseDetranProgressoSimuladoOptions = {}) {
  const [progresso, setProgresso] = useState<DetranProgresso | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const parar = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const fechar = useCallback(() => {
    parar()
    setProgresso(null)
  }, [parar])

  const cancelar = useCallback(() => {
    parar()
    setProgresso((p) =>
      p ? { ...p, status: 'CANCELADO', itemAtual: 'Cancelado pelo usuário' } : null
    )
  }, [parar])

  const iniciar = useCallback(() => {
    parar()

    // Pré-gera todas as placas pra manter consistência caso o user reabra
    const placas = Array.from({ length: total }, () => gerarPlaca())

    setProgresso({
      loteId: `SIM-${Date.now()}`,
      processados: 0,
      total,
      percentual: 0,
      itemAtual: 'Iniciando...',
      status: 'PROCESSANDO',
      itens: [],
      variante: 'simulacao',
    })

    let idx = 0

    timerRef.current = setInterval(() => {
      if (idx >= total) {
        parar()
        setProgresso((p) =>
          p
            ? {
                ...p,
                status: 'CONCLUIDO',
                processados: total,
                percentual: 100,
                itemAtual: 'Concluído',
              }
            : null
        )
        return
      }

      const placa = placas[idx]
      const { status: statusItem, mensagem } = gerarResultado()

      const item: ProgressoItem = { placa, status: statusItem, mensagem }
      idx++

      setProgresso((p) =>
        p
          ? {
              ...p,
              processados: idx,
              percentual: Math.round((idx / total) * 100),
              itemAtual: placa,
              itens: [...(p.itens ?? []), item],
            }
          : null
      )
    }, intervalMs)
  }, [parar, total, intervalMs])

  // Limpa timer ao desmontar
  useEffect(() => () => parar(), [parar])

  return { progresso, iniciar, cancelar, fechar }
}