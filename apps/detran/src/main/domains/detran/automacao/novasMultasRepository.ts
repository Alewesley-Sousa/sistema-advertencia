// apps/detran/src/main/domains/detran/automacao/novasMultasRepository.ts
//
// Persistência do job de multas novas. Funciona com qualquer banco que tenha a interface
// mínima (better-sqlite3 em produção; node:sqlite nos testes) — por isso recebe `db` como parâmetro.
//
// Regra central: uma multa é "nova" quando está ATIVA, o veículo já passou pelo baseline e
// `notificada_em` ainda é NULL. A marca só é gravada DEPOIS do e-mail sair com sucesso.

import type { DbMinimo } from '../../../seguranca/dispositivos'

export type OrigemNovasMultas = 'AGENDADA' | 'MANUAL'
export type StatusNovasMultas = 'EXECUTANDO' | 'CONCLUIDA' | 'PARCIAL' | 'FALHA'

export interface MultaPendente {
  id: number
  placa: string
  modelo: string | null
  contrato: string | null
  ait: string
  motivo: string | null
  dataInfracao: string
  dataVencimento: string | null
  valorPagar: string | null
}

export interface ExecucaoNovasMultas {
  id: number
  origem: OrigemNovasMultas
  status: StatusNovasMultas
  totalVeiculos: number
  comErro: number
  novas: number
  emailEnviado: boolean
  mensagem: string | null
  iniciadaEm: string
  finalizadaEm: string | null
  executadoPor: string | null
}

