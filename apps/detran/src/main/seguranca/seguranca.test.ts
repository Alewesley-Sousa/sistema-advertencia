import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'

import { aplicarRetencao, backupRecente, carimbo, espelharPasta, fazerBackup } from './backup'
import { estaDentroDe } from './caminhoSeguro'
import {
  codigoDoHash, criarServicoDispositivos, criarTabelaDispositivos, hashToken, normalizarCodigo,
} from './dispositivos'
import {
  cabecalhosSeguros, COOKIE_DISPOSITIVO, criarLimitador, criarMiddlewareDispositivo, descreverExecutor, ipDoCliente, lerCookie,
} from './middlewares'

const novoDb = () => { const db = new DatabaseSync(':memory:'); criarTabelaDispositivos(db as any); return db as any }

/* ── fakes de req/res ─────────────────────────────────────────────────── */
function fakeRes() {
  const r: any = { headers: {} as Record<string, string>, locals: {}, statusCode: 200, body: undefined, tipo: '' }
  r.setHeader = (k: string, v: string) => { r.headers[k] = v; return r }
  r.status = (c: number) => { r.statusCode = c; return r }
  r.json = (b: any) => { r.body = b; return r }
  r.type = (t: string) => { r.tipo = t; return r }
  r.send = (b: any) => { r.body = b; return r }
  return r
}
const fakeReq = (over: any = {}) => ({ path: '/api/detran/historico', originalUrl: '/api/detran/historico', method: 'GET',
  headers: { 'user-agent': 'UA' }, socket: { remoteAddress: '127.0.0.1' }, ...over }) as any

/* ── dispositivos ─────────────────────────────────────────────────────── */
test('código: normaliza entradas e rejeita lixo', () => {
  assert.equal(normalizarCodigo('7f3a91c2'), '7F3A-91C2')
  assert.equal(normalizarCodigo(' 7F3A-91C2 '), '7F3A-91C2')
  assert.equal(normalizarCodigo('xyz'), null)
  assert.equal(normalizarCodigo("7F3A-91C2'; DROP TABLE x;--"), null)
  assert.equal(codigoDoHash('7f3a91c2aaaa'), '7F3A-91C2')
})

test('novo dispositivo fica PENDENTE; token não é gravado em claro', () => {
  const db = novoDb(); const s = criarServicoDispositivos(db)
  const r = s.identificar(undefined, { ip: '1.2.3.4', userAgent: 'x' })
  assert.equal(r.estado, 'NOVO')
  if (r.estado !== 'NOVO') return
  const linha = db.prepare('SELECT * FROM dispositivos').get()
  assert.equal(linha.status, 'PENDENTE')
  assert.equal(linha.token_hash, hashToken(r.token))
  assert.ok(!JSON.stringify(linha).includes(r.token), 'o token não pode estar no banco')
  // mesmo cookie de novo => continua pendente, não cria outro
  assert.equal(s.identificar(r.token, { ip: '1.2.3.4' }).estado, 'PENDENTE')
  assert.equal(db.prepare('SELECT COUNT(*) n FROM dispositivos').get().n, 1)
})

test('aprovar libera; revogar bloqueia; cookie inventado vira novo pendente', () => {
  const db = novoDb(); const s = criarServicoDispositivos(db)
  const r: any = s.identificar(undefined, { ip: 'a' })
  assert.equal(s.aprovar(r.dispositivo.codigo.toLowerCase(), '  PC da Maria '), true)
  const ok: any = s.identificar(r.token, { ip: 'a' })
  assert.equal(ok.estado, 'APROVADO'); assert.equal(ok.dispositivo.rotulo, 'PC da Maria')
  assert.equal(s.revogar(r.dispositivo.codigo), true)
  assert.equal(s.identificar(r.token, { ip: 'a' }).estado, 'REVOGADO')
  const falso = s.identificar('a'.repeat(64), { ip: 'x' })
  assert.equal(falso.estado, 'NOVO')
  assert.equal(s.identificar('nao-e-hex', { ip: 'x' }).estado, 'NOVO')
  assert.equal(s.aprovar('0000-0000'), false)
})

