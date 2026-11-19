// apps/detran/src/main/domains/detran/automacao/scheduler.ts
//
// Agendamento com node-cron. Expressão padrão: `0 7 * * 5` (sexta-feira, 07:00,
// no fuso DETRAN_AUTOMACAO_TZ — padrão America/Fortaleza). Campos: minuto hora dia mês dia-da-semana.

import cron, { type ScheduledTask } from 'node-cron'

import { automacaoRepository } from './automacaoRepository'
import { carregarConfigAutomacao, ErroConfigAutomacao, type ConfigAutomacao } from './automacaoConfig'
import { executarRotinaSemanal } from './jobSemanal'

let tarefa: ScheduledTask | null = null
let configAtiva: ConfigAutomacao | null = null

/** Chamada na subida do servidor. Nunca derruba o app: configuração ruim só desliga a automação. */
export function iniciarAutomacao(): void {
  try {
    const config = carregarConfigAutomacao()
    if (!config.ativa) {
      console.log('[Automação] Desligada (DETRAN_AUTOMACAO_ATIVA não é "true").')
      return
    }

    automacaoRepository.encerrarExecucoesOrfas()
    configAtiva = config

    tarefa = cron.schedule(
      config.cron,
      () => {
        executarRotinaSemanal(config, 'AGENDADA').catch((e: any) =>
          console.error('[Automação] Rodada agendada não executou:', e?.message)
        )
      },
      { timezone: config.timezone, name: 'detran-relatorio-semanal', noOverlap: true }
    )
    console.log(`[Automação] Agendada: "${config.cron}" (${config.timezone}).`)
  } catch (e) {
    if (e instanceof ErroConfigAutomacao) {
      console.error(`[Automação] NÃO iniciada.\n${e.message}`)
    } else {
      console.error('[Automação] NÃO iniciada por erro inesperado:', (e as any)?.message)
    }
  }
}

export function pararAutomacao(): void {
  tarefa?.stop()
  tarefa = null
}

/** Config já validada na subida (null = automação desligada ou inválida). */
export function configAutomacaoAtiva(): ConfigAutomacao | null {
  return configAtiva
}

export function automacaoAgendada(): boolean {
  return tarefa != null
}
