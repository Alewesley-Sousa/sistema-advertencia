import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { randomBytes } from 'node:crypto'

import { carregarChaves, cifrar, decifrar, ErroCofre, gerarChaveBase64 } from './cofre'
import { validarListaVeiculos } from './veiculosSchema'
import { carregarConfigAutomacao, ErroConfigAutomacao, mascararEmail, mascararPlaca } from './automacaoConfig'
import { periodoDaSemana } from './periodoSemana'
import { escaparHtml, montarEmailFalha, montarEmailRelatorio } from './emailTemplate'

const chaves = () => carregarChaves({ DETRAN_COFRE_CHAVE: gerarChaveBase64() } as any)

describe('cofre (AES-256-GCM)', () => {
  it('cifra e decifra', () => {
    const c = chaves()
    const blob = cifrar('{"placa":"ABC1D23"}', c)
    assert.equal(decifrar(blob, c).texto, '{"placa":"ABC1D23"}')
  })
  it('o blob não contém o texto em claro', () => {
    assert.ok(!cifrar('ABC1D23-segredo', chaves()).includes('ABC1D23'))
  })
  it('IV diferente a cada gravação', () => {
    const c = chaves()
    assert.notEqual(cifrar('x', c), cifrar('x', c))
  })
  it('chave errada falha com mensagem genérica', () => {
    const blob = cifrar('PLACA-SECRETA-XYZ', chaves())
    assert.throws(() => decifrar(blob, chaves()), (e: any) => e instanceof ErroCofre && e.codigo === 'DECIFRAR_FALHOU' && !e.message.includes('SECRETA'))
  })
  it('detecta adulteração', () => {
    const c = chaves()
    const env = JSON.parse(cifrar('dados', c))
    const ct = Buffer.from(env.ct, 'base64')
    ct[0] ^= 1
    env.ct = ct.toString('base64')
    assert.throws(() => decifrar(JSON.stringify(env), c), ErroCofre)
  })
  it('rotação: chave anterior ainda abre e sinaliza', () => {
    const antiga = randomBytes(32).toString('base64')
    const blob = cifrar('dados', carregarChaves({ DETRAN_COFRE_CHAVE: antiga } as any))
    const nova = carregarChaves({ DETRAN_COFRE_CHAVE: gerarChaveBase64(), DETRAN_COFRE_CHAVE_ANTERIOR: antiga } as any)
    const r = decifrar(blob, nova)
    assert.equal(r.texto, 'dados')
    assert.equal(r.usouChaveAnterior, true)
  })
  it('exige chave e valida tamanho', () => {
    assert.throws(() => carregarChaves({} as any), (e: any) => e.codigo === 'CHAVE_AUSENTE')
    assert.throws(() => carregarChaves({ DETRAN_COFRE_CHAVE: 'curta' } as any), (e: any) => e.codigo === 'CHAVE_INVALIDA')
  })
  it('aceita senha longa (scrypt) e a mesma senha decifra', () => {
    const env = { DETRAN_COFRE_SENHA: 'uma-senha-bem-longa-123' } as any
    assert.equal(decifrar(cifrar('ok', carregarChaves(env)), carregarChaves(env)).texto, 'ok')
  })
})

describe('lista de veículos', () => {
  it('normaliza, remove duplicadas e descarta inválidas sem expor conteúdo', () => {
    const r = validarListaVeiculos([
      { placa: 'abc-1d23', chassi: '9bw123456', contrato: 'CT-1' },
      { placa: 'ABC1D23', chassi: '9BW123456' },
      { placa: 'X', chassi: '' },
    ])
    assert.equal(r.veiculos.length, 1)
    assert.equal(r.veiculos[0].placa, 'ABC1D23')
    assert.equal(r.duplicadas, 1)
    assert.deepEqual(r.rejeitadas.map((x) => x.linha), [3])
    assert.ok(!JSON.stringify(r.rejeitadas).includes('X'))
  })
  it('rejeita lista vazia e sem nenhum válido', () => {
    assert.throws(() => validarListaVeiculos([]))
    assert.throws(() => validarListaVeiculos([{ placa: '', chassi: '' }]))
  })
})

const envOk = {
  DETRAN_AUTOMACAO_ATIVA: 'true', SMTP_HOST: 'smtp.x.com', SMTP_USER: 'u', SMTP_PASS: 'p',
  EMAIL_FROM: 'R <r@x.com>', EMAIL_TO: 'a@x.com, b@x.com',
} as any

