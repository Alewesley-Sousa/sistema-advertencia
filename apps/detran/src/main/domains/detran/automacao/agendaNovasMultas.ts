// apps/detran/src/main/domains/detran/automacao/agendaNovasMultas.ts
//
// Agenda por "slots": horários marcados a cada N horas, ancorados em HH:MM no fuso escolhido.
// Ex.: horário 12:00 e intervalo 24 h => slots todo dia às 12:00; intervalo 6 h => 00:00, 06:00, 12:00, 18:00.
// Ancorar evita "deriva" (rodar às 15:30 hoje, 15:30 amanhã) depois de uma execução atrasada.

/** Diferença (ms) entre o relógio local do fuso e o UTC naquele instante. */
export function deslocamentoFuso(timeZone: string, instante: Date): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instante)
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value)
  const comoUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'))
  return comoUtc - Math.floor(instante.getTime() / 1000) * 1000
}

export function ancoraDoDia(agora: Date, horario: string, timeZone: string): Date {
  const [h, m] = horario.split(':').map(Number)
  const off = deslocamentoFuso(timeZone, agora)
  const local = new Date(agora.getTime() + off) // "relógio de parede" lido em UTC
  const ancoraComoUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), h, m, 0)
  return new Date(ancoraComoUtc - off)
}

/** O slot mais recente que já passou (<= agora). */
export function slotAtual(agora: Date, horario: string, intervaloHoras: number, timeZone: string): Date {
  const passo = intervaloHoras * 3_600_000
  const ancora = ancoraDoDia(agora, horario, timeZone).getTime()
  const k = Math.floor((agora.getTime() - ancora) / passo)
  return new Date(ancora + k * passo)
}

export function proximoSlot(agora: Date, horario: string, intervaloHoras: number, timeZone: string): Date {
  return new Date(slotAtual(agora, horario, intervaloHoras, timeZone).getTime() + intervaloHoras * 3_600_000)
}

/** Deve rodar agora? true quando existe um slot já vencido que ainda não foi tratado. */
export function estaVencido(agora: Date, ultimoSlotTratadoIso: string | null, horario: string, intervaloHoras: number, timeZone: string): boolean {
  const atual = slotAtual(agora, horario, intervaloHoras, timeZone)
  return !ultimoSlotTratadoIso || new Date(ultimoSlotTratadoIso).getTime() < atual.getTime()
}