test('teto de pendentes contra flood de cadastros', () => {
  const s = criarServicoDispositivos(novoDb(), { maxPendentes: 3 })
  for (let i = 0; i < 3; i++) assert.equal(s.identificar(undefined, { ip: 'x' }).estado, 'NOVO')
  assert.equal(s.identificar(undefined, { ip: 'x' }).estado, 'LOTADO')
})

test('limpeza apaga só pendentes antigos, nunca aprovados', () => {
  const db = novoDb(); const s = criarServicoDispositivos(db)
  const a: any = s.identificar(undefined, { ip: 'a' }); s.aprovar(a.dispositivo.codigo, 'A')
  s.identificar(undefined, { ip: 'b' })
  db.exec(`UPDATE dispositivos SET criado_em = datetime('now','-10 days')`)
  assert.equal(s.limparPendentesAntigos(7), 1)
  assert.equal(s.listar().length, 1)
  assert.equal(s.listar()[0].status, 'APROVADO')
})

/* ── middleware de dispositivo ────────────────────────────────────────── */
test('middleware: sem cookie => 403 + cookie HttpOnly; API devolve JSON, página devolve HTML com o código', () => {
  const s = criarServicoDispositivos(novoDb()); const mw = criarMiddlewareDispositivo(s, { ativo: true, ipsPermitidos: [] })
  let chamou = false
  const res = fakeRes(); mw(fakeReq(), res, () => { chamou = true })
  assert.equal(chamou, false); assert.equal(res.statusCode, 403)
  assert.equal(res.body.error.code, 'DISPOSITIVO_NAO_AUTORIZADO'); assert.match(res.body.error.codigo, /^[0-9A-F]{4}-[0-9A-F]{4}$/)
  assert.match(res.headers['Set-Cookie'], new RegExp(`^${COOKIE_DISPOSITIVO}=[a-f0-9]{64}; Path=/; HttpOnly; SameSite=Strict`))
  const res2 = fakeRes(); mw(fakeReq({ path: '/', originalUrl: '/' }), res2, () => {})
  assert.equal(res2.tipo, 'html'); assert.match(res2.body, /Dispositivo aguardando liberação/)
})

test('middleware: aprovado passa e fica em res.locals; descreverExecutor usa nome + IP', () => {
  const db = novoDb(); const s = criarServicoDispositivos(db); const mw = criarMiddlewareDispositivo(s, { ativo: true, ipsPermitidos: [] })
  const r: any = s.identificar(undefined, { ip: 'x' }); s.aprovar(r.dispositivo.codigo, 'PC da Maria')
  const res = fakeRes(); let ok = false
  mw(fakeReq({ headers: { cookie: `a=1; ${COOKIE_DISPOSITIVO}=${r.token}`, 'cf-connecting-ip': '200.1.2.3' } }), res, () => { ok = true })
  assert.equal(ok, true); assert.equal(descreverExecutor(res), 'PC da Maria (200.1.2.3)')
  assert.equal(descreverExecutor(fakeRes()), 'Acesso local')
})

test('middleware: revogado bloqueia; /api/health é público; desligado deixa passar; IP fora da lista bloqueia', () => {
  const db = novoDb(); const s = criarServicoDispositivos(db)
  const r: any = s.identificar(undefined, { ip: 'x' }); s.aprovar(r.dispositivo.codigo); s.revogar(r.dispositivo.codigo)
  const mw = criarMiddlewareDispositivo(s, { ativo: true, ipsPermitidos: [] })
  const res = fakeRes(); mw(fakeReq({ headers: { cookie: `${COOKIE_DISPOSITIVO}=${r.token}` } }), res, () => assert.fail('não deveria passar'))
  assert.equal(res.body.error.code, 'DISPOSITIVO_REVOGADO')
  let ok = false; mw(fakeReq({ path: '/api/health' }), fakeRes(), () => { ok = true }); assert.equal(ok, true)
  ok = false; criarMiddlewareDispositivo(s, { ativo: false, ipsPermitidos: [] })(fakeReq(), fakeRes(), () => { ok = true }); assert.equal(ok, true)
  const a: any = s.identificar(undefined, { ip: 'y' }); s.aprovar(a.dispositivo.codigo)
  const mwIp = criarMiddlewareDispositivo(s, { ativo: true, ipsPermitidos: ['10.0.0.5'] })
  const res2 = fakeRes(); mwIp(fakeReq({ headers: { cookie: `${COOKIE_DISPOSITIVO}=${a.token}`, 'x-forwarded-for': '8.8.8.8, 1.1.1.1' } }), res2, () => assert.fail('IP fora'))
  assert.equal(res2.body.error.code, 'IP_NAO_PERMITIDO')
  ok = false; mwIp(fakeReq({ headers: { cookie: `${COOKIE_DISPOSITIVO}=${a.token}`, 'x-forwarded-for': '10.0.0.5' } }), fakeRes(), () => { ok = true }); assert.equal(ok, true)
})

