// apps/detran/src/main/domains/detran/automacao/veiculosCofreService.ts
//
// Importa, guarda (cifrado) e lê a lista de veículos da automação semanal.
// A lista em claro só existe em memória, durante a validação e durante a execução do job.

import { carregarChaves, cifrar, decifrar, ErroCofre } from './cofre'
import { automacaoRepository } from './automacaoRepository'
import { validarListaVeiculos, type VeiculoCofre } from './veiculosSchema'

export interface ResumoImportacao {
  total: number
  rejeitadas: number
  duplicadas: number
}

export function importarVeiculos(entrada: unknown): ResumoImportacao {
  const { veiculos, rejeitadas, duplicadas } = validarListaVeiculos(entrada)
  const chaves = carregarChaves()
  const blob = cifrar(JSON.stringify(veiculos), chaves)
  automacaoRepository.salvarCofre(blob, veiculos.length)
  return { total: veiculos.length, rejeitadas: rejeitadas.length, duplicadas }
}

/** Lê e decifra. Se só a chave anterior abriu, regrava com a atual (rotação transparente). */
export function carregarVeiculos(): VeiculoCofre[] {
  const registro = automacaoRepository.lerCofre()
  if (!registro) throw new ErroCofre('Nenhuma lista de veículos foi importada ainda.', 'FORMATO_INVALIDO')

  const chaves = carregarChaves()
  const { texto, usouChaveAnterior } = decifrar(registro.payloadCifrado, chaves)
  const veiculos = JSON.parse(texto) as VeiculoCofre[]

  if (usouChaveAnterior) {
    automacaoRepository.salvarCofre(cifrar(texto, chaves), veiculos.length)
  }
  return veiculos
}

/** Estado sem expor nenhum dado: só se existe lista, quantos itens e quando mudou. */
export function estadoCofre() {
  const registro = automacaoRepository.lerCofre()
  return registro
    ? { existe: true, total: registro.totalVeiculos, atualizadoEm: registro.atualizadoEm }
    : { existe: false, total: 0, atualizadoEm: null }
}

export function apagarVeiculos() {
  automacaoRepository.apagarCofre()
}
