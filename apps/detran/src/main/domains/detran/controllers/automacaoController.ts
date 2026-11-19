/**
 * Handlers HTTP da automação semanal. Nenhum endpoint devolve placas, chassis,
 * e-mails ou chaves: só contagens e o histórico de execuções.
 */

import { NextFunction, Request, Response } from 'express'

import { sendResponse } from '../../../shared/utils/response'
import { automacaoRepository } from '../automacao/automacaoRepository'
import { ErroCofre } from '../automacao/cofre'
import { apagarVeiculos, estadoCofre, importarVeiculos } from '../automacao/veiculosCofreService'
import { executarRotinaSemanal, rotinaEmExecucao } from '../automacao/jobSemanal'
import { automacaoAgendada, configAutomacaoAtiva } from '../automacao/scheduler'

export function statusAutomacao(_req: Request, res: Response, next: NextFunction) {
  try {
    const config = configAutomacaoAtiva()
    sendResponse.success(res, {
      agendada: automacaoAgendada(),
      cron: config?.cron ?? null,
      timezone: config?.timezone ?? null,
      emExecucao: rotinaEmExecucao(),
      cofre: estadoCofre(),
      execucoes: automacaoRepository.listarExecucoes(10),
    })
  } catch (error) {
    next(error)
  }
}

export function importarVeiculosAutomacao(req: Request, res: Response, next: NextFunction) {
  try {
    const resumo = importarVeiculos(req.body?.veiculos)
    sendResponse.success(res, resumo)
  } catch (error) {
    if (error instanceof ErroCofre) {
      const status = error.codigo === 'CHAVE_AUSENTE' || error.codigo === 'CHAVE_INVALIDA' ? 503 : 500
      return sendResponse.error(res, error.message, status, `COFRE_${error.codigo}`)
    }
    if (error instanceof Error && /veículo|Veículo|lista|Lista|Máximo|Envie/.test(error.message)) {
      return sendResponse.validationError(res, error.message, [{ field: 'veiculos', message: error.message }])
    }
    next(error)
  }
}

export function apagarVeiculosAutomacao(_req: Request, res: Response, next: NextFunction) {
  try {
    apagarVeiculos()
    sendResponse.success(res, { removido: true })
  } catch (error) {
    next(error)
  }
}

export function executarAutomacaoAgora(_req: Request, res: Response) {
  const config = configAutomacaoAtiva()
  if (!config) {
    return sendResponse.error(
      res,
      'Automação desligada ou com configuração inválida (veja o log do servidor).',
      409,
      'AUTOMACAO_INATIVA'
    )
  }
  if (rotinaEmExecucao()) {
    return sendResponse.error(res, 'Já existe uma execução em andamento.', 409, 'AUTOMACAO_EM_ANDAMENTO')
  }

  executarRotinaSemanal(config, 'MANUAL').catch((e: any) =>
    console.error('[Automação] Rodada manual falhou:', e?.message)
  )
  return sendResponse.success(res, { message: 'Execução iniciada. Acompanhe pelo histórico.' }, 202)
}
