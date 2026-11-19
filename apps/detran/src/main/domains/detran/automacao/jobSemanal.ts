// apps/detran/src/main/domains/detran/automacao/jobSemanal.ts
//
// Rotina semanal: decifra a lista → consulta o DETRAN-CE → gera o PDF → envia por e-mail.
//
// Resiliência:
//  - falha em um veículo não derruba a rodada (processarFilaLote registra ERRO por item);
//  - o PDF sai mesmo com falhas parciais, e o e-mail avisa quantos falharam;
//  - falha total (cofre ilegível, todas as consultas com erro, PDF) gera e-mail de alerta;
//  - trava em memória impede duas rodadas simultâneas (agendada + manual);
//  - nada sensível é logado: placas só mascaradas, e-mails mascarados, sem chassi.

import { detranRepository } from '../repositories/detranRepository'
import { processarFilaLote } from '../services/detranService'
import { gerarRelatorioPdf } from '../relatorio/relatorioPdfService'
import { calcularPrevia } from '../relatorio/relatorioModelo'
import { CONFIG_PADRAO_RELATORIO, type RelatorioPdfConfig } from '../../../../shared/relatorioContrato'

import { automacaoRepository, type OrigemExecucao, type StatusExecucao } from './automacaoRepository'
import type { ConfigAutomacao } from './automacaoConfig'
import { carregarVeiculos } from './veiculosCofreService'
import { enviarEmail, lerImagensEmail } from './emailService'
import { montarEmailFalha, montarEmailRelatorio, type DadosEmailRelatorio } from './emailTemplate'

export interface ResultadoRotina {
  status: StatusExecucao
  totalVeiculos: number
  comErro: number
  emailEnviado: boolean
  mensagem?: string
}

let emExecucao = false

