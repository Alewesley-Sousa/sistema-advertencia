// apps/detran/src/main/seguranca/middlewares.ts
//
// Middlewares de borda: dispositivo aprovado, limite de requisições e cabeçalhos seguros.
// Sem dependências externas (nada de helmet/express-rate-limit): são poucas linhas e ficam testáveis.

import type { NextFunction, Request, Response } from 'express'

import type { ServicoDispositivos } from './dispositivos'

export const COOKIE_DISPOSITIVO = 'dtn_disp'

/* ============================================================================
 * UTILITÁRIOS
 * ========================================================================== */

export function lerCookie(header: string | undefined, nome: string): string | undefined {
  if (!header) return undefined
  for (const parte of header.split(';')) {
    const i = parte.indexOf('=')
    if (i > 0 && parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim()
  }
  return undefined
}

/**
 * IP do cliente. Atrás do túnel o socket é sempre local; o IP real vem nos cabeçalhos do túnel
 * (Cloudflare: cf-connecting-ip; demais: x-forwarded-for). Só é confiável porque o servidor
 * escuta apenas em 127.0.0.1 (HOST) — o túnel é quem fala com ele.
 */
export function ipDoCliente(headers: Request['headers'], remoto: string | undefined): string {
  const cf = headers['cf-connecting-ip']
  if (typeof cf === 'string' && cf.trim()) return cf.trim().slice(0, 64)
  const xff = headers['x-forwarded-for']
  const primeiro = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim()
  if (primeiro) return primeiro.slice(0, 64)
  return (remoto ?? 'desconhecido').replace(/^::ffff:/, '')
}

const escaparHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/* ============================================================================
 * DISPOSITIVO APROVADO
 * ========================================================================== */

export interface ConfigDispositivos {
  ativo: boolean
  /** Opcional: camada extra — se preenchida, o IP do cliente também precisa estar na lista. */
  ipsPermitidos: string[]
}

export interface DispositivoNaRequisicao {
  id: number
  codigo: string
  rotulo: string | null
  ip: string
}

function paginaBloqueio(codigo: string | null, motivo: 'PENDENTE' | 'REVOGADO' | 'LOTADO' | 'IP'): string {
  const titulo =
    motivo === 'REVOGADO' ? 'Acesso revogado'
    : motivo === 'IP' ? 'Rede não autorizada'
    : motivo === 'LOTADO' ? 'Muitas solicitações pendentes'
    : 'Dispositivo aguardando liberação'
  const texto =
    motivo === 'REVOGADO' ? 'O acesso deste dispositivo foi revogado. Fale com o administrador do sistema.'
    : motivo === 'IP' ? 'Esta rede não tem permissão para acessar o sistema.'
    : motivo === 'LOTADO' ? 'Há solicitações demais aguardando liberação. Tente novamente mais tarde.'
    : 'Envie o código abaixo ao administrador do sistema para liberar este dispositivo, depois recarregue a página.'
  const bloco = codigo
    ? `<p class="cod">${escaparHtml(codigo)}</p>`
    : ''
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title><style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#eef2f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937}
.c{max-width:420px;margin:16px;background:#fff;border-top:4px solid #2CCDFC;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
h1{margin:0 0 10px;font-size:20px;color:#1B426C}p{font-size:14px;line-height:1.5;margin:8px 0}
.cod{font-family:Consolas,monospace;font-size:30px;letter-spacing:4px;font-weight:700;color:#1B426C;background:#f3f6fa;padding:14px;text-align:center}
</style></head><body><div class="c"><h1>${titulo}</h1><p>${texto}</p>${bloco}</div></body></html>`
}

export function criarMiddlewareDispositivo(servico: ServicoDispositivos, config: ConfigDispositivos) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.ativo) return next()
    if (req.path === '/api/health') return next()

    const ip = ipDoCliente(req.headers, req.socket.remoteAddress)

    const negar = (codigoHttp: string, mensagem: string, codigo: string | null, motivo: 'PENDENTE' | 'REVOGADO' | 'LOTADO' | 'IP') => {
      res.setHeader('Cache-Control', 'no-store')
      if (req.path.startsWith('/api')) {
        return res.status(403).json({
          success: false,
          error: { code: codigoHttp, message: mensagem, ...(codigo ? { codigo } : {}) },
        })
      }
      return res.status(403).type('html').send(paginaBloqueio(codigo, motivo))
    }

    if (config.ipsPermitidos.length > 0 && !config.ipsPermitidos.includes(ip)) {
      return negar('IP_NAO_PERMITIDO', 'Esta rede não tem permissão para acessar o sistema.', null, 'IP')
    }

    const token = lerCookie(req.headers.cookie, COOKIE_DISPOSITIVO)
    const r = servico.identificar(token, { ip, userAgent: req.headers['user-agent'] })

    if (r.estado === 'LOTADO') {
      return negar('SOLICITACOES_EXCEDIDAS', 'Muitas solicitações pendentes. Tente mais tarde.', null, 'LOTADO')
    }

    if (r.estado === 'NOVO') {
      const seguro = req.headers['x-forwarded-proto'] === 'https'
      res.setHeader(
        'Set-Cookie',
        `${COOKIE_DISPOSITIVO}=${r.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${seguro ? '; Secure' : ''}`
      )
    }

    if (r.estado === 'APROVADO') {
      const d: DispositivoNaRequisicao = { id: r.dispositivo.id, codigo: r.dispositivo.codigo, rotulo: r.dispositivo.rotulo, ip }
      res.locals.dispositivo = d
      return next()
    }

    if (r.estado === 'REVOGADO') {
      return negar('DISPOSITIVO_REVOGADO', 'O acesso deste dispositivo foi revogado.', r.dispositivo.codigo, 'REVOGADO')
    }
    return negar(
      'DISPOSITIVO_NAO_AUTORIZADO',
      'Dispositivo não autorizado. Envie o código ao administrador para liberar o acesso.',
      r.dispositivo.codigo,
      'PENDENTE'
    )
  }
}

/** Quem executou: "PC da Maria (200.1.2.3)" — usado no histórico da automação. */
export function descreverExecutor(res: Response): string {
  const d = res.locals.dispositivo as DispositivoNaRequisicao | undefined
  if (!d) return 'Acesso local'
  return `${d.rotulo || `Dispositivo ${d.codigo}`} (${d.ip})`
}

/* ============================================================================
 * LIMITE DE REQUISIÇÕES (janela fixa, em memória, por dispositivo ou IP)
 * ========================================================================== */

export interface OpcoesLimite {
  janelaMs: number
  max: number
  /** Retorna true para NÃO contar/limitar esta requisição. */
  ignorar?: (req: Request) => boolean
  agora?: () => number
}

const MAX_CHAVES = 20_000

export function criarLimitador(opcoes: OpcoesLimite) {
  const agora = opcoes.agora ?? Date.now
  const janelas = new Map<string, { inicio: number; n: number }>()

  const limpar = () => {
    const t = agora()
    for (const [k, v] of janelas) if (t - v.inicio >= opcoes.janelaMs) janelas.delete(k)
  }
  // Varre as janelas vencidas; unref() para não segurar o processo vivo.
  const timer = setInterval(limpar, Math.max(10_000, opcoes.janelaMs))
  timer.unref?.()

  return (req: Request, res: Response, next: NextFunction) => {
    if (opcoes.ignorar?.(req)) return next()

    const d = res.locals.dispositivo as DispositivoNaRequisicao | undefined
    const chave = d ? `d${d.id}` : `ip${ipDoCliente(req.headers, req.socket.remoteAddress)}`
    const t = agora()

    let j = janelas.get(chave)
    if (!j || t - j.inicio >= opcoes.janelaMs) {
      if (janelas.size >= MAX_CHAVES) limpar()
      j = { inicio: t, n: 0 }
      janelas.set(chave, j)
    }
    j.n++

    if (j.n > opcoes.max) {
      const espera = Math.max(1, Math.ceil((j.inicio + opcoes.janelaMs - t) / 1000))
      res.setHeader('Retry-After', String(espera))
      return res.status(429).json({
        success: false,
        error: { code: 'MUITAS_REQUISICOES', message: `Muitas requisições. Tente novamente em ${espera}s.` },
      })
    }
    return next()
  }
}

/* ============================================================================
 * CABEÇALHOS SEGUROS
 *
 * Sem Content-Security-Policy de propósito: uma CSP mal ajustada quebra a interface (fontes e
 * estilos embutidos). Os demais cabeçalhos são seguros para o app como está.
 * ========================================================================== */

export function cabecalhosSeguros(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000')
  }
  // Respostas da API (multas, PDFs, histórico) não devem ficar em cache de navegador/proxy.
  if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store')
  next()
}
