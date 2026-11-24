/**
 * Handlers HTTP do job de multas novas e do controle manual de "avisada / não avisada".
 * Nenhum endpoint devolve chassi, e-mails ou chaves.
 */

import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'

import { sendResponse } from '../../../shared/utils/response'
import { descreverExecutor } from '../../../seguranca/middlewares'
import { estadoCofre } from '../automacao/veiculosCofreService'
import { executarNovasMultas, novasMultasEmExecucao, novasMultasRepo } from '../automacao/jobNovasMultas'
import { configNovasMultasAtiva, proximaVerificacao } from '../automacao/schedulerNovasMultas'
import { travaRotinas } from '../automacao/travaRotinas'

export function statusNovasMultas(_req: Request, res: Response, next: NextFunction) {
  try {
    const c = configNovasMultasAtiva()
    sendResponse.success(res, {
      ativa: c != null,
      intervaloHoras: c?.intervaloHoras ?? null,
      horario: c?.horario ?? null,
      timezone: c?.timezone ?? null,
      proxima: proximaVerificacao()?.toISOString() ?? null,
      emExecucao: novasMultasEmExecucao(),
      pendentes: novasMultasRepo.contarPendentes(),
      cofre: estadoCofre(),
      execucoes: novasMultasRepo.listarExecucoes(10),
    })
  } catch (error) {
    next(error)
  }
}

export function listarPendentesNovasMultas(_req: Request, res: Response, next: NextFunction) {
  try {
    sendResponse.success(res, novasMultasRepo.listarPendentes({ limite: 2000 }))
  } catch (error) {
    next(error)
  }
}

const idsSchema = z.array(z.number().int().positive()).min(1).max(5000)
const marcarSchema = z.union([
  z.object({ acao: z.literal('MARCAR'), ids: idsSchema }),
  z.object({ acao: z.literal('MARCAR'), todasPendentes: z.literal(true) }),
  z.object({ acao: z.literal('DESMARCAR'), ids: idsSchema }),
])

export function marcarNovasMultas(req: Request, res: Response, next: NextFunction) {
  try {
    const r = marcarSchema.safeParse(req.body)
    if (!r.success) {
      return sendResponse.validationError(res, 'Informe a ação (MARCAR ou DESMARCAR) e os ids, ou todasPendentes.', [
        { field: 'body', message: 'Corpo inválido.' },
      ])
    }
    const quem = `MANUAL: ${descreverExecutor(res)}`
    const d = r.data
    let alteradas: number
    if (d.acao === 'DESMARCAR') alteradas = novasMultasRepo.desmarcar(d.ids)
    else if ('todasPendentes' in d) alteradas = novasMultasRepo.marcarTodasPendentes(quem)
    else alteradas = novasMultasRepo.marcarNotificadas(d.ids, quem)
    sendResponse.success(res, { alteradas, pendentes: novasMultasRepo.contarPendentes() })
  } catch (error) {
    next(error)
  }
}

export function executarNovasMultasAgora(_req: Request, res: Response) {
  const c = configNovasMultasAtiva()
  if (!c) {
    return sendResponse.error(res, 'Verificação de multas novas desligada ou com configuração inválida (veja o log do servidor).', 409, 'NOVAS_MULTAS_INATIVA')
  }
  if (travaRotinas.ocupadaPor()) {
    return sendResponse.error(res, 'Já existe uma rotina em andamento. Aguarde terminar.', 409, 'ROTINA_EM_ANDAMENTO')
  }
  const executor = descreverExecutor(res)
  executarNovasMultas(c, 'MANUAL', executor).catch((e: any) => console.error('[NovasMultas] Rodada manual falhou:', e?.message))
  return sendResponse.success(res, { message: 'Verificação iniciada. Acompanhe pelo histórico.' }, 202)
}
