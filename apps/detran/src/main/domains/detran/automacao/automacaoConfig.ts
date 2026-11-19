// apps/detran/src/main/domains/detran/automacao/automacaoConfig.ts
//
// Leitura e validação das variáveis de ambiente da automação semanal.
// Falha cedo (na subida do servidor) com mensagem clara e SEM imprimir valores
// secretos — só o nome da variável e o motivo.

import { z } from 'zod'
import cron from 'node-cron'

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/

const booleano = z
  .string()
  .optional()
  .transform((v) => ['1', 'true', 'sim', 'yes'].includes((v ?? '').trim().toLowerCase()))

const lista = (rotulo: string) =>
  z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .refine((arr) => arr.every((e) => EMAIL_RE.test(e)), { message: `${rotulo} contém e-mail inválido.` })

const envSchema = z.object({
  DETRAN_AUTOMACAO_ATIVA: booleano,
  /** Padrão: toda sexta-feira às 07:00. */
  DETRAN_AUTOMACAO_CRON: z.string().trim().default('0 7 * * 5'),
  DETRAN_AUTOMACAO_TZ: z.string().trim().default('America/Fortaleza'),
  DETRAN_AUTOMACAO_CONCORRENCIA: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 1))
    .refine((n) => n === 1 || n === 2, { message: 'DETRAN_AUTOMACAO_CONCORRENCIA deve ser 1 ou 2.' }),

  SMTP_HOST: z.string().trim().min(1, 'SMTP_HOST é obrigatório.'),
  SMTP_PORT: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 587))
    .refine((n) => Number.isInteger(n) && n > 0 && n < 65536, { message: 'SMTP_PORT inválida.' }),
  /** true = TLS direto (porta 465); false = STARTTLS (587). */
  SMTP_SECURE: booleano,
  SMTP_USER: z.string().trim().min(1, 'SMTP_USER é obrigatório.'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS é obrigatório.'),
  EMAIL_FROM: z.string().trim().min(1, 'EMAIL_FROM é obrigatório.'),
  EMAIL_TO: lista('EMAIL_TO').refine((a) => a.length > 0, { message: 'EMAIL_TO precisa de ao menos um destinatário.' }),
  EMAIL_CC: lista('EMAIL_CC'),
  /** Destinatário(s) dos avisos de falha. Padrão: os mesmos de EMAIL_TO. */
  EMAIL_ALERTA: lista('EMAIL_ALERTA'),
  /** Logo/GIF embutidos (CID). Padrão desligado: alguns provedores os mostram como anexo. */
  EMAIL_IMAGENS: booleano,
})

export interface ConfigAutomacao {
  ativa: boolean
  cron: string
  timezone: string
  concorrencia: 1 | 2
  smtp: { host: string; port: number; secure: boolean; user: string; pass: string }
  email: { from: string; to: string[]; cc: string[]; alerta: string[]; embutirImagens: boolean }
}

export class ErroConfigAutomacao extends Error {
  constructor(public readonly problemas: string[]) {
    super(`Configuração da automação inválida:\n - ${problemas.join('\n - ')}`)
    this.name = 'ErroConfigAutomacao'
  }
}

function validarTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * Se a automação estiver desligada, devolve `{ ativa: false }` sem exigir SMTP.
 * Ligada: valida tudo e lança `ErroConfigAutomacao` listando os problemas.
 */
export function carregarConfigAutomacao(env: NodeJS.ProcessEnv = process.env): ConfigAutomacao | { ativa: false } {
  const ativa = ['1', 'true', 'sim', 'yes'].includes((env.DETRAN_AUTOMACAO_ATIVA ?? '').trim().toLowerCase())
  if (!ativa) return { ativa: false }

  const r = envSchema.safeParse(env)
  const problemas: string[] = []
  if (!r.success) {
    for (const issue of r.error.issues) {
      const nome = String(issue.path[0] ?? '')
      problemas.push(issue.message.includes(nome) ? issue.message : `${nome}: ${issue.message}`)
    }
    throw new ErroConfigAutomacao(problemas)
  }

  const c = r.data
  if (!cron.validate(c.DETRAN_AUTOMACAO_CRON)) problemas.push('DETRAN_AUTOMACAO_CRON não é uma expressão cron válida.')
  if (!validarTimezone(c.DETRAN_AUTOMACAO_TZ)) problemas.push('DETRAN_AUTOMACAO_TZ não é um fuso IANA válido.')
  if (problemas.length) throw new ErroConfigAutomacao(problemas)

  return {
    ativa: true,
    cron: c.DETRAN_AUTOMACAO_CRON,
    timezone: c.DETRAN_AUTOMACAO_TZ,
    concorrencia: c.DETRAN_AUTOMACAO_CONCORRENCIA as 1 | 2,
    smtp: { host: c.SMTP_HOST, port: c.SMTP_PORT, secure: c.SMTP_SECURE, user: c.SMTP_USER, pass: c.SMTP_PASS },
    email: {
      from: c.EMAIL_FROM,
      to: c.EMAIL_TO,
      cc: c.EMAIL_CC,
      alerta: c.EMAIL_ALERTA.length ? c.EMAIL_ALERTA : c.EMAIL_TO,
      embutirImagens: c.EMAIL_IMAGENS,
    },
  }
}

/** Mascara e-mail para logs: `jo***@empresa.com`. */
export function mascararEmail(email: string): string {
  const [user, dominio] = email.split('@')
  return `${user.slice(0, 2)}***@${dominio ?? ''}`
}

/** Mascara placa para logs: `ABC****`. */
export function mascararPlaca(placa: string): string {
  return `${placa.slice(0, 3)}****`
}
