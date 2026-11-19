import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { CONFIG_PADRAO_RELATORIO, type RelatorioPdfConfig } from '../../../../shared/relatorioContrato'
import type { MultaRelatorioRecord, VeiculoRelatorioRecord } from '../repositories/detranRepository'
import { calcularPrevia, dataEmMs, formatarDataBr, montarRelatorio } from './relatorioModelo'
import { validarConfigRelatorio } from './relatorioSchema'

const veiculo = (id: number, placa: string, extra: Partial<VeiculoRelatorioRecord> = {}): VeiculoRelatorioRecord =>
  ({
    id, placa, chassi: null, modelo: 'Modelo', contrato: 'C1',
    statusConsulta: 'COM_DEBITO', ipvaStatus: 'SEM_DEBITO', licenciamentoStatus: 'SEM_DEBITO',
    ...extra,
  }) as VeiculoRelatorioRecord

const multa = (consultaId: number, ait: string, valor: string, venc: string, extra: Partial<MultaRelatorioRecord> = {}): MultaRelatorioRecord =>
  ({
    consultaId, ait, motivo: 'Motivo', dataInfracao: '10/03/2026', dataVencimento: venc,
    valor, valorPagar: valor, caminhoPdf: null, erroEmissao: null, ...extra,
  }) as MultaRelatorioRecord

const cfg = (extra: Partial<RelatorioPdfConfig> = {}): RelatorioPdfConfig => ({
  ...CONFIG_PADRAO_RELATORIO,
  origem: 'TABELA',
  selecao: { modo: 'IDS', ids: [1, 2, 3] },
  ...extra,
})

const hoje = new Date(2026, 5, 15)
const V = [
  veiculo(1, 'BBB2B22'),
  veiculo(2, 'AAA1A11', { contrato: '', ipvaStatus: 'DEBITO' }),
  veiculo(3, 'CCC3C33'),
]
const M = [
  multa(1, 'X1', '100,00', '01/06/2026'),
  multa(1, 'X2', '300,00', '01/08/2026'),
  multa(3, 'X3', '50,00', '01/07/2026'),
]

describe('datas', () => {
  it('lê dd/mm/aaaa e ISO', () => {
    assert.equal(dataEmMs('01/02/2026'), Date.UTC(2026, 1, 1))
    assert.equal(dataEmMs('2026-02-01'), Date.UTC(2026, 1, 1))
    assert.equal(dataEmMs('lixo'), null)
  })
  it('formata ISO como dd/mm/aaaa', () => {
    assert.equal(formatarDataBr('2026-02-01'), '01/02/2026')
    assert.equal(formatarDataBr(''), '—')
  })
})

describe('escopo', () => {
  it('SELECIONADOS mantém todos; COM_MULTAS_ATIVAS só quem tem multa', () => {
    assert.equal(montarRelatorio(cfg(), V, M, hoje).totalVeiculos, 3)
    assert.equal(montarRelatorio(cfg({ escopo: 'COM_MULTAS_ATIVAS' }), V, M, hoje).totalVeiculos, 2)
  })
  it('COM_PENDENCIAS inclui IPVA em débito', () => {
    assert.equal(montarRelatorio(cfg({ escopo: 'COM_PENDENCIAS' }), V, M, hoje).totalVeiculos, 3)
  })
  it('escopo sem resultado marca vazio', () => {
    assert.equal(montarRelatorio(cfg({ escopo: 'COM_MULTAS_ATIVAS' }), [V[1]], [], hoje).vazio, true)
  })
})

describe('ordenação', () => {
  it('por placa', () => {
    const r = montarRelatorio(cfg(), V, M, hoje)
    assert.deepEqual(r.veiculos.map((v) => v.placa), ['AAA1A11', 'BBB2B22', 'CCC3C33'])
  })
  it('por valor desc e contrato (sem contrato por último)', () => {
    const a = montarRelatorio(cfg({ ordenacaoVeiculos: 'VALOR_DESC' }), V, M, hoje)
    assert.equal(a.veiculos[0].placa, 'BBB2B22')
    const b = montarRelatorio(cfg({ ordenacaoVeiculos: 'CONTRATO' }), V, M, hoje)
    assert.equal(b.veiculos[b.veiculos.length - 1].contrato, 'Sem contrato')
  })
  it('multas por vencimento e por valor', () => {
    const a = montarRelatorio(cfg(), V, M, hoje)
    assert.deepEqual(a.veiculos.find((v) => v.placa === 'BBB2B22')!.multas.map((m) => m.ait), ['X1', 'X2'])
    const b = montarRelatorio(cfg({ ordenacaoMultas: 'VALOR_DESC' }), V, M, hoje)
    assert.deepEqual(b.veiculos.find((v) => v.placa === 'BBB2B22')!.multas.map((m) => m.ait), ['X2', 'X1'])
  })
})

