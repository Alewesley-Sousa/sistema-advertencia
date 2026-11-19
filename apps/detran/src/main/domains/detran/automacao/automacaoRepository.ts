// apps/detran/src/main/domains/detran/automacao/automacaoRepository.ts

import { db } from '../../../database/db'

export type OrigemExecucao = 'AGENDADA' | 'MANUAL'
export type StatusExecucao = 'EXECUTANDO' | 'CONCLUIDA' | 'PARCIAL' | 'FALHA'

export interface ExecucaoResumo {
  id: number
  origem: OrigemExecucao
  status: StatusExecucao
  totalVeiculos: number
  comErro: number
  emailEnviado: boolean
  mensagem: string | null
  iniciadaEm: string
  finalizadaEm: string | null
}

export const automacaoRepository = {
  /** Grava (substitui) o blob cifrado. Só a contagem fica em claro. */
  salvarCofre(payloadCifrado: string, totalVeiculos: number) {
    db.prepare(
      `INSERT INTO automacao_cofre (id, payload_cifrado, total_veiculos, atualizado_em)
       VALUES (1, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         payload_cifrado = excluded.payload_cifrado,
         total_veiculos = excluded.total_veiculos,
         atualizado_em = CURRENT_TIMESTAMP`
    ).run(payloadCifrado, totalVeiculos)
  },

  lerCofre(): { payloadCifrado: string; totalVeiculos: number; atualizadoEm: string } | null {
    const row = db
      .prepare(`SELECT payload_cifrado, total_veiculos, atualizado_em FROM automacao_cofre WHERE id = 1`)
      .get() as { payload_cifrado: string; total_veiculos: number; atualizado_em: string } | undefined
    return row
      ? { payloadCifrado: row.payload_cifrado, totalVeiculos: row.total_veiculos, atualizadoEm: row.atualizado_em }
      : null
  },

  apagarCofre() {
    db.prepare(`DELETE FROM automacao_cofre WHERE id = 1`).run()
  },

  /** Quantos itens do lote já foram processados (para a barra de progresso). */
  lerProcessadosLote(loteId: number): number {
    const row = db.prepare(`SELECT processados FROM lotes_consultas WHERE id = ?`).get(loteId) as
      | { processados: number }
      | undefined
    return row?.processados ?? 0
  },

  iniciarExecucao(origem: OrigemExecucao, totalVeiculos: number): number {
    const r = db
      .prepare(`INSERT INTO automacao_execucoes (origem, status, total_veiculos) VALUES (?, 'EXECUTANDO', ?)`)
      .run(origem, totalVeiculos)
    return Number(r.lastInsertRowid)
  },

  finalizarExecucao(
    id: number,
    dados: { status: StatusExecucao; comErro: number; emailEnviado: boolean; mensagem?: string }
  ) {
    db.prepare(
      `UPDATE automacao_execucoes
       SET status = ?, com_erro = ?, email_enviado = ?, mensagem = ?, finalizada_em = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(dados.status, dados.comErro, dados.emailEnviado ? 1 : 0, dados.mensagem ?? null, id)
  },

  /** Execuções que ficaram "EXECUTANDO" porque o processo caiu no meio. */
  encerrarExecucoesOrfas() {
    db.prepare(
      `UPDATE automacao_execucoes
       SET status = 'FALHA', mensagem = 'Interrompida: o servidor foi reiniciado durante a execução.',
           finalizada_em = CURRENT_TIMESTAMP
       WHERE status = 'EXECUTANDO'`
    ).run()
  },

  listarExecucoes(limite = 10): ExecucaoResumo[] {
    const rows = db
      .prepare(
        `SELECT id, origem, status, total_veiculos, com_erro, email_enviado, mensagem, iniciada_em, finalizada_em
         FROM automacao_execucoes ORDER BY id DESC LIMIT ?`
      )
      .all(limite) as any[]
    return rows.map((r) => ({
      id: r.id,
      origem: r.origem,
      status: r.status,
      totalVeiculos: r.total_veiculos,
      comErro: r.com_erro,
      emailEnviado: !!r.email_enviado,
      mensagem: r.mensagem,
      iniciadaEm: r.iniciada_em,
      finalizadaEm: r.finalizada_em,
    }))
  },
}