test('cookie Secure só atrás de https; lerCookie e ipDoCliente', () => {
  const s = criarServicoDispositivos(novoDb()); const mw = criarMiddlewareDispositivo(s, { ativo: true, ipsPermitidos: [] })
  const res = fakeRes(); mw(fakeReq({ headers: { 'x-forwarded-proto': 'https' } }), res, () => {}); assert.match(res.headers['Set-Cookie'], /; Secure$/)
  assert.equal(lerCookie('a=1; b=2', 'b'), '2'); assert.equal(lerCookie('xb=2', 'b'), undefined); assert.equal(lerCookie(undefined, 'b'), undefined)
  assert.equal(ipDoCliente({}, '::ffff:127.0.0.1'), '127.0.0.1')
  assert.equal(ipDoCliente({ 'x-forwarded-for': '9.9.9.9, 1.1.1.1' }, '127.0.0.1'), '9.9.9.9')
})

/* ── limite ───────────────────────────────────────────────────────────── */
test('limitador: bloqueia acima do máximo com Retry-After e reabre na próxima janela', () => {
  let t = 1_000_000
  const lim = criarLimitador({ janelaMs: 60_000, max: 3, agora: () => t })
  const chamar = (res = fakeRes()) => { let ok = false; lim(fakeReq(), res, () => { ok = true }); return { ok, res } }
  assert.ok(chamar().ok && chamar().ok && chamar().ok)
  const b = chamar(); assert.equal(b.ok, false); assert.equal(b.res.statusCode, 429); assert.ok(Number(b.res.headers['Retry-After']) >= 1)
  t += 60_001; assert.equal(chamar().ok, true)
})

test('limitador: chaves separadas por dispositivo; ignorar() não conta', () => {
  const lim = criarLimitador({ janelaMs: 60_000, max: 1, ignorar: (r) => r.method === 'GET' })
  const com = (id: number) => { const res = fakeRes(); res.locals.dispositivo = { id }; let ok = false; lim(fakeReq({ method: 'POST' }), res, () => { ok = true }); return ok }
  assert.equal(com(1), true); assert.equal(com(1), false); assert.equal(com(2), true)
  for (let i = 0; i < 5; i++) { let ok = false; lim(fakeReq({ method: 'GET' }), fakeRes(), () => { ok = true }); assert.ok(ok) }
})

test('cabeçalhos seguros: API sem cache; HSTS só em https', () => {
  const res = fakeRes(); cabecalhosSeguros(fakeReq({ headers: { 'x-forwarded-proto': 'https' } }), res, () => {})
  assert.equal(res.headers['X-Frame-Options'], 'DENY'); assert.equal(res.headers['Cache-Control'], 'no-store'); assert.ok(res.headers['Strict-Transport-Security'])
  const r2 = fakeRes(); cabecalhosSeguros(fakeReq({ path: '/', headers: {} }), r2, () => {}); assert.equal(r2.headers['Strict-Transport-Security'], undefined); assert.equal(r2.headers['Cache-Control'], undefined)
})

/* ── caminho seguro ───────────────────────────────────────────────────── */
test('estaDentroDe: bloqueia travessia, absolutos fora e a própria pasta', () => {
  const base = path.resolve('/srv/app/storage')
  assert.equal(estaDentroDe(base, path.join(base, 'documentos', 'a.pdf')), true)
  assert.equal(estaDentroDe(base, path.join(base, '..', '.env')), false)
  assert.equal(estaDentroDe(base, path.join(base, 'documentos', '..', '..', 'segredo.txt')), false)
  assert.equal(estaDentroDe(base, path.resolve('/etc/passwd')), false)
  assert.equal(estaDentroDe(base, base), false)
  assert.equal(estaDentroDe(base, ''), false)
  assert.equal(estaDentroDe(base, path.join(base, 'a\0.pdf')), false)
  assert.equal(estaDentroDe(base, path.resolve('/srv/app/storage-evil/a.pdf')), false)
})

