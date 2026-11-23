// apps/detran/src/main/seguranca/dispositivos.ts
//
// Dispositivos aprovados: só navegadores que o administrador liberou acessam o sistema.
//
// Como funciona (e o que NÃO é):
//  - No primeiro acesso o servidor grava no navegador um cookie com um token aleatório de 256 bits
//    e mostra na tela um código curto (ex.: 7F3A-91C2). O administrador libera esse código pelo
//    servidor (`npm run dispositivos -- aprovar 7F3A-91C2 "PC da Maria"`).
//  - É identidade do NAVEGADOR, não do hardware: outro navegador, janela anônima ou cookies
//    apagados exigem nova aprovação. Um servidor web não consegue ler o ID de hardware da máquina
//    remota; para isso seria preciso certificado de cliente (mTLS) no túnel.
//  - O banco guarda só o HASH do token (SHA-256): quem lê o banco não consegue se passar por um
//    dispositivo aprovado.

import { createHash, randomBytes } from 'node:crypto'

/** O mínimo que precisamos do banco — compatível com better-sqlite3 (produção) e node:sqlite (testes). */
export interface DbMinimo {
  exec(sql: string): unknown
  prepare(sql: string): {
    run(...args: any[]): any
    get(...args: any[]): any
    all(...args: any[]): any
  }
}

export type StatusDispositivo = 'PENDENTE' | 'APROVADO' | 'REVOGADO'

export interface Dispositivo {
  id: number
  codigo: string
  status: StatusDispositivo
  rotulo: string | null
  ipUltimo: string | null
  userAgent: string | null
  criadoEm: string
  aprovadoEm: string | null
  ultimoAcessoEm: string | null
}

export type ResultadoIdentificacao =
  | { estado: 'APROVADO'; dispositivo: Dispositivo }
  | { estado: 'PENDENTE' | 'REVOGADO'; dispositivo: Dispositivo }
  | { estado: 'NOVO'; dispositivo: Dispositivo; token: string }
  | { estado: 'LOTADO' }

const TOKEN_RE = /^[a-f0-9]{64}$/

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** 8 primeiros hex do hash, em maiúsculas: "7F3A91C2" -> "7F3A-91C2". */
export function codigoDoHash(hash: string): string {
  const c = hash.slice(0, 8).toUpperCase()
  return `${c.slice(0, 4)}-${c.slice(4)}`
}

/** Aceita "7f3a91c2", "7F3A-91C2", " 7f3a 91c2 " etc. Devolve null se não for um código. */
export function normalizarCodigo(entrada: string): string | null {
  const limpo = String(entrada ?? '').toUpperCase().replace(/[^0-9A-F]/g, '')
  return limpo.length === 8 ? `${limpo.slice(0, 4)}-${limpo.slice(4)}` : null
}

export function criarTabelaDispositivos(db: DbMinimo) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dispositivos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      codigo TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO', 'REVOGADO')),
      rotulo TEXT,
      ip_ultimo TEXT,
      user_agent TEXT,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
      aprovado_em TEXT,
      ultimo_acesso_em TEXT
    );
  `)
}

const mapear = (r: any): Dispositivo => ({
  id: r.id,
  codigo: r.codigo,
  status: r.status,
  rotulo: r.rotulo,
  ipUltimo: r.ip_ultimo,
  userAgent: r.user_agent,
  criadoEm: r.criado_em,
  aprovadoEm: r.aprovado_em,
  ultimoAcessoEm: r.ultimo_acesso_em,
})

export interface ContextoAcesso {
  ip: string
  userAgent?: string
}

export function criarServicoDispositivos(db: DbMinimo, opcoes: { maxPendentes?: number } = {}) {
  const maxPendentes = opcoes.maxPendentes ?? 200

  const porHash = (hash: string) => db.prepare(`SELECT * FROM dispositivos WHERE token_hash = ?`).get(hash)

  return {
    /** Resolve o cookie (ou a falta dele) em um estado. Cria um dispositivo PENDENTE quando é novo. */
    identificar(token: string | undefined, ctx: ContextoAcesso): ResultadoIdentificacao {
      const ua = (ctx.userAgent ?? '').slice(0, 200)
      const ip = (ctx.ip ?? '').slice(0, 64)

      if (token && TOKEN_RE.test(token)) {
        const row = porHash(hashToken(token))
        if (row) {
          // Evita uma escrita por requisição: só atualiza o "último acesso" a cada 5 minutos.
          db.prepare(
            `UPDATE dispositivos SET ultimo_acesso_em = datetime('now'), ip_ultimo = ?, user_agent = ?
             WHERE id = ? AND (ultimo_acesso_em IS NULL OR ultimo_acesso_em < datetime('now', '-5 minutes'))`
          ).run(ip, ua, row.id)
          const d = mapear(row)
          return { estado: d.status, dispositivo: d } as ResultadoIdentificacao
        }
      }

      // Cookie ausente ou desconhecido: cadastra um novo pendente (com teto, contra flood de cadastros).
      const { n } = db.prepare(`SELECT COUNT(*) AS n FROM dispositivos WHERE status = 'PENDENTE'`).get() as { n: number }
      if (n >= maxPendentes) return { estado: 'LOTADO' }

      for (let tentativa = 0; tentativa < 5; tentativa++) {
        const novo = randomBytes(32).toString('hex')
        const hash = hashToken(novo)
        try {
          db.prepare(
            `INSERT INTO dispositivos (token_hash, codigo, status, ip_ultimo, user_agent, ultimo_acesso_em)
             VALUES (?, ?, 'PENDENTE', ?, ?, datetime('now'))`
          ).run(hash, codigoDoHash(hash), ip, ua)
          return { estado: 'NOVO', dispositivo: mapear(porHash(hash)), token: novo }
        } catch {
          // colisão improvável no código curto: tenta outro token
        }
      }
      return { estado: 'LOTADO' }
    },

    listar(): Dispositivo[] {
      return db.prepare(`SELECT * FROM dispositivos ORDER BY id DESC`).all().map(mapear)
    },

    aprovar(codigo: string, rotulo?: string): boolean {
      const c = normalizarCodigo(codigo)
      if (!c) return false
      const r = db
        .prepare(
          `UPDATE dispositivos SET status = 'APROVADO', rotulo = ?, aprovado_em = datetime('now')
           WHERE codigo = ? AND status IN ('PENDENTE', 'REVOGADO')`
        )
        .run((rotulo ?? '').trim().slice(0, 60) || null, c)
      return Number(r.changes) > 0
    },

    revogar(codigo: string): boolean {
      const c = normalizarCodigo(codigo)
      if (!c) return false
      return Number(db.prepare(`UPDATE dispositivos SET status = 'REVOGADO' WHERE codigo = ?`).run(c).changes) > 0
    },

    remover(codigo: string): boolean {
      const c = normalizarCodigo(codigo)
      if (!c) return false
      return Number(db.prepare(`DELETE FROM dispositivos WHERE codigo = ?`).run(c).changes) > 0
    },

    /** Pendentes que ninguém aprovou em N dias saem da lista (aprovados nunca são apagados). */
    limparPendentesAntigos(dias = 7): number {
      return Number(
        db
          .prepare(`DELETE FROM dispositivos WHERE status = 'PENDENTE' AND criado_em < datetime('now', ?)`)
          .run(`-${Math.max(1, Math.floor(dias))} days`).changes
      )
    },
  }
}

export type ServicoDispositivos = ReturnType<typeof criarServicoDispositivos>
