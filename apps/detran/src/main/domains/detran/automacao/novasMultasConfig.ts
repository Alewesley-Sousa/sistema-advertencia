// apps/detran/src/main/domains/detran/automacao/novasMultasConfig.ts
//
// Variáveis do job de multas novas. O SMTP e o remetente são os mesmos da automação semanal
// (SMTP_*, EMAIL_FROM); só destinatários, horário e intervalo são próprios.

import { carregarConfigAutomacao, ErroConfigAutomacao, type ConfigAutomacao } from './automacaoConfig'

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/
const HORARIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export interface ConfigNovasMultas {
  ativa: true
  /** SMTP, remetente, concorrência e fuso padrão (da automação semanal). */
  base: ConfigAutomacao
  timezone: string
  intervaloHoras: number
  horario: string
  para: string[]
  cc: string[]
  alerta: string[]
}

const verdadeiro = (v?: string) => ['1', 'true', 'sim', 'yes'].includes((v ?? '').trim().toLowerCase())
const lista = (v?: string) => (v ?? '').split(/[,;]/).map((s) => s.trim()).filter(Boolean)

function fusoValido(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function carregarConfigNovasMultas(env: NodeJS.ProcessEnv = process.env): ConfigNovasMultas | { ativa: false } {
  if (!verdadeiro(env.NOVAS_MULTAS_ATIVA)) return { ativa: false }

  const base = carregarConfigAutomacao(env, { ignorarAtiva: true }) as ConfigAutomacao // lança se SMTP/EMAIL inválidos
  const problemas: string[] = []

  const horasTxt = (env.NOVAS_MULTAS_INTERVALO_HORAS ?? '24').trim()
  const intervaloHoras = Number(horasTxt)
  if (!Number.isInteger(intervaloHoras) || intervaloHoras < 1 || intervaloHoras > 168) {
    problemas.push('NOVAS_MULTAS_INTERVALO_HORAS deve ser um inteiro de 1 a 168.')
  }

  const horario = (env.NOVAS_MULTAS_HORARIO ?? '12:00').trim()
  if (!HORARIO_RE.test(horario)) problemas.push('NOVAS_MULTAS_HORARIO deve estar no formato HH:MM (ex.: 12:00).')

  const timezone = (env.NOVAS_MULTAS_TZ ?? '').trim() || base.timezone
  if (!fusoValido(timezone)) problemas.push('NOVAS_MULTAS_TZ não é um fuso IANA válido.')

  const para = lista(env.NOVAS_MULTAS_EMAIL_TO)
  const cc = lista(env.NOVAS_MULTAS_EMAIL_CC)
  if ([...para, ...cc].some((e) => !EMAIL_RE.test(e))) problemas.push('NOVAS_MULTAS_EMAIL_TO/CC contém e-mail inválido.')

  if (problemas.length) throw new ErroConfigAutomacao(problemas)

  return {
    ativa: true,
    base,
    timezone,
    intervaloHoras,
    horario,
    para: para.length ? para : base.email.to,
    cc: para.length ? cc : cc.length ? cc : base.email.cc,
    alerta: base.email.alerta,
  }
}