export function criarTabelasNovasMultas(db: DbMinimo) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS novas_multas_execucoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origem TEXT NOT NULL CHECK (origem IN ('AGENDADA', 'MANUAL')),
      status TEXT NOT NULL CHECK (status IN ('EXECUTANDO', 'CONCLUIDA', 'PARCIAL', 'FALHA')),
      total_veiculos INTEGER NOT NULL DEFAULT 0,
      com_erro INTEGER NOT NULL DEFAULT 0,
      novas INTEGER NOT NULL DEFAULT 0,
      email_enviado INTEGER NOT NULL DEFAULT 0,
      mensagem TEXT,
      executado_por TEXT,
      iniciada_em TEXT DEFAULT CURRENT_TIMESTAMP,
      finalizada_em TEXT
    );

    -- Veículos que já passaram pelo baseline: as multas que já existiam foram marcadas em silêncio.
    CREATE TABLE IF NOT EXISTS novas_multas_veiculos (
      placa TEXT PRIMARY KEY,
      base_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Uma linha só: último "horário marcado" (slot) já tratado, para o catch-up da agenda.
    CREATE TABLE IF NOT EXISTS novas_multas_estado (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      ultimo_slot TEXT
    );
  `)
}

const lotes = <T,>(arr: T[], n = 500): T[][] => {
  const r: T[][] = []
  for (let i = 0; i < arr.length; i += n) r.push(arr.slice(i, i + n))
  return r
}
const marcas = (n: number) => Array(n).fill('?').join(',')
const limpaOrigem = (o: string) => o.slice(0, 120)

export function criarNovasMultasRepo(db: DbMinimo) {
  const transacao = <T,>(fn: () => T): T => {
    db.exec('BEGIN')
    try {
      const r = fn()
      db.exec('COMMIT')
      return r
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }

  return {
    transacao,

    /* ---- baseline por veículo ---- */
    placasComBaseline(): Set<string> {
      return new Set((db.prepare(`SELECT placa FROM novas_multas_veiculos`).all() as Array<{ placa: string }>).map((r) => r.placa))
    },

    /** Marca (em silêncio) as multas ativas já existentes e registra o veículo como "base". */
    fazerBaseline(placa: string): number {
      const p = placa.toUpperCase().trim()
      return transacao(() => {
        const r = db
          .prepare(
            `UPDATE infracoes_detran_multas
             SET notificada_em = datetime('now'), notificada_origem = 'BASE'
             WHERE placa = ? AND ativa = 1 AND notificada_em IS NULL`
          )
          .run(p)
        db.prepare(`INSERT OR IGNORE INTO novas_multas_veiculos (placa) VALUES (?)`).run(p)
        return Number(r.changes)
      })
    },

    /* ---- pendentes (o que iria no próximo e-mail) ---- */
    listarPendentes(opcoes: { placas?: string[]; limite?: number } = {}): MultaPendente[] {
      const limite = Math.max(1, Math.min(opcoes.limite ?? 5000, 20000))
      const base = `
        SELECT m.id, m.placa, c.modelo, c.contrato, m.ait, m.motivo,
               m.data_infracao AS dataInfracao, m.data_vencimento AS dataVencimento, m.valor_pagar AS valorPagar
        FROM infracoes_detran_multas m
        JOIN novas_multas_veiculos v ON v.placa = m.placa
        LEFT JOIN infracoes_detran c ON c.id = m.detran_consulta_id
        WHERE m.ativa = 1 AND m.notificada_em IS NULL`
      if (!opcoes.placas) {
        return db.prepare(`${base} ORDER BY m.placa, m.id LIMIT ?`).all(limite) as MultaPendente[]
      }
      const saida: MultaPendente[] = []
      for (const parte of lotes(opcoes.placas.map((p) => p.toUpperCase().trim()))) {
        saida.push(...(db.prepare(`${base} AND m.placa IN (${marcas(parte.length)}) ORDER BY m.placa, m.id`).all(...parte) as MultaPendente[]))
      }
      return saida.slice(0, limite)
    },

    contarPendentes(): number {
      return (
        db
          .prepare(
            `SELECT COUNT(*) AS n FROM infracoes_detran_multas m
             JOIN novas_multas_veiculos v ON v.placa = m.placa
             WHERE m.ativa = 1 AND m.notificada_em IS NULL`
          )
          .get() as { n: number }
      ).n
    },

    /* ---- marcações ---- */
    marcarNotificadas(ids: number[], origem: string): number {
      let total = 0
      transacao(() => {
        for (const parte of lotes(ids)) {
          total += Number(
            db
              .prepare(
                `UPDATE infracoes_detran_multas SET notificada_em = datetime('now'), notificada_origem = ?
                 WHERE id IN (${marcas(parte.length)}) AND notificada_em IS NULL`
              )
              .run(limpaOrigem(origem), ...parte).changes
          )
        }
      })
      return total
    },

    /**
     * Controle manual: desmarcar faz a multa voltar a ser "nova" no próximo ciclo.
     * Se o veículo ainda não passou pelo baseline, ele passa antes (as OUTRAS multas dele ficam sem aviso,
     * para não virar uma enxurrada de "novas" por causa de uma única desmarcação).
     */
    desmarcar(ids: number[]): number {
      const placas = new Set<string>()
      for (const parte of lotes(ids)) {
        for (const r of db.prepare(`SELECT DISTINCT placa FROM infracoes_detran_multas WHERE id IN (${marcas(parte.length)})`).all(...parte) as Array<{ placa: string }>) {
          placas.add(r.placa)
        }
      }
      const jaBase = this.placasComBaseline()
      for (const p of placas) if (!jaBase.has(p)) this.fazerBaseline(p)

      let total = 0
      transacao(() => {
        for (const parte of lotes(ids)) {
          total += Number(
            db
              .prepare(
                `UPDATE infracoes_detran_multas SET notificada_em = NULL, notificada_origem = NULL
                 WHERE id IN (${marcas(parte.length)}) AND notificada_em IS NOT NULL`
              )
              .run(...parte).changes
          )
        }
      })
      return total
    },

    /** Marca todas as pendentes (ex.: limpar o passado). Também registra os veículos como "base". */
    marcarTodasPendentes(origem: string): number {
      return transacao(() => {
        const r = db
          .prepare(
            `UPDATE infracoes_detran_multas SET notificada_em = datetime('now'), notificada_origem = ?
             WHERE ativa = 1 AND notificada_em IS NULL`
          )
          .run(limpaOrigem(origem))
        db.exec(
          `INSERT OR IGNORE INTO novas_multas_veiculos (placa)
           SELECT DISTINCT placa FROM infracoes_detran_multas`
        )
        return Number(r.changes)
      })
    },

    /** Estado de aviso das multas ativas de uma consulta (para a tela de multas do veículo). */
    estadoDasMultas(ids: number[]): Map<number, { notificadaEm: string | null; origem: string | null }> {
      const mapa = new Map<number, { notificadaEm: string | null; origem: string | null }>()
      for (const parte of lotes(ids)) {
        const rows = db
          .prepare(`SELECT id, notificada_em, notificada_origem FROM infracoes_detran_multas WHERE id IN (${marcas(parte.length)})`)
          .all(...parte) as any[]
        for (const r of rows) mapa.set(r.id, { notificadaEm: r.notificada_em, origem: r.notificada_origem })
      }
      return mapa
    },

    /* ---- execuções ---- */
    iniciarExecucao(origem: OrigemNovasMultas, totalVeiculos: number, executadoPor: string): number {
      const r = db
        .prepare(`INSERT INTO novas_multas_execucoes (origem, status, total_veiculos, executado_por) VALUES (?, 'EXECUTANDO', ?, ?)`)
        .run(origem, totalVeiculos, limpaOrigem(executadoPor))
      return Number(r.lastInsertRowid)
    },

    finalizarExecucao(
      id: number,
      d: { status: StatusNovasMultas; comErro: number; novas: number; emailEnviado: boolean; mensagem?: string }
    ) {
      db.prepare(
        `UPDATE novas_multas_execucoes
         SET status = ?, com_erro = ?, novas = ?, email_enviado = ?, mensagem = ?, finalizada_em = datetime('now')
         WHERE id = ?`
      ).run(d.status, d.comErro, d.novas, d.emailEnviado ? 1 : 0, d.mensagem ?? null, id)
    },

    encerrarOrfas() {
      db.prepare(
        `UPDATE novas_multas_execucoes
         SET status = 'FALHA', mensagem = 'Interrompida: o servidor foi reiniciado durante a execução.', finalizada_em = datetime('now')
         WHERE status = 'EXECUTANDO'`
      ).run()
    },

    listarExecucoes(limite = 10): ExecucaoNovasMultas[] {
      return (
        db
          .prepare(
            `SELECT id, origem, status, total_veiculos, com_erro, novas, email_enviado, mensagem, iniciada_em, finalizada_em, executado_por
             FROM novas_multas_execucoes ORDER BY id DESC LIMIT ?`
          )
          .all(limite) as any[]
      ).map((r) => ({
        id: r.id,
        origem: r.origem,
        status: r.status,
        totalVeiculos: r.total_veiculos,
        comErro: r.com_erro,
        novas: r.novas,
        emailEnviado: !!r.email_enviado,
        mensagem: r.mensagem,
        iniciadaEm: r.iniciada_em,
        finalizadaEm: r.finalizada_em,
        executadoPor: r.executado_por ?? null,
      }))
    },

    /* ---- agenda ---- */
    lerUltimoSlot(): string | null {
      const r = db.prepare(`SELECT ultimo_slot FROM novas_multas_estado WHERE id = 1`).get() as { ultimo_slot: string | null } | undefined
      return r?.ultimo_slot ?? null
    },

    gravarUltimoSlot(slotIso: string) {
      db.prepare(
        `INSERT INTO novas_multas_estado (id, ultimo_slot) VALUES (1, ?)
         ON CONFLICT(id) DO UPDATE SET ultimo_slot = excluded.ultimo_slot`
      ).run(slotIso)
    },
  }
}

export type NovasMultasRepo = ReturnType<typeof criarNovasMultasRepo>