describe('configuração', () => {
  it('desligada não exige nada', () => {
    assert.deepEqual(carregarConfigAutomacao({} as any), { ativa: false })
  })
  it('aplica padrões e separa destinatários', () => {
    const c: any = carregarConfigAutomacao(envOk)
    assert.equal(c.cron, '0 7 * * 5')
    assert.equal(c.smtp.port, 587)
    assert.deepEqual(c.email.to, ['a@x.com', 'b@x.com'])
    assert.deepEqual(c.email.alerta, c.email.to)
  })
  it('lista todos os problemas sem vazar valores', () => {
    try {
      carregarConfigAutomacao({ DETRAN_AUTOMACAO_ATIVA: 'true', SMTP_PASS: 'segredo123', EMAIL_TO: 'invalido' } as any)
      assert.fail()
    } catch (e: any) {
      assert.ok(e instanceof ErroConfigAutomacao)
      assert.ok(e.problemas.length >= 3)
      assert.ok(!e.message.includes('segredo123'))
    }
  })
  it('valida cron, fuso e concorrência', () => {
    assert.throws(() => carregarConfigAutomacao({ ...envOk, DETRAN_AUTOMACAO_CRON: 'abc' }), ErroConfigAutomacao)
    assert.throws(() => carregarConfigAutomacao({ ...envOk, DETRAN_AUTOMACAO_TZ: 'Marte/Olimpo' }), ErroConfigAutomacao)
    assert.throws(() => carregarConfigAutomacao({ ...envOk, DETRAN_AUTOMACAO_CONCORRENCIA: '5' }), ErroConfigAutomacao)
  })
  it('máscaras de log', () => {
    assert.equal(mascararEmail('joao@empresa.com'), 'jo***@empresa.com')
    assert.equal(mascararPlaca('ABC1D23'), 'ABC****')
  })
})

describe('e-mail', () => {
  const base = { dataTexto: '19/11/2026', totalVeiculos: 55, veiculosComMultas: 12, multasAtivas: 20, valorTotal: 'R$ 4.500,00', consultasComErro: 0, temLogo: true, temGif: true }
  it('usa imagens por CID e tem versão texto', () => {
    const m = montarEmailRelatorio(base)
    assert.match(m.html, /src="cid:logo-force@detran"/)
    assert.match(m.html, /src="cid:banner-force@detran"/)
    assert.ok(!/src="https?:/.test(m.html))
    assert.match(m.texto, /Multas ativas: 20/)
  })
  it('sem logo/gif não deixa imagem quebrada', () => {
    const m = montarEmailRelatorio({ ...base, temLogo: false, temGif: false })
    assert.ok(!m.html.includes('cid:'))
  })
  it('avisa sobre consultas com erro', () => {
    assert.match(montarEmailRelatorio({ ...base, consultasComErro: 3 }).html, /3 veículo\(s\) não puderam/)
  })
  it('escapa HTML do motivo da falha', () => {
    const m = montarEmailFalha({ dataTexto: 'x', motivo: '<script>alert(1)</script>', temLogo: false })
    assert.ok(!m.html.includes('<script>'))
    assert.equal(escaparHtml('<&>'), '&lt;&amp;&gt;')
  })
})

describe('período da semana', () => {
  const tz = 'America/Fortaleza'
  it('sexta: sábado anterior até a própria sexta', () => {
    assert.deepEqual(periodoDaSemana(tz, new Date('2026-11-19T10:00:00Z')), { de: '2026-11-14', ate: '2026-11-19' })
  })
  it('quarta: sábado mais recente até hoje', () => {
    assert.deepEqual(periodoDaSemana(tz, new Date('2026-11-18T15:00:00Z')), { de: '2026-11-14', ate: '2026-11-18' })
  })
  it('sábado: usa o sábado da semana anterior', () => {
    assert.deepEqual(periodoDaSemana(tz, new Date('2026-11-21T15:00:00Z')), { de: '2026-11-14', ate: '2026-11-21' })
  })
  it('respeita o fuso (madrugada UTC ainda é o dia anterior em Fortaleza)', () => {
    assert.deepEqual(periodoDaSemana(tz, new Date('2026-11-20T01:00:00Z')), { de: '2026-11-14', ate: '2026-11-19' })
  })
})