/* ── backup ───────────────────────────────────────────────────────────── */
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bk-'))

test('backup: gera arquivo verificado, sem sobras .parcial; falha na verificação não deixa backup', async () => {
  const dir = tmp(); const agora = new Date('2026-11-23T05:30:00Z') // 02:30 em Fortaleza
  const db = { backup: async (d: string) => fs.writeFileSync(d, 'dados') }
  const r = await fazerBackup(db, { pasta: dir, retencaoDias: 14, timeZone: 'America/Fortaleza', agora })
  assert.equal(path.basename(r.arquivo), 'database-20261123-0230.sqlite')
  assert.deepEqual(fs.readdirSync(dir), ['database-20261123-0230.sqlite'])
  await assert.rejects(() => fazerBackup(db, { pasta: dir, retencaoDias: 14, timeZone: 'America/Fortaleza', agora: new Date('2026-11-24T05:30:00Z'),
    verificar: () => { throw new Error('corrompido') } }), /corrompido/)
  assert.deepEqual(fs.readdirSync(dir), ['database-20261123-0230.sqlite'])
  await assert.rejects(() => fazerBackup({ backup: async (d) => fs.writeFileSync(d, '') }, { pasta: dir, retencaoDias: 14, timeZone: 'America/Fortaleza' }), /vazio/)
})

test('retenção: apaga só os antigos, mantém sempre os 3 mais recentes, ignora outros arquivos', () => {
  const dir = tmp(); const agora = new Date('2026-11-23T12:00:00Z')
  for (const n of ['database-20261001-0230.sqlite', 'database-20261010-0230.sqlite', 'database-20261120-0230.sqlite', 'database-20261122-0230.sqlite', 'leia-me.txt']) fs.writeFileSync(path.join(dir, n), 'x')
  const rem = aplicarRetencao(dir, 14, 'America/Fortaleza', agora)
  // 10/10 é o 3º mais recente: protegido pela regra "sempre manter os 3 últimos"
  assert.deepEqual(rem, ['database-20261001-0230.sqlite'])
  assert.ok(fs.existsSync(path.join(dir, 'database-20261010-0230.sqlite')))
  assert.ok(fs.existsSync(path.join(dir, 'leia-me.txt')))
  // só backups antigos: os 3 mais recentes continuam protegidos
  const dir2 = tmp(); for (const n of ['database-20260101-0230.sqlite', 'database-20260102-0230.sqlite', 'database-20260103-0230.sqlite']) fs.writeFileSync(path.join(dir2, n), 'x')
  assert.deepEqual(aplicarRetencao(dir2, 14, 'America/Fortaleza', agora), [])
})

test('espelhar: copia só o novo/alterado, nunca apaga o destino', () => {
  const o = tmp(); const d = path.join(tmp(), 'arquivos')
  fs.mkdirSync(path.join(o, 'sub')); fs.writeFileSync(path.join(o, 'a.pdf'), '1'); fs.writeFileSync(path.join(o, 'sub', 'b.pdf'), '22')
  assert.equal(espelharPasta(o, d), 2); assert.equal(espelharPasta(o, d), 0)
  fs.writeFileSync(path.join(o, 'a.pdf'), '333'); assert.equal(espelharPasta(o, d), 1)
  fs.rmSync(path.join(o, 'sub', 'b.pdf')); espelharPasta(o, d)
  assert.ok(fs.existsSync(path.join(d, 'sub', 'b.pdf')), 'arquivo removido na origem continua no backup')
  assert.equal(espelharPasta(path.join(o, 'nao-existe'), d), 0)
})

test('backupRecente e carimbo no fuso', () => {
  const dir = tmp(); assert.equal(backupRecente(dir, 24), false)
  fs.writeFileSync(path.join(dir, 'database-20261123-0230.sqlite'), 'x'); assert.equal(backupRecente(dir, 24), true)
  assert.equal(backupRecente(dir, 24, Date.now() + 48 * 3_600_000), false)
  assert.deepEqual(carimbo(new Date('2026-11-23T02:00:00Z'), 'America/Fortaleza'), { dia: '20261122', hora: '2300' })
})
