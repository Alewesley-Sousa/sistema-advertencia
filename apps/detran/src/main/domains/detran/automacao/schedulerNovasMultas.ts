// apps/detran/src/main/domains/detran/automacao/schedulerNovasMultas.ts
//
// Verifica a cada minuto se há um "slot" vencido (ver agendaNovasMultas.ts). Se o servidor ficou
// desligado na hora marcada, a verificação roda assim que ele sobe (catch-up).

import { ErroConfigAutomacao } from './automacaoConfig'
import { estaVencido, proximoSlot, slotAtual } from './agendaNovasMultas'
import { executarNovasMultas, novasMultasRepo } from './jobNovasMultas'
import { carregarConfigNovasMultas, type ConfigNovasMultas } from './novasMultasConfig'
import { travaRotinas } from './travaRotinas'

let config: ConfigNovasMultas | null = null
let timer: NodeJS.Timeout | null = null

export function iniciarNovasMultas(): void {
  try {
    const c = carregarConfigNovasMultas()
    if (!c.ativa) {
      console.log('[NovasMultas] Desligado (NOVAS_MULTAS_ATIVA não é "true").')
      return
    }
    config = c
    novasMultasRepo.encerrarOrfas()

    // Primeira vez: não roda de imediato; considera o slot atual como tratado e espera o próximo.
    if (novasMultasRepo.lerUltimoSlot() == null) {
      novasMultasRepo.gravarUltimoSlot(slotAtual(new Date(), c.horario, c.intervaloHoras, c.timezone).toISOString())
    }

    const tick = () => {
      if (!config) return
      const agora = new Date()
      if (!estaVencido(agora, novasMultasRepo.lerUltimoSlot(), config.horario, config.intervaloHoras, config.timezone)) return
      if (travaRotinas.ocupadaPor()) return // outra rotina em andamento: tenta no próximo minuto
      novasMultasRepo.gravarUltimoSlot(slotAtual(agora, config.horario, config.intervaloHoras, config.timezone).toISOString())
      executarNovasMultas(config, 'AGENDADA').catch((e: any) => console.error('[NovasMultas] Rodada agendada não executou:', e?.message))
    }

    timer = setInterval(tick, 60_000)
    timer.unref()
    setTimeout(tick, 30_000).unref() // catch-up logo após subir

    console.log(
      `[NovasMultas] Agendado: a cada ${c.intervaloHoras} h a partir das ${c.horario} (${c.timezone}). ` +
        `Próxima: ${proximoSlot(new Date(), c.horario, c.intervaloHoras, c.timezone).toISOString()}.`
    )
  } catch (e) {
    if (e instanceof ErroConfigAutomacao) console.error(`[NovasMultas] NÃO iniciado.\n${e.message}`)
    else console.error('[NovasMultas] NÃO iniciado por erro inesperado:', (e as any)?.message)
  }
}

export function configNovasMultasAtiva(): ConfigNovasMultas | null {
  return config
}

export function proximaVerificacao(): Date | null {
  return config ? proximoSlot(new Date(), config.horario, config.intervaloHoras, config.timezone) : null
}
