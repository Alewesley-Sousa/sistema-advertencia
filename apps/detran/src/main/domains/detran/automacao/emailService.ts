// apps/detran/src/main/domains/detran/automacao/emailService.ts
//
// Envio via Nodemailer com validação do ambiente (feita em automacaoConfig),
// retentativas com backoff e logs sem dados sensíveis (e-mails mascarados).

import fs from 'node:fs'
import path from 'node:path'
import type { Transporter } from 'nodemailer'

import { mascararEmail, type ConfigAutomacao } from './automacaoConfig'
import { CID_GIF, CID_LOGO } from './emailTemplate'

const TENTATIVAS = 3
const ESPERA_BASE_MS = 5_000
/** GIFs acima disso costumam ser cortados/ignorados por clientes e aumentam o risco de spam. */
const MAX_GIF_BYTES = 1_000_000

export interface AnexoEmail {
  filename: string
  content: Buffer
  contentType: string
}

export interface EnvioEmail {
  assunto: string
  html: string
  texto: string
  para: string[]
  cc?: string[]
  anexos?: AnexoEmail[]
  /** Inclui logo e GIF (se existirem em public/) como imagens embutidas por CID. */
  embutirImagens?: boolean
}

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function lerImagensEmail(): { logo: Buffer | null; gif: Buffer | null } {
  const publico = path.resolve(process.cwd(), 'public')
  const ler = (...partes: string[]) => {
    try {
      return fs.readFileSync(path.join(publico, ...partes))
    } catch {
      return null
    }
  }
  const gif = ler('email', 'banner.gif')
  return {
    logo: ler('logo-force.png'),
    gif: gif && gif.length <= MAX_GIF_BYTES ? gif : null,
  }
}

async function criarTransporte(config: ConfigAutomacao): Promise<Transporter> {
  // carregado sob demanda (economia de RAM em repouso)
  const { default: nodemailer } = await import('nodemailer')
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    requireTLS: !config.smtp.secure, // STARTTLS obrigatório na 587: nunca envia credencial em claro
    auth: { user: config.smtp.user, pass: config.smtp.pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  })
}

/** Erros que não adiantam repetir (credencial/destinatário/formato). */
function erroDefinitivo(err: any): boolean {
  const code = String(err?.code ?? '')
  const resp = Number(err?.responseCode ?? 0)
  return code === 'EAUTH' || code === 'EENVELOPE' || (resp >= 500 && resp < 600)
}

export async function enviarEmail(config: ConfigAutomacao, envio: EnvioEmail): Promise<void> {
  const transporte = await criarTransporte(config)
  const imagens = envio.embutirImagens && config.email.embutirImagens ? lerImagensEmail() : { logo: null, gif: null }

  const attachments: any[] = (envio.anexos ?? []).map((a) => ({
    filename: a.filename,
    content: a.content,
    contentType: a.contentType,
  }))
  if (imagens.logo) {
    attachments.push({ filename: 'logo-force.png', content: imagens.logo, cid: CID_LOGO, contentDisposition: 'inline' })
  }
  if (imagens.gif) {
    attachments.push({ filename: 'banner.gif', content: imagens.gif, cid: CID_GIF, contentDisposition: 'inline' })
  }

  const destinatarios = envio.para.map(mascararEmail).join(', ')
  let ultimoErro: any

  try {
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
      try {
        await transporte.sendMail({
          from: config.email.from,
          to: envio.para,
          cc: envio.cc?.length ? envio.cc : undefined,
          subject: envio.assunto,
          html: envio.html,
          text: envio.texto,
          attachments,
        })
        console.log(`[Automação] E-mail enviado para ${destinatarios} (tentativa ${tentativa}).`)
        return
      } catch (err: any) {
        ultimoErro = err
        // Loga só o código/classe do erro — nunca a resposta completa do servidor (pode conter e-mails).
        console.warn(
          `[Automação] Falha ao enviar e-mail (tentativa ${tentativa}/${TENTATIVAS}): ${err?.code || err?.name || 'erro desconhecido'}`
        )
        if (erroDefinitivo(err) || tentativa === TENTATIVAS) break
        await dormir(ESPERA_BASE_MS * 2 ** (tentativa - 1))
      }
    }
  } finally {
    transporte.close()
  }

  const motivo = ultimoErro?.code === 'EAUTH' ? 'autenticação SMTP recusada' : ultimoErro?.code || 'erro de envio'
  throw new Error(`Não foi possível enviar o e-mail (${motivo}).`)
}