describe('totais e agrupamento', () => {
  it('soma valores e marca vencidas', () => {
    const r = montarRelatorio(cfg(), V, M, hoje)
    assert.equal(r.totalMultas, 3)
    assert.match(r.totalValor, /450,00/)
    const bbb = r.veiculos.find((v) => v.placa === 'BBB2B22')!
    assert.equal(bbb.multas[0].vencida, true)
    assert.equal(bbb.multas[1].vencida, false)
  })
  it('lista única ordena globalmente e preenche a relação de situação', () => {
    const r = montarRelatorio(cfg({ agrupamento: 'LISTA_UNICA' }), V, M, hoje)
    assert.equal(r.veiculos.length, 0)
    assert.deepEqual(r.multasLista.map((m) => m.ait), ['X1', 'X3', 'X2'])
    assert.equal(r.relacaoSituacao.length, 3)
  })
  it('seções desligadas não geram resumo', () => {
    const r = montarRelatorio(
      cfg({ secoes: { resumoConsolidado: false, multasDetalhadas: true, ipva: false, licenciamento: false } }),
      V, M, hoje
    )
    assert.equal(r.kpisPrincipais.length, 0)
    assert.equal(r.porContrato.length, 0)
  })
  it('resumo agrupa por contrato e rotula veículos com multas', () => {
    const r = montarRelatorio(cfg(), V, M, hoje)
    assert.ok(r.porContrato.some((c) => c.contrato === 'Sem contrato'))
    assert.ok(r.kpisPrincipais.some((k) => k.rotulo === 'Veículos com multas'))
    assert.ok(!('evolucao' in r))
  })
})

describe('período das multas (semana)', () => {
  const MP = [
    multa(1, 'S1', '100,00', '01/08/2026', { dataInfracao: '14/11/2026' }), // sábado
    multa(1, 'S2', '200,00', '01/08/2026', { dataInfracao: '19/11/2026' }), // sexta (limite)
    multa(2, 'S3', '50,00', '01/08/2026', { dataInfracao: '13/11/2026' }), // fora (sexta anterior)
    multa(3, 'S4', '70,00', '01/08/2026', { dataInfracao: '20/11/2026' }), // depois do período
  ]
  const periodo = { de: '2026-11-14', ate: '2026-11-19' }
  it('detalha só multas do período e some veículos sem multa nele', () => {
    const r = montarRelatorio(cfg({ periodoMultas: periodo }), V, MP, hoje)
    assert.deepEqual(r.veiculos.map((v) => v.placa), ['BBB2B22'])
    assert.deepEqual(r.veiculos[0].multas.map((m) => m.ait).sort(), ['S1', 'S2'])
    assert.equal(r.totalVeiculosDetalhe, 1)
    assert.match(r.totalValor, /300,00/)
    assert.match(r.veiculos[0].subtotalValor, /300,00/)
    assert.equal(r.periodoTexto, '14/11/2026 a 19/11/2026')
  })
  it('o resumo continua com todas as multas ativas', () => {
    const r = montarRelatorio(cfg({ periodoMultas: periodo }), V, MP, hoje)
    assert.equal(r.kpisPrincipais.find((k) => k.rotulo === 'Multas ativas')!.valor, '4')
  })
  it('sem multas no período marca semMultasNoPeriodo', () => {
    const r = montarRelatorio(cfg({ periodoMultas: { de: '2026-01-01', ate: '2026-01-07' } }), V, MP, hoje)
    assert.equal(r.semMultasNoPeriodo, true)
    assert.equal(r.veiculos.length, 0)
  })
  it('schema valida o período', () => {
    const ok = validarConfigRelatorio({ origem: 'AUTOMACAO', selecao: { modo: 'FILTRO' }, periodoMultas: periodo })
    assert.equal(ok.ok, true)
    assert.equal(validarConfigRelatorio({ origem: 'AUTOMACAO', selecao: { modo: 'FILTRO' }, periodoMultas: { de: '2026-11-19', ate: '2026-11-14' } }).ok, false)
  })
})

describe('prévia', () => {
  it('conta conforme o escopo', () => {
    const p = calcularPrevia(cfg({ escopo: 'COM_MULTAS_ATIVAS' }), V, M)
    assert.equal(p.veiculosSelecionados, 3)
    assert.equal(p.veiculos, 2)
    assert.equal(p.multasAtivas, 3)
    assert.equal(p.valorTotalMultas, 450)
  })
})

describe('schema', () => {
  it('aplica padrões', () => {
    const r = validarConfigRelatorio({ origem: 'TABELA', selecao: { modo: 'IDS', ids: [1] } })
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.config.agrupamento, 'POR_VEICULO')
  })
  it('rejeita ids vazios e seções todas desligadas', () => {
    assert.equal(validarConfigRelatorio({ origem: 'TABELA', selecao: { modo: 'IDS', ids: [] } }).ok, false)
    const r = validarConfigRelatorio({
      origem: 'TABELA', selecao: { modo: 'FILTRO' },
      secoes: { resumoConsolidado: false, multasDetalhadas: false, ipva: false, licenciamento: false },
    })
    assert.equal(r.ok, false)
  })
})
