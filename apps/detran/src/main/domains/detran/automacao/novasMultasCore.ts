// apps/detran/src/main/domains/detran/automacao/novasMultasCore.ts
//
// Núcleo do job (sem rede e sem banco real — dependências injetadas, testável):
//   1. veículo novo na lista -> baseline: as multas que já existem são marcadas em silêncio (BASE);
//   2. multas ATIVAS ainda sem aviso dos veículos consultados com sucesso = "novas";
//   3. e-mail resumo; SÓ se o envio der certo as multas são marcadas como avisadas.

import { montarEmailNovasMultas } from './emailNovasMultas'
import type { NovasMultasRepo } from './novasMultasRepository'

export interface VeiculoLista {
  placa: string
}

export interface EntradaApuracao {
  veiculos: VeiculoLista[]
  /** Resultado da consulta de cada placa nesta rodada. */
  consultaOk: (placa: string) => boolean
  repo: NovasMultasRepo
  enviar: (mail: { assunto: string; html: string; texto: string }) => Promise<void>
  dataTexto: string
  execucaoId: number
  temLogo: boolean
}

export interface ResultadoApuracao {
  novas: number
  comErro: number
  veiculosNovosNaBase: number
  multasEmBaseline: number
  emailEnviado: boolean
  erroEmail?: string
}

export async function apurarEEnviar(e: EntradaApuracao): Promise<ResultadoApuracao> {
  const placas = [...new Set(e.veiculos.map((v) => v.placa.toUpperCase().trim()))]
  const ok = placas.filter((p) => e.consultaOk(p))
  const comErro = placas.length - ok.length

  // 1. baseline dos veículos que ainda não passaram por aqui (só se a consulta deu certo)
  const jaBase = e.repo.placasComBaseline()
  let veiculosNovosNaBase = 0
  let multasEmBaseline = 0
  for (const p of ok) {
    if (!jaBase.has(p)) {
      multasEmBaseline += e.repo.fazerBaseline(p)
      veiculosNovosNaBase++
    }
  }

  // 2. multas novas
  const pendentes = e.repo.listarPendentes({ placas: ok })
  const base = { comErro, veiculosNovosNaBase, multasEmBaseline }
  if (pendentes.length === 0) return { ...base, novas: 0, emailEnviado: false }

  // 3. e-mail -> marcação
  const mail = montarEmailNovasMultas({ dataTexto: e.dataTexto, multas: pendentes, naoVerificados: comErro, temLogo: e.temLogo })
  try {
    await e.enviar(mail)
  } catch (err) {
    // Nada é marcado: as mesmas multas saem na próxima rodada.
    return { ...base, novas: pendentes.length, emailEnviado: false, erroEmail: (err as Error)?.message ?? 'falha no envio' }
  }
  e.repo.marcarNotificadas(pendentes.map((m) => m.id), `EMAIL #${e.execucaoId}`)
  return { ...base, novas: pendentes.length, emailEnviado: true }
}
