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
import { periodoDaSemana } from './periodoSemana'
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

/* ---- progresso (lido pela API de status; sem dados sensíveis) ---- */

export type FaseRotina = 'CARREGANDO' | 'CONSULTANDO' | 'GERANDO_PDF' | 'ENVIANDO_EMAIL'

export interface ProgressoRotina {
  fase: FaseRotina
  processados: number
  total: number
  /** 0–100 */
  percentual: number
  /** true quando é só reenvio (sem nova consulta ao DETRAN). */
  reenvio: boolean
}

let estado: { fase: FaseRotina; total: number; loteId: number | null; reenvio: boolean } | null = null

export function progressoRotina(): ProgressoRotina | null {
  if (!estado) return null
  const { fase, total, loteId, reenvio } = estado
  const processados = fase === 'CONSULTANDO' && loteId != null ? automacaoRepository.lerProcessadosLote(loteId) : fase === 'CARREGANDO' ? 0 : total
  let percentual: number
  if (reenvio) percentual = fase === 'GERANDO_PDF' ? 40 : fase === 'ENVIANDO_EMAIL' ? 80 : 5
  else if (fase === 'CARREGANDO') percentual = 2
  else if (fase === 'CONSULTANDO') percentual = total > 0 ? Math.min(85, Math.floor((processados / total) * 85)) : 0
  else percentual = fase === 'GERANDO_PDF' ? 90 : 96
  return { fase, processados, total, percentual, reenvio }
}

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
    const mail = montarEmailFalha({ dataTexto, motivo, temLogo: config.email.embutirImagens && !!lerImagensEmail().logo })
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


interface ConsultasSalvas {
  ids: number[]
  comErro: number
}

/** Procura, no banco, a última consulta de cada veículo da lista (não acessa o DETRAN). */
function consultasSalvas(veiculos: Array<{ placa: string; chassi: string }>): ConsultasSalvas {
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
  return { ids, comErro }
}

/**
 * Etapas finais, comuns à rodada completa e ao reenvio:
 * resultado por veículo → PDF → e-mail.
 */
async function gerarPdfEEnviar(
  config: ConfigAutomacao,
  veiculos: Array<{ placa: string; chassi: string }>,
  dataTexto: string,
  encerrar: (r: ResultadoRotina) => ResultadoRotina
): Promise<ResultadoRotina> {
  const { ids, comErro } = consultasSalvas(veiculos)
  const total = veiculos.length

  if (ids.length === 0 || comErro === total) {
    const motivo = estado?.reenvio
      ? 'Não há consultas salvas para reenviar. Execute a automação primeiro.'
      : 'Nenhum veículo pôde ser consultado no DETRAN-CE (portal indisponível ou bloqueio).'
    const enviado = estado?.reenvio ? false : await enviarAlertaFalha(config, dataTexto, motivo)
    return encerrar({ status: 'FALHA', totalVeiculos: total, comErro, emailEnviado: enviado, mensagem: motivo })
  }

  /* PDF */
  if (estado) estado.fase = 'GERANDO_PDF'
  const configPdf: RelatorioPdfConfig = {
    ...CONFIG_PADRAO_RELATORIO,
    origem: 'AUTOMACAO',
    selecao: { modo: 'IDS', ids },
    ordenacaoVeiculos: 'VALOR_DESC',
    titulo: 'Relatório semanal de multas e débitos',
    // Detalhamento só com as multas da semana (sábado → hoje), sem veículos sem multa
    periodoMultas: periodoDaSemana(config.timezone),
  }

  let pdf
  try {
    pdf = await gerarRelatorioPdf(configPdf)
  } catch (e) {
    const motivo = `Falha ao gerar o PDF: ${mensagemSegura(e)}`
    const enviado = estado?.reenvio ? false : await enviarAlertaFalha(config, dataTexto, motivo)
    return encerrar({ status: 'FALHA', totalVeiculos: total, comErro, emailEnviado: enviado, mensagem: motivo })
  }

  const { veiculos: regs, multas } = detranRepository.listarVeiculosParaRelatorio({ modo: 'IDS', ids })
  const previa = calcularPrevia(configPdf, regs, multas)

  /* E-mail */
  if (estado) estado.fase = 'ENVIANDO_EMAIL'
  const imagens = lerImagensEmail()
  const dados: DadosEmailRelatorio = {
    dataTexto,
    totalVeiculos: previa.veiculos,
    veiculosComMultas: previa.veiculosComMultasAtivas,
    multasAtivas: previa.multasAtivas,
    valorTotal: brl.format(previa.valorTotalMultas),
    consultasComErro: comErro,
    temLogo: config.email.embutirImagens && !!imagens.logo,
    temGif: config.email.embutirImagens && !!imagens.gif,
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
    return encerrar({ status: 'FALHA', totalVeiculos: total, comErro, emailEnviado: false, mensagem: mensagemSegura(e) })
  }

  const reenvio = estado?.reenvio ? 'Reenvio com os dados da última consulta (sem nova busca no DETRAN). ' : ''
  return encerrar({
    status: comErro > 0 ? 'PARCIAL' : 'CONCLUIDA',
    totalVeiculos: total,
    comErro,
    emailEnviado: true,
    mensagem: reenvio + (comErro > 0 ? `${comErro} veículo(s) não puderam ser consultados.` : '') || undefined,
  })
}

