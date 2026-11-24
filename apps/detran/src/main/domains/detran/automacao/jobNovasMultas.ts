// apps/detran/src/main/domains/detran/automacao/jobNovasMultas.ts
//
// Rodada do job de multas novas: lista (cofre) -> consulta o DETRAN-CE -> apura -> e-mail.

import os from 'node:os'

import { db } from '../../../database/db'
import { detranRepository } from '../repositories/detranRepository'
import { processarFilaLote } from '../services/detranService'

import { mascararPlaca } from './automacaoConfig'
import { enviarEmail, lerImagensEmail } from './emailService'
import { montarEmailFalhaNovasMultas } from './emailNovasMultas'
import type { ConfigNovasMultas } from './novasMultasConfig'
import { apurarEEnviar } from './novasMultasCore'
import { criarNovasMultasRepo, type OrigemNovasMultas, type StatusNovasMultas } from './novasMultasRepository'
import { travaRotinas } from './travaRotinas'
import { carregarVeiculos } from './veiculosCofreService'

export const novasMultasRepo = criarNovasMultasRepo(db as any)

const NOME_TRAVA = 'NOVAS_MULTAS'
let emExecucao = false

export function novasMultasEmExecucao(): boolean {
  return emExecucao
}

export interface ResultadoNovasMultas {
  status: StatusNovasMultas
  totalVeiculos: number
  comErro: number
  novas: number
  emailEnviado: boolean
  mensagem?: string
}

function mensagemSegura(err: unknown): string {
  const msg = (err as any)?.message
  return typeof msg === 'string' && msg.length < 200 && !/[\\/]\w+\.(sqlite|db)/i.test(msg)
    ? msg
    : 'Erro inesperado (veja o log do servidor).'
}

export async function executarNovasMultas(
  config: ConfigNovasMultas,
  origem: OrigemNovasMultas,
  executor: string = `Agendador (${os.hostname()})`
): Promise<ResultadoNovasMultas> {
  if (!travaRotinas.adquirir(NOME_TRAVA)) {
    const quem = travaRotinas.ocupadaPor()
    throw new Error(quem === NOME_TRAVA ? 'A verificação de multas novas já está em andamento.' : 'Outra rotina (relatório semanal) está em andamento.')
  }
  emExecucao = true

  const dataTexto = new Date().toLocaleDateString('pt-BR', { timeZone: config.timezone })
  let execucaoId: number | null = null

  const encerrar = (r: ResultadoNovasMultas): ResultadoNovasMultas => {
    if (execucaoId != null) {
      novasMultasRepo.finalizarExecucao(execucaoId, {
        status: r.status, comErro: r.comErro, novas: r.novas, emailEnviado: r.emailEnviado, mensagem: r.mensagem,
      })
    }
    console.log(
      `[NovasMultas] Finalizado: ${r.status} — ${r.totalVeiculos} veículo(s), ${r.comErro} com erro, ${r.novas} multa(s) nova(s), e-mail ${r.emailEnviado ? 'enviado' : 'não enviado'}.`
    )
    return r
  }

  const alerta = async (motivo: string) => {
    if (origem !== 'AGENDADA') return // manual: o erro já aparece na tela
    try {
      const mail = montarEmailFalhaNovasMultas({ dataTexto, motivo, temLogo: config.base.email.embutirImagens && !!lerImagensEmail().logo })
      await enviarEmail(config.base, { ...mail, para: config.alerta, embutirImagens: true })
    } catch (e) {
      console.error('[NovasMultas] Também não foi possível enviar o alerta de falha:', mensagemSegura(e))
    }
  }

  try {
    let veiculos
    try {
      veiculos = carregarVeiculos()
    } catch (e) {
      const motivo = mensagemSegura(e)
      execucaoId = novasMultasRepo.iniciarExecucao(origem, 0, executor)
      await alerta(motivo)
      return encerrar({ status: 'FALHA', totalVeiculos: 0, comErro: 0, novas: 0, emailEnviado: false, mensagem: motivo })
    }

    execucaoId = novasMultasRepo.iniciarExecucao(origem, veiculos.length, executor)
    console.log(`[NovasMultas] Iniciada — ${veiculos.length} veículo(s).`)

    const loteId = detranRepository.criarLote(`Multas novas ${dataTexto}`, veiculos.length)
    await processarFilaLote(loteId, veiculos, config.base.concorrencia)

    // consulta deste ciclo deu certo?
    const statusPorPlaca = new Map<string, boolean>()
    for (const v of veiculos) {
      const c = detranRepository.buscarPorPlacaChassi(v.placa, v.chassi)
      statusPorPlaca.set(v.placa.toUpperCase().trim(), !!c && c.status_consulta !== 'ERRO' && c.status_consulta !== 'PROCESSANDO')
    }

    if (veiculos.length > 0 && [...statusPorPlaca.values()].every((ok) => !ok)) {
      const motivo = 'Nenhum veículo pôde ser consultado no DETRAN-CE (portal indisponível ou bloqueio).'
      await alerta(motivo)
      return encerrar({ status: 'FALHA', totalVeiculos: veiculos.length, comErro: veiculos.length, novas: 0, emailEnviado: false, mensagem: motivo })
    }

    const imagens = config.base.email.embutirImagens ? lerImagensEmail() : { logo: null, gif: null }
    const r = await apurarEEnviar({
      veiculos,
      consultaOk: (p) => statusPorPlaca.get(p) === true,
      repo: novasMultasRepo,
      dataTexto,
      execucaoId,
      temLogo: !!imagens.logo,
      enviar: (mail) => enviarEmail(config.base, { ...mail, para: config.para, cc: config.cc, embutirImagens: true }),
    })

    const partes: string[] = []
    if (r.erroEmail) partes.push(`Falha ao enviar o e-mail (${r.novas} multa(s) seguem pendentes): ${r.erroEmail}`)
    else if (r.novas > 0) partes.push(`${r.novas} multa(s) nova(s) avisada(s).`)
    else partes.push('Nenhuma multa nova.')
    if (r.veiculosNovosNaBase > 0) partes.push(`${r.veiculosNovosNaBase} veículo(s) novo(s) na base (${r.multasEmBaseline} multa(s) existente(s) marcadas sem aviso).`)
    if (r.comErro > 0) partes.push(`${r.comErro} veículo(s) não puderam ser consultados.`)

    return encerrar({
      status: r.erroEmail ? 'FALHA' : r.comErro > 0 ? 'PARCIAL' : 'CONCLUIDA',
      totalVeiculos: veiculos.length,
      comErro: r.comErro,
      novas: r.novas,
      emailEnviado: r.emailEnviado,
      mensagem: partes.join(' '),
    })
  } catch (e) {
    const motivo = mensagemSegura(e)
    console.error('[NovasMultas] Erro inesperado:', motivo)
    return encerrar({ status: 'FALHA', totalVeiculos: 0, comErro: 0, novas: 0, emailEnviado: false, mensagem: motivo })
  } finally {
    emExecucao = false
    travaRotinas.liberar(NOME_TRAVA)
  }
}

export { mascararPlaca }