export function rotinaEmExecucao(): boolean {
  return emExecucao
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function mensagemSegura(err: unknown): string {
  // Só o texto da nossa própria camada; erros desconhecidos viram mensagem genérica.
  const msg = (err as any)?.message
  return typeof msg === 'string' && msg.length < 200 && !/[\\/]\w+\.(sqlite|db)/i.test(msg)
    ? msg
    : 'Erro inesperado (veja o log do servidor).'
}

async function enviarAlertaFalha(config: ConfigAutomacao, dataTexto: string, motivo: string): Promise<boolean> {
  try {
    const mail = montarEmailFalha({ dataTexto, motivo, temLogo: !!lerImagensEmail().logo })
    await enviarEmail(config, {
      assunto: mail.assunto,
      html: mail.html,
      texto: mail.texto,
      para: config.email.alerta,
      embutirImagens: true,
    })
    return true
  } catch (e) {
    console.error('[Automação] Também não foi possível enviar o alerta de falha:', mensagemSegura(e))
    return false
  }
}

export async function executarRotinaSemanal(config: ConfigAutomacao, origem: OrigemExecucao): Promise<ResultadoRotina> {
  if (emExecucao) {
    throw new Error('Já existe uma execução da automação em andamento.')
  }
  emExecucao = true

  const agora = new Date()
  const dataTexto = agora.toLocaleDateString('pt-BR', { timeZone: config.timezone })
  let execucaoId: number | null = null

  const encerrar = (r: ResultadoRotina): ResultadoRotina => {
    if (execucaoId != null) {
      automacaoRepository.finalizarExecucao(execucaoId, {
        status: r.status,
        comErro: r.comErro,
        emailEnviado: r.emailEnviado,
        mensagem: r.mensagem,
      })
    }
    console.log(
      `[Automação] Rodada ${origem} finalizada: ${r.status} — ${r.totalVeiculos} veículo(s), ${r.comErro} com erro, e-mail ${r.emailEnviado ? 'enviado' : 'não enviado'}.`
    )
    return r
  }

  try {
    /* 1. Cofre */
    let veiculos
    try {
      veiculos = carregarVeiculos()
    } catch (e) {
      const motivo = mensagemSegura(e)
      execucaoId = automacaoRepository.iniciarExecucao(origem, 0)
      const enviado = await enviarAlertaFalha(config, dataTexto, motivo)
      return encerrar({ status: 'FALHA', totalVeiculos: 0, comErro: 0, emailEnviado: enviado, mensagem: motivo })
    }

    execucaoId = automacaoRepository.iniciarExecucao(origem, veiculos.length)
    console.log(`[Automação] Rodada ${origem} iniciada — ${veiculos.length} veículo(s), concorrência ${config.concorrencia}.`)

    /* 2. Consulta DETRAN-CE (throttling = concorrência 1 ou 2, igual ao lote manual) */
    const loteId = detranRepository.criarLote(`Automação semanal ${dataTexto}`, veiculos.length)
    await processarFilaLote(loteId, veiculos, config.concorrencia)

    /* 3. Resultado por veículo */
    const ids: number[] = []
    let comErro = 0
    for (const v of veiculos) {
      const consulta = detranRepository.buscarPorPlacaChassi(v.placa, v.chassi)
      if (!consulta) {
        comErro++
        continue
      }
      ids.push(consulta.id)
      if (consulta.status_consulta === 'ERRO' || consulta.status_consulta === 'PROCESSANDO') comErro++
    }

    if (ids.length === 0 || comErro === veiculos.length) {
      const motivo = 'Nenhum veículo pôde ser consultado no DETRAN-CE (portal indisponível ou bloqueio).'
      const enviado = await enviarAlertaFalha(config, dataTexto, motivo)
      return encerrar({ status: 'FALHA', totalVeiculos: veiculos.length, comErro, emailEnviado: enviado, mensagem: motivo })
    }

    /* 4. PDF */
    const configPdf: RelatorioPdfConfig = {
      ...CONFIG_PADRAO_RELATORIO,
      origem: 'AUTOMACAO',
      selecao: { modo: 'IDS', ids },
      ordenacaoVeiculos: 'VALOR_DESC',
      titulo: 'Relatório semanal de multas e débitos',
    }

    let pdf
    try {
      pdf = await gerarRelatorioPdf(configPdf)
    } catch (e) {
      const motivo = `Falha ao gerar o PDF: ${mensagemSegura(e)}`
      const enviado = await enviarAlertaFalha(config, dataTexto, motivo)
      return encerrar({ status: 'FALHA', totalVeiculos: veiculos.length, comErro, emailEnviado: enviado, mensagem: motivo })
    }

    const { veiculos: regs, multas } = detranRepository.listarVeiculosParaRelatorio({ modo: 'IDS', ids })
    const previa = calcularPrevia(configPdf, regs, multas)

    /* 5. E-mail */
    const imagens = lerImagensEmail()
    const dados: DadosEmailRelatorio = {
      dataTexto,
      totalVeiculos: previa.veiculos,
      veiculosComMultas: previa.veiculosComMultasAtivas,
      multasAtivas: previa.multasAtivas,
      valorTotal: brl.format(previa.valorTotalMultas),
      consultasComErro: comErro,
      temLogo: !!imagens.logo,
      temGif: !!imagens.gif,
    }
    const mail = montarEmailRelatorio(dados)

    try {
      await enviarEmail(config, {
        assunto: mail.assunto,
        html: mail.html,
        texto: mail.texto,
        para: config.email.to,
        cc: config.email.cc,
        anexos: [{ filename: pdf.nomeArquivo, content: pdf.buffer, contentType: 'application/pdf' }],
        embutirImagens: true,
      })
    } catch (e) {
      // O relatório foi gerado mas não chegou: registra como FALHA para ficar visível no histórico.
      return encerrar({
        status: 'FALHA',
        totalVeiculos: veiculos.length,
        comErro,
        emailEnviado: false,
        mensagem: mensagemSegura(e),
      })
    }

    return encerrar({
      status: comErro > 0 ? 'PARCIAL' : 'CONCLUIDA',
      totalVeiculos: veiculos.length,
      comErro,
      emailEnviado: true,
      mensagem: comErro > 0 ? `${comErro} veículo(s) não puderam ser consultados.` : undefined,
    })
  } catch (e) {
    const motivo = mensagemSegura(e)
    console.error('[Automação] Erro inesperado na rodada:', motivo)
    return encerrar({ status: 'FALHA', totalVeiculos: 0, comErro: 0, emailEnviado: false, mensagem: motivo })
  } finally {
    emExecucao = false
  }
}