async function executar(
  config: ConfigAutomacao,
  origem: OrigemExecucao,
  reenvio: boolean
): Promise<ResultadoRotina> {
  if (emExecucao) {
    throw new Error('Já existe uma execução da automação em andamento.')
  }
  emExecucao = true
  estado = { fase: 'CARREGANDO', total: 0, loteId: null, reenvio }

  const dataTexto = new Date().toLocaleDateString('pt-BR', { timeZone: config.timezone })
  let execucaoId: number | null = null
  const rotulo = reenvio ? 'Reenvio' : `Rodada ${origem}`

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
      `[Automação] ${rotulo} finalizado: ${r.status} — ${r.totalVeiculos} veículo(s), ${r.comErro} com erro, e-mail ${r.emailEnviado ? 'enviado' : 'não enviado'}.`
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
      const enviado = reenvio ? false : await enviarAlertaFalha(config, dataTexto, motivo)
      return encerrar({ status: 'FALHA', totalVeiculos: 0, comErro: 0, emailEnviado: enviado, mensagem: motivo })
    }

    execucaoId = automacaoRepository.iniciarExecucao(origem, veiculos.length)
    estado.total = veiculos.length

    /* 2. Consulta DETRAN-CE (pulada no reenvio) */
    if (!reenvio) {
      console.log(`[Automação] ${rotulo} iniciada — ${veiculos.length} veículo(s), concorrência ${config.concorrencia}.`)
      const loteId = detranRepository.criarLote(`Automação semanal ${dataTexto}`, veiculos.length)
      estado.fase = 'CONSULTANDO'
      estado.loteId = loteId
      await processarFilaLote(loteId, veiculos, config.concorrencia)
    } else {
      console.log(`[Automação] Reenvio iniciado — ${veiculos.length} veículo(s), sem nova consulta.`)
    }

    /* 3. PDF + e-mail */
    return await gerarPdfEEnviar(config, veiculos, dataTexto, encerrar)
  } catch (e) {
    const motivo = mensagemSegura(e)
    console.error('[Automação] Erro inesperado:', motivo)
    return encerrar({ status: 'FALHA', totalVeiculos: 0, comErro: 0, emailEnviado: false, mensagem: motivo })
  } finally {
    emExecucao = false
    estado = null
  }
}

/** Rodada completa: consulta o DETRAN-CE, gera o PDF e envia. */
export function executarRotinaSemanal(config: ConfigAutomacao, origem: OrigemExecucao): Promise<ResultadoRotina> {
  return executar(config, origem, false)
}

/** Reenvia o relatório com os dados já consultados — NÃO acessa o DETRAN-CE. */
export function reenviarRelatorio(config: ConfigAutomacao): Promise<ResultadoRotina> {
  return executar(config, 'MANUAL', true)
}
