import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'

import { ancoraDoDia, estaVencido, proximoSlot, slotAtual } from './agendaNovasMultas'
import { ErroConfigAutomacao } from './automacaoConfig'
import { agruparPorVeiculo, montarEmailNovasMultas } from './emailNovasMultas'
import { carregarConfigNovasMultas } from './novasMultasConfig'
import { apurarEEnviar } from './novasMultasCore'
import { criarNovasMultasRepo, criarTabelasNovasMultas } from './novasMultasRepository'

/* ── banco de teste (node:sqlite em memória; mesma interface do better-sqlite3 que usamos) ── */
function novoBanco() {
  const db: any = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE infracoes_detran (id INTEGER PRIMARY KEY, placa TEXT, modelo TEXT, contrato TEXT);
    CREATE TABLE infracoes_detran_multas (
      id INTEGER PRIMARY KEY AUTOINCREMENT, detran_consulta_id INTEGER, placa TEXT NOT NULL, ait TEXT NOT NULL,
      data_infracao TEXT NOT NULL, data_vencimento TEXT, motivo TEXT, valor_pagar TEXT,
      ativa INTEGER NOT NULL DEFAULT 1, notificada_em TEXT, notificada_origem TEXT);
  `)
  criarTabelasNovasMultas(db)
  const repo = criarNovasMultasRepo(db)
  let consultaId = 0
  const veiculo = (placa: string, contrato = 'C1') => { db.prepare(`INSERT INTO infracoes_detran (id, placa, modelo, contrato) VALUES (?, ?, 'Modelo X', ?)`).run(++consultaId, placa, contrato); return consultaId }
  const multa = (cid: number, placa: string, ait: string, valor = 'R$ 130,16', ativa = 1) =>
    Number(db.prepare(`INSERT INTO infracoes_detran_multas (detran_consulta_id, placa, ait, data_infracao, data_vencimento, motivo, valor_pagar, ativa)
      VALUES (?, ?, ?, '10/11/2026', '10/12/2026', 'Excesso de velocidade', ?, ?)`).run(cid, placa, ait, valor, ativa).lastInsertRowid)
  const estado = (id: number) => db.prepare(`SELECT notificada_em, notificada_origem FROM infracoes_detran_multas WHERE id = ?`).get(id)
  return { db, repo, veiculo, multa, estado }
}

const rodada = (t: ReturnType<typeof novoBanco>, placas: string[], okMap: Record<string, boolean> = {}, enviar?: (m: any) => Promise<void>, execucaoId = 1) => {
  const enviados: any[] = []
  const r = apurarEEnviar({
    veiculos: placas.map((placa) => ({ placa })),
    consultaOk: (p) => okMap[p] ?? true,
    repo: t.repo,
    dataTexto: '24/11/2026',
    execucaoId,
    temLogo: false,
    enviar: enviar ?? (async (m) => { enviados.push(m) }),
  })
  return r.then((res) => ({ res, enviados }))
}

/* ── agenda ───────────────────────────────────────────────────────────── */
test('agenda: slot diário ancorado no horário do fuso (Fortaleza = UTC-3)', () => {
  const tz = 'America/Fortaleza'
  assert.equal(ancoraDoDia(new Date('2026-11-24T18:00:00Z'), '12:00', tz).toISOString(), '2026-11-24T15:00:00.000Z')
  assert.equal(slotAtual(new Date('2026-11-24T18:00:00Z'), '12:00', 24, tz).toISOString(), '2026-11-24T15:00:00.000Z') // 15:00 local: já passou o das 12:00
  assert.equal(slotAtual(new Date('2026-11-24T13:00:00Z'), '12:00', 24, tz).toISOString(), '2026-11-23T15:00:00.000Z') // 10:00 local: vale o de ontem
  assert.equal(proximoSlot(new Date('2026-11-24T18:00:00Z'), '12:00', 24, tz).toISOString(), '2026-11-25T15:00:00.000Z')
})

test('agenda: intervalo de 6h ancorado em 12:00 (00, 06, 12, 18 locais) e virada de dia', () => {
  const tz = 'America/Fortaleza'
  assert.equal(slotAtual(new Date('2026-11-24T05:00:00Z'), '12:00', 6, tz).toISOString(), '2026-11-24T03:00:00.000Z') // 02:00 local -> 00:00
  assert.equal(slotAtual(new Date('2026-11-24T18:30:00Z'), '12:00', 6, tz).toISOString(), '2026-11-24T15:00:00.000Z') // 15:30 local -> 12:00
  assert.equal(proximoSlot(new Date('2026-11-24T23:30:00Z'), '12:00', 6, tz).toISOString(), '2026-11-25T03:00:00.000Z') // 20:30 local -> 00:00 (dia seguinte)
})

test('agenda: catch-up — vencido só quando há slot novo ainda não tratado', () => {
  const tz = 'America/Fortaleza'; const agora = new Date('2026-11-24T18:00:00Z')
  const slot = slotAtual(agora, '12:00', 24, tz).toISOString()
  assert.equal(estaVencido(agora, slot, '12:00', 24, tz), false)
  assert.equal(estaVencido(agora, '2026-11-23T15:00:00.000Z', '12:00', 24, tz), true) // ontem tratado, hoje não
  assert.equal(estaVencido(new Date('2026-11-24T14:59:00Z'), '2026-11-23T15:00:00.000Z', '12:00', 24, tz), false) // ainda antes das 12:00
  assert.equal(estaVencido(agora, null, '12:00', 24, tz), true)
})

/* ── configuração ─────────────────────────────────────────────────────── */
const envBase = { SMTP_HOST: 'h', SMTP_USER: 'u', SMTP_PASS: 'p', EMAIL_FROM: 'a@b.com', EMAIL_TO: 'x@y.com' }

test('config: desligado por padrão; ligado valida SMTP e usa padrões 24h / 12:00', () => {
  assert.deepEqual(carregarConfigNovasMultas({}), { ativa: false })
  assert.throws(() => carregarConfigNovasMultas({ NOVAS_MULTAS_ATIVA: 'true' }), ErroConfigAutomacao)
  const c: any = carregarConfigNovasMultas({ ...envBase, NOVAS_MULTAS_ATIVA: 'true' })
  assert.equal(c.intervaloHoras, 24); assert.equal(c.horario, '12:00'); assert.deepEqual(c.para, ['x@y.com'])
})

test('config: destinatários próprios, intervalo configurável e validações', () => {
  const c: any = carregarConfigNovasMultas({ ...envBase, NOVAS_MULTAS_ATIVA: 'sim', NOVAS_MULTAS_INTERVALO_HORAS: '12', NOVAS_MULTAS_HORARIO: '07:30', NOVAS_MULTAS_EMAIL_TO: 'a@a.com; b@b.com' })
  assert.equal(c.intervaloHoras, 12); assert.equal(c.horario, '07:30'); assert.deepEqual(c.para, ['a@a.com', 'b@b.com'])
  for (const ruim of [{ NOVAS_MULTAS_INTERVALO_HORAS: '0' }, { NOVAS_MULTAS_INTERVALO_HORAS: '2.5' }, { NOVAS_MULTAS_INTERVALO_HORAS: '999' }, { NOVAS_MULTAS_HORARIO: '25:00' }, { NOVAS_MULTAS_HORARIO: '9:00' }, { NOVAS_MULTAS_EMAIL_TO: 'sem-arroba' }, { NOVAS_MULTAS_TZ: 'Marte/Olimpo' }]) {
    assert.throws(() => carregarConfigNovasMultas({ ...envBase, NOVAS_MULTAS_ATIVA: 'true', ...ruim }), ErroConfigAutomacao, JSON.stringify(ruim))
  }
})

/* ── fluxo central ────────────────────────────────────────────────────── */
test('1ª rodada = baseline em silêncio; multa nova depois é avisada uma única vez', async () => {
  const t = novoBanco(); const c = t.veiculo('ABC1D23'); const m1 = t.multa(c, 'ABC1D23', 'A1'); const m2 = t.multa(c, 'ABC1D23', 'A2')

  const r1 = await rodada(t, ['ABC1D23'])
  assert.equal(r1.res.novas, 0); assert.equal(r1.enviados.length, 0)
  assert.equal(r1.res.veiculosNovosNaBase, 1); assert.equal(r1.res.multasEmBaseline, 2)
  assert.equal(t.estado(m1).notificada_origem, 'BASE')

  const m3 = t.multa(c, 'ABC1D23', 'A3') // apareceu depois
  const r2 = await rodada(t, ['ABC1D23'], {}, undefined, 7)
  assert.equal(r2.res.novas, 1); assert.equal(r2.res.emailEnviado, true); assert.equal(r2.enviados.length, 1)
  assert.match(r2.enviados[0].assunto, /1 multa nova/); assert.match(r2.enviados[0].html, /A3/); assert.doesNotMatch(r2.enviados[0].html, /A1/)
  assert.equal(t.estado(m3).notificada_origem, 'EMAIL #7'); assert.ok(t.estado(m3).notificada_em)

  const r3 = await rodada(t, ['ABC1D23'])
  assert.equal(r3.res.novas, 0); assert.equal(r3.enviados.length, 0); assert.equal(t.estado(m2).notificada_origem, 'BASE')
})

test('falha no e-mail: nada é marcado e as mesmas multas saem na rodada seguinte', async () => {
  const t = novoBanco(); const c = t.veiculo('ABC1D23'); t.multa(c, 'ABC1D23', 'A1')
  await rodada(t, ['ABC1D23']) // baseline
  const nova = t.multa(c, 'ABC1D23', 'A2')

  const falha = await rodada(t, ['ABC1D23'], {}, async () => { throw new Error('SMTP fora do ar') })
  assert.equal(falha.res.emailEnviado, false); assert.equal(falha.res.novas, 1); assert.match(falha.res.erroEmail!, /SMTP/)
  assert.equal(t.estado(nova).notificada_em, null)
  assert.equal(t.repo.contarPendentes(), 1)

  const ok = await rodada(t, ['ABC1D23'])
  assert.equal(ok.res.emailEnviado, true); assert.equal(t.repo.contarPendentes(), 0)
})

test('veículo com erro de consulta: sem baseline, multas ignoradas e aviso no e-mail dos demais', async () => {
  const t = novoBanco()
  const a = t.veiculo('AAA1A11'); const b = t.veiculo('BBB2B22')
  t.multa(a, 'AAA1A11', 'A1'); t.multa(b, 'BBB2B22', 'B1')
  const r1 = await rodada(t, ['AAA1A11', 'BBB2B22'], { BBB2B22: false })
  assert.equal(r1.res.comErro, 1); assert.equal(r1.res.veiculosNovosNaBase, 1)
  assert.equal(t.repo.placasComBaseline().has('BBB2B22'), false)

  const novaA = t.multa(a, 'AAA1A11', 'A2')
  const r2 = await rodada(t, ['AAA1A11', 'BBB2B22'], { BBB2B22: false })
  assert.equal(r2.res.novas, 1); assert.match(r2.enviados[0].html, /1 veículo não pôde/)
  assert.ok(t.estado(novaA).notificada_em)
})

test('veículo adicionado depois da base: as multas que já existiam NÃO são avisadas', async () => {
  const t = novoBanco(); const a = t.veiculo('AAA1A11'); t.multa(a, 'AAA1A11', 'A1')
  await rodada(t, ['AAA1A11'])
  const b = t.veiculo('BBB2B22'); t.multa(b, 'BBB2B22', 'B1'); t.multa(b, 'BBB2B22', 'B2')
  const r = await rodada(t, ['AAA1A11', 'BBB2B22'])
  assert.equal(r.res.novas, 0); assert.equal(r.res.multasEmBaseline, 2); assert.equal(r.enviados.length, 0)
})

test('multa inativa não é nova; reativada já avisada não repete; reativada nunca avisada é avisada', async () => {
  const t = novoBanco(); const c = t.veiculo('ABC1D23'); t.multa(c, 'ABC1D23', 'A1')
  await rodada(t, ['ABC1D23'])
  const inativa = t.multa(c, 'ABC1D23', 'A2', 'R$ 1,00', 0)
  assert.equal((await rodada(t, ['ABC1D23'])).res.novas, 0)
  t.db.prepare('UPDATE infracoes_detran_multas SET ativa = 1 WHERE id = ?').run(inativa) // voltou a aparecer
  assert.equal((await rodada(t, ['ABC1D23'])).res.novas, 1)
  t.db.prepare('UPDATE infracoes_detran_multas SET ativa = 0 WHERE id = ?').run(inativa)
  t.db.prepare('UPDATE infracoes_detran_multas SET ativa = 1 WHERE id = ?').run(inativa) // sumiu e voltou de novo
  assert.equal((await rodada(t, ['ABC1D23'])).res.novas, 0)
})

/* ── controle manual ──────────────────────────────────────────────────── */
test('manual: marcar como avisada, desmarcar volta a ser nova, marcar todas', async () => {
  const t = novoBanco(); const c = t.veiculo('ABC1D23'); t.multa(c, 'ABC1D23', 'A1')
  await rodada(t, ['ABC1D23'])
  const x = t.multa(c, 'ABC1D23', 'A2'); const y = t.multa(c, 'ABC1D23', 'A3')
  assert.equal(t.repo.contarPendentes(), 2)
  assert.equal(t.repo.marcarNotificadas([x], 'MANUAL: PC da Maria (1.2.3.4)'), 1)
  assert.equal(t.estado(x).notificada_origem, 'MANUAL: PC da Maria (1.2.3.4)')
  assert.equal(t.repo.marcarNotificadas([x], 'outro'), 0, 'não sobrescreve quem já foi avisada')
  assert.equal(t.repo.desmarcar([x]), 1); assert.equal(t.estado(x).notificada_em, null); assert.equal(t.repo.contarPendentes(), 2)
  assert.equal(t.repo.marcarTodasPendentes('MANUAL: todas'), 2); assert.equal(t.repo.contarPendentes(), 0)
  assert.equal(t.estado(y).notificada_origem, 'MANUAL: todas')
})

test('manual: desmarcar em veículo sem base não inunda — só a escolhida fica pendente', () => {
  const t = novoBanco(); const c = t.veiculo('ZZZ9Z99')
  const a = t.multa(c, 'ZZZ9Z99', 'A1'); t.multa(c, 'ZZZ9Z99', 'A2'); t.multa(c, 'ZZZ9Z99', 'A3')
  t.repo.marcarNotificadas([a], 'MANUAL: x')
  assert.equal(t.repo.desmarcar([a]), 1)
  assert.equal(t.repo.contarPendentes(), 1)
  assert.deepEqual(t.repo.listarPendentes().map((m) => m.ait), ['A1'])
})

test('execuções e agenda gravam/lêem; órfãs são encerradas', () => {
  const t = novoBanco()
  const id = t.repo.iniciarExecucao('MANUAL', 3, 'PC da Maria (1.2.3.4)')
  t.repo.encerrarOrfas()
  assert.equal(t.repo.listarExecucoes(1)[0].status, 'FALHA')
  const id2 = t.repo.iniciarExecucao('AGENDADA', 3, 'Agendador')
  t.repo.finalizarExecucao(id2, { status: 'CONCLUIDA', comErro: 0, novas: 2, emailEnviado: true, mensagem: 'ok' })
  const e = t.repo.listarExecucoes(2)[0]
  assert.equal(e.id, id2); assert.equal(e.novas, 2); assert.equal(e.emailEnviado, true); assert.ok(id < id2)
  assert.equal(t.repo.lerUltimoSlot(), null); t.repo.gravarUltimoSlot('2026-11-24T15:00:00.000Z'); t.repo.gravarUltimoSlot('2026-11-25T15:00:00.000Z')
  assert.equal(t.repo.lerUltimoSlot(), '2026-11-25T15:00:00.000Z')
})

/* ── e-mail ───────────────────────────────────────────────────────────── */
test('e-mail: agrupa por veículo, soma, escapa HTML, singular/plural e texto simples', () => {
  const mk = (placa: string, ait: string, valor: string, motivo = 'Velocidade') => ({ id: 1, placa, modelo: 'M', contrato: 'C', ait, motivo, dataInfracao: '10/11/2026', dataVencimento: '10/12/2026', valorPagar: valor })
  const grupos = agruparPorVeiculo([mk('AAA1A11', '1', 'R$ 100,00'), mk('BBB2B22', '2', 'R$ 500,00'), mk('AAA1A11', '3', 'R$ 50,00')])
  assert.deepEqual(grupos.map((g) => [g.placa, g.centavos, g.multas.length]), [['BBB2B22', 50000, 1], ['AAA1A11', 15000, 2]])
  const um = montarEmailNovasMultas({ dataTexto: '24/11/2026', multas: [mk('AAA1A11', '1', 'R$ 100,00', '<script>alert(1)</script>')], naoVerificados: 0, temLogo: false })
  assert.match(um.assunto, /^1 multa nova no DETRAN-CE \(1 veículo\)/); assert.doesNotMatch(um.html, /<script>/); assert.match(um.html, /&lt;script&gt;/)
  const varias = montarEmailNovasMultas({ dataTexto: '24/11/2026', multas: [mk('A', '1', 'R$ 1,00'), mk('B', '2', 'R$ 2,00')], naoVerificados: 2, temLogo: false })
  assert.match(varias.assunto, /2 multas novas.*2 veículos/); assert.match(varias.html, /2 veículos não puderam/); assert.match(varias.texto, /R\$\s*3,00/)
  assert.doesNotMatch(varias.html + varias.texto, /chassi/i)
})
