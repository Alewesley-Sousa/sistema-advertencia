// apps/detran/src/main/domains/detran/automacao/veiculosSchema.ts
//
// Validação da lista de veículos enviada para o cofre da automação semanal.

import { z } from 'zod'
import { normalizarIdentificador } from '../utils'

export const MAX_VEICULOS_COFRE = 2000

const identificador = (rotulo: string, min: number, max: number) =>
  z
    .string()
    .transform((v) => normalizarIdentificador(v))
    .refine((v) => v.length >= min && v.length <= max, { message: `${rotulo} inválido.` })

export const veiculoCofreSchema = z.object({
  placa: identificador('Placa', 7, 7),
  // Chassi/RENAVAM: o scraper aceita o identificador informado na planilha.
  chassi: identificador('Chassi', 6, 20),
  modelo: z.string().trim().max(80).optional(),
  contrato: z.string().trim().max(80).optional(),
})

export type VeiculoCofre = z.infer<typeof veiculoCofreSchema>

export const listaVeiculosSchema = z
  .array(z.unknown())
  .min(1, 'Envie ao menos um veículo.')
  .max(MAX_VEICULOS_COFRE, `Máximo de ${MAX_VEICULOS_COFRE} veículos por lista.`)

export interface ResultadoLista {
  veiculos: VeiculoCofre[]
  /** Linhas descartadas (só o número da linha — nunca o conteúdo). */
  rejeitadas: Array<{ linha: number; motivo: string }>
  duplicadas: number
}

/** Valida linha a linha, descarta inválidas e remove placas duplicadas. */
export function validarListaVeiculos(entrada: unknown): ResultadoLista {
  const lista = listaVeiculosSchema.safeParse(entrada)
  if (!lista.success) {
    throw new Error(lista.error.issues[0]?.message || 'Lista de veículos inválida.')
  }

  const veiculos: VeiculoCofre[] = []
  const rejeitadas: ResultadoLista['rejeitadas'] = []
  const vistas = new Set<string>()
  let duplicadas = 0

  lista.data.forEach((item, i) => {
    const r = veiculoCofreSchema.safeParse(item)
    if (!r.success) {
      rejeitadas.push({ linha: i + 1, motivo: r.error.issues[0]?.message || 'Linha inválida.' })
      return
    }
    const v = {
      ...r.data,
      modelo: r.data.modelo || undefined,
      contrato: r.data.contrato || undefined,
    }
    if (vistas.has(v.placa)) {
      duplicadas++
      return
    }
    vistas.add(v.placa)
    veiculos.push(v)
  })

  if (veiculos.length === 0) {
    throw new Error('Nenhum veículo válido na lista (verifique placa e chassi).')
  }
  return { veiculos, rejeitadas, duplicadas }
}
