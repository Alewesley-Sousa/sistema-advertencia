import nodemailer from 'nodemailer'
import fs from 'node:fs'
import path from 'node:path'
import { db } from '../database/db'

export interface EnviarOficioParams {
  para?: string | string[]
  condutor: string
  placa: string
  velocidadeRegistrada: number
  velocidadeLimite: number
  dataHora: string
  pdfPath: string
}

/**
 * Cria um transportador de e-mail.
 */
async function obterTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.office365.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    })
  }

  console.log('[EmailService] ⚠️ Nenhuma credencial SMTP configurada. Inicializando conta de teste no Ethereal...')
  const testAccount = await nodemailer.createTestAccount()

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  })
}

/**
 * Busca e higieniza a lista de e-mails cadastrada no banco.
 * Suporta valores salvos como "email1@empresa.com, email2@empresa.com".
 */
function obterEmailsNotificacaoBanco(): string[] {
  try {
    const row = db
      .prepare("SELECT valor FROM configuracoes WHERE chave = 'email_notificacao'")
      .get() as { valor: string } | undefined

    if (!row?.valor) return []

    // Divide por vírgula, remove espaços em branco e filtra itens vazios
    return row.valor
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean)
  } catch (error) {
    console.error('[EmailService] Erro ao buscar "email_notificacao" na tabela configuracoes:', error)
    return []
  }
}

/**
 * Resolve a lista final de destinatários aplicando a hierarquia de fallbacks.
 */
function resolverDestinatarios(para?: string | string[]): string[] {
  // 1. Se foi passado explicitamente por parâmetro na função
  if (para) {
    if (Array.isArray(para)) {
      const listaLimpa = para.map((e) => e.trim()).filter(Boolean)
      if (listaLimpa.length > 0) return listaLimpa
    } else if (typeof para === 'string' && para.trim()) {
      const listaLimpa = para.split(',').map((e) => e.trim()).filter(Boolean)
      if (listaLimpa.length > 0) return listaLimpa
    }
  }

  // 2. Busca do banco de dados (SQLite)
  const emailsBanco = obterEmailsNotificacaoBanco()
  if (emailsBanco.length > 0) {
    return emailsBanco
  }

  // 3. Fallbacks das variáveis de ambiente / Padrão ajustados para Operações
  const emailEnv = process.env.EMAIL_OPERACOES || process.env.SMTP_USER || 'operacoes@empresa.com.br'
  return [emailEnv.trim()]
}

/**
 * Envia o Ofício de Advertência por e-mail com o arquivo PDF em anexo aos destinatários.
 */
export async function enviarOficioEmail({
  para,
  condutor,
  placa,
  velocidadeRegistrada,
  velocidadeLimite,
  dataHora,
  pdfPath
}: EnviarOficioParams) {
  // 1. Validação de segurança do arquivo
  const caminhoAbsoluto = path.resolve(pdfPath)
  if (!fs.existsSync(caminhoAbsoluto)) {
    throw new Error(`[EmailService] Arquivo PDF não localizado no caminho: ${caminhoAbsoluto}`)
  }

  // 2. Resolução da lista de e-mails de destino
  const destinatariosFinais = resolverDestinatarios(para)

  if (destinatariosFinais.length === 0) {
    throw new Error('[EmailService] Nenhum e-mail de destinatário válido foi encontrado.')
  }

  // 3. Obtenção do Transportador (Produção ou Ethereal)
  const transporter = await obterTransporter()

  // 4. Montagem da mensagem
  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'Gestão de Frotas'}" <${process.env.SMTP_USER || 'no-reply@frotas.com'}>`,
    to: destinatariosFinais,
    subject: `[Notificação Operacional] Excesso de Velocidade - Veículo ${placa} (${condutor})`,

    text: `Prezados da Equipe de Operações,\n\n` +
          `Comunicamos o registro de infração por excesso de velocidade referente ao condutor abaixo relacionado, identificada via telemetria Wialon.\n\n` +
          `DADOS DA OCORRÊNCIA:\n` +
          `- Condutor / Matrícula: ${condutor}\n` +
          `- Veículo / Placa: ${placa}\n` +
          `- Velocidade Registrada: ${velocidadeRegistrada} km/h\n` +
          `- Limite Tolerado da Via: ${velocidadeLimite} km/h\n` +
          `- Data/Hora: ${dataHora}\n\n` +
          `O Ofício de Advertência oficial em formato PDF encontra-se em anexo a este e-mail para ciência e tratativas operacionais junto ao colaborador.\n\n` +
          `Atenciosamente,\nSetor de Gestão de Frotas e Transporte`,

    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">

        <!-- Cabeçalho -->
        <div style="background-color: #0f172a; padding: 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 18px; letter-spacing: 0.5px;">
            Notificação de Excesso de Velocidade
          </h2>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">
            Setor de Gestão de Frotas &bull; Sistema Automático
          </p>
        </div>

        <!-- Conteúdo Principal -->
        <div style="padding: 24px;">
          <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-top: 0;">
            Prezada equipe do <strong>Setor de Operações</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.5; color: #334155;">
            Notificamos a ocorrência de infração por <strong>excesso de velocidade</strong> cometida pelo condutor abaixo relacionado, identificada via telemetria Wialon.
          </p>

          <!-- Tabela de Detalhes -->
          <table style="width: 100%; margin: 20px 0; border-collapse: collapse; font-size: 13px;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Condutor / Matrícula:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; color: #0f172a; font-weight: bold;">${condutor}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Veículo / Placa:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; color: #0f172a;">${placa}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Velocidade Aferida:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; color: #dc2626; font-weight: bold;">${velocidadeRegistrada} km/h</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Limite Tolerado:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; color: #0f172a;">${velocidadeLimite} km/h</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Data / Hora da Infração:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; color: #0f172a;">${dataHora}</td>
            </tr>
          </table>

          <!-- Card de Orientação às Operações -->
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
            <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.4;">
              <strong>Ação necessária:</strong> O <strong>Ofício de Advertência (PDF)</strong> encontra-se anexado a este e-mail. Solicita-se o alinhamento com a gestão operacional para colheita da assinatura do condutor e devidas orientações relativas à conduta em trânsito.
            </p>
          </div>

          <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 0;">
            Atenciosamente,<br>
            <strong>Setor de Gestão de Frotas</strong>
          </p>
        </div>

        <!-- Rodapé -->
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">
            Mensagem automática gerada pelo módulo de controle de tráfego.
          </p>
        </div>

      </div>
    `,

    attachments: [
      {
        filename: `Oficio_Advertencia_${placa.replace(/[^a-zA-Z0-9]/g, '')}.pdf`,
        path: caminhoAbsoluto,
        contentType: 'application/pdf'
      }
    ]
  }

  // 5. Disparo do e-mail
  const info = await transporter.sendMail(mailOptions)

  console.log(`[EmailService] E-mail enviado com sucesso para: ${destinatariosFinais.join(', ')}. MessageID: ${info.messageId}`)

  // Preview para ambiente de dev (Ethereal)
  const previewUrl = nodemailer.getTestMessageUrl(info)
  if (previewUrl) {
    console.log(`\n==================================================`)
    console.log(`🔗 PREVIEW DO E-MAIL (Ethereal): ${previewUrl}`)
    console.log(`==================================================\n`)
  }

  return info
}