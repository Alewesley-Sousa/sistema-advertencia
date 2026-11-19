// apps/detran/src/main/domains/detran/relatorio/relatorioModelo.ts
//
// Monta o "view model" do relatório em PDF a partir dos registros do banco e da
// configuração escolhida. É uma função pura (sem banco, sem Puppeteer): tudo o
// que o template precisa já sai formatado daqui (moeda, datas, rótulos, classes
// CSS), o que mantém o template Handlebars sem helpers nem lógica.

import {
  mesDaInfracao,
  mesesEntre,
  valorDetranEmCentavos,
} from '../utils'
import type {
  MultaRelatorioRecord,
  VeiculoRelatorioRecord,
} from '../repositories/detranRepository'
import {
  ROTULOS_AGRUPAMENTO,
  ROTULOS_ESCOPO,
  ROTULOS_ORDENACAO_MULTAS,
  ROTULOS_ORDENACAO_VEICULOS,
  type RelatorioPdfConfig,
  type RelatorioPrevia,
} from '../../../../shared/relatorioContrato'

/* ==========================================================================
 * Tipos do view model (consumidos pelo template)
 * ========================================================================*/

export interface ChipView {
  texto: string
  /** chip-ok | chip-erro | chip-aviso | chip-info | chip-neutro */
  classe: string
}

export interface MultaView {
  placa: string
  modelo: string
  contrato: string
  ait: string
  motivo: string
  dataInfracao: string
  dataVencimento: string
  /** true quando o vencimento já passou (destaque discreto no PDF). */
  vencida: boolean
  valor: string
  valorPagar: string
  boleto: ChipView
}

export interface VeiculoView {
  placa: string
  modelo: string
  contrato: string
  chassi: string
  situacao: ChipView
  ipva: ChipView
  licenciamento: ChipView
  qtdMultas: number
  temMultas: boolean
  /** Blocos com muitas multas podem quebrar de página (cabeçalho da tabela se repete). */
  classeBloco: 'veiculo' | 'veiculo veiculo--longo'
  multas: MultaView[]
  subtotalValor: string
  subtotalValorPagar: string
}

export interface KpiView {
  rotulo: string
  valor: string
  detalhe: string
}

export interface LinhaContratoView {
  contrato: string
  veiculos: number
  multas: number
  valor: string
}

export interface MesEvolucaoView {
  rotulo: string
  qtd: number
  valor: string
  /** Largura da barra em % (0–100). */
  largura: number
}

export interface LinhaSituacaoView {
  placa: string
  modelo: string
  contrato: string
  ipva: ChipView
  licenciamento: ChipView
}

export interface RelatorioView {
  titulo: string
  emitidoEm: string
  origemTexto: string
  escopoTexto: string
  selecaoTexto: string
  ordenacaoTexto: string
  observacao: string

  porVeiculo: boolean
  listaUnica: boolean
  mostrarResumo: boolean
  mostrarMultas: boolean
  mostrarIpva: boolean
  mostrarLicenciamento: boolean
  /** Tabela de situação IPVA/licenciamento (só na lista única; no agrupado vira chip do bloco). */
  mostrarRelacaoSituacao: boolean

  kpisPrincipais: KpiView[]
  kpisSecundarios: KpiView[]
  porContrato: LinhaContratoView[]
  evolucao: MesEvolucaoView[]
  evolucaoSemData: number

  veiculos: VeiculoView[]
  multasLista: MultaView[]
  relacaoSituacao: LinhaSituacaoView[]

  totalVeiculos: number
  totalMultas: number
  totalValor: string
  totalValorPagar: string
  vazio: boolean

  /** Preenchidos pelo serviço de renderização (arquivos de public/). */
  logoDataUri: string
  fontFaceCss: string
}

/* ==========================================================================
 * Formatação
 * ========================================================================*/

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const inteiro = new Intl.NumberFormat('pt-BR')

export function formatarMoeda(centavos: number): string {
  return moeda.format(centavos / 100)
}

/** Valor "como veio do DETRAN"; vazio vira "—". */
function formatarValorDetran(bruto: string | null | undefined): string {
  if (bruto == null || String(bruto).trim() === '') return '—'
  return formatarMoeda(valorDetranEmCentavos(bruto))
}

/** Converte "dd/mm/aaaa [hh:mm]" ou ISO para milissegundos UTC; null se ilegível. */
export function dataEmMs(texto: string | null | undefined): number | null {
  const t = String(texto ?? '').trim()
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D+(\d{1,2}):(\d{2}))?/)
  if (br) {
    return Date.UTC(+br[3], +br[2] - 1, +br[1], +(br[4] ?? 0), +(br[5] ?? 0))
  }
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/)
  if (iso) {
    return Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] ?? 0), +(iso[5] ?? 0))
  }
  return null
}

/** Exibe a data como o DETRAN (dd/mm/aaaa); ISO é convertida; ilegível vira "—". */
export function formatarDataBr(texto: string | null | undefined): string {
  const t = String(texto ?? '').trim()
  if (!t) return '—'
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(t)) return t
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2}))?/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}${iso[4] ? ` ${iso[4]}` : ''}`
  return t
}

function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number)
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${nomes[m - 1]}/${ano}`
}

function formatarEmissao(agora: Date): string {
  const d = agora.toLocaleDateString('pt-BR')
  const h = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${d} às ${h}`
}

/* ==========================================================================
 * Rótulos de situação
 * ========================================================================*/

function chipDebito(status: string | null | undefined): ChipView {
  switch (status) {
    case 'DEBITO':
      return { texto: 'Em débito', classe: 'chip-erro' }
    case 'SEM_DEBITO':
      return { texto: 'Regular', classe: 'chip-ok' }
    case 'INFORMACAO':
      return { texto: 'Informativo', classe: 'chip-info' }
    default:
      return { texto: 'Não identificado', classe: 'chip-neutro' }
  }
}

function chipSituacaoConsulta(status: string | null | undefined): ChipView {
  switch (status) {
    case 'QUITADO':
      return { texto: 'Quitado', classe: 'chip-ok' }
    case 'COM_DEBITO':
      return { texto: 'Com débito', classe: 'chip-erro' }
    case 'ERRO':
      return { texto: 'Erro na consulta', classe: 'chip-aviso' }
    case 'PROCESSANDO':
      return { texto: 'Processando', classe: 'chip-info' }
    default:
      return { texto: 'Pendente', classe: 'chip-neutro' }
  }
}

function chipBoleto(m: MultaRelatorioRecord): ChipView {
  if (m.caminhoPdf) return { texto: 'Disponível', classe: 'chip-ok' }
  if (m.erroEmissao) return { texto: 'Indisponível', classe: 'chip-aviso' }
  return { texto: 'Pendente', classe: 'chip-neutro' }
}

/* ==========================================================================
 * Escopo e ordenação
 * ========================================================================*/

interface VeiculoComMultas {
  veiculo: VeiculoRelatorioRecord
  multas: MultaRelatorioRecord[]
  valorCentavos: number
  valorPagarCentavos: number
}

function agruparPorVeiculo(
  veiculos: VeiculoRelatorioRecord[],
  multas: MultaRelatorioRecord[]
): VeiculoComMultas[] {
  const porConsulta = new Map<number, MultaRelatorioRecord[]>()
  for (const m of multas) {
    const lista = porConsulta.get(m.consultaId) ?? []
    lista.push(m)
    porConsulta.set(m.consultaId, lista)
  }

  return veiculos.map((veiculo) => {
    const lista = porConsulta.get(veiculo.id) ?? []
    return {
      veiculo,
      multas: lista,
      valorCentavos: lista.reduce((t, m) => t + valorDetranEmCentavos(m.valor), 0),
      valorPagarCentavos: lista.reduce((t, m) => t + valorDetranEmCentavos(m.valorPagar), 0),
    }
  })
}

function atendeEscopo(item: VeiculoComMultas, escopo: RelatorioPdfConfig['escopo']): boolean {
  const comMulta = item.multas.length > 0
  switch (escopo) {
    case 'COM_MULTAS_ATIVAS':
      return comMulta
    case 'COM_PENDENCIAS':
      return (
        comMulta ||
        item.veiculo.ipvaStatus === 'DEBITO' ||
        item.veiculo.licenciamentoStatus === 'DEBITO'
      )
    default:
      return true
  }
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

function ordenarVeiculos(
  itens: VeiculoComMultas[],
  ordem: RelatorioPdfConfig['ordenacaoVeiculos']
): VeiculoComMultas[] {
  const porPlaca = (a: VeiculoComMultas, b: VeiculoComMultas) =>
    collator.compare(a.veiculo.placa, b.veiculo.placa)

  return [...itens].sort((a, b) => {
    switch (ordem) {
      case 'VALOR_DESC':
        return b.valorCentavos - a.valorCentavos || porPlaca(a, b)
      case 'QTD_MULTAS_DESC':
        return b.multas.length - a.multas.length || porPlaca(a, b)
      case 'CONTRATO': {
        const ca = (a.veiculo.contrato ?? '').trim()
        const cb = (b.veiculo.contrato ?? '').trim()
        if (!ca && cb) return 1 // sem contrato vai para o fim
        if (ca && !cb) return -1
        return collator.compare(ca, cb) || porPlaca(a, b)
      }
      default:
        return porPlaca(a, b)
    }
  })
}

function ordenarMultas(
  multas: MultaRelatorioRecord[],
  ordem: RelatorioPdfConfig['ordenacaoMultas']
): MultaRelatorioRecord[] {
  // Datas ilegíveis vão sempre para o fim, em qualquer sentido.
  const nulosPorUltimo = (a: number | null, b: number | null, cmp: (x: number, y: number) => number) => {
    if (a == null && b == null) return 0
    if (a == null) return 1
    if (b == null) return -1
    return cmp(a, b)
  }

  return [...multas].sort((a, b) => {
    let r = 0
    switch (ordem) {
      case 'VALOR_DESC':
        r = valorDetranEmCentavos(b.valor) - valorDetranEmCentavos(a.valor)
        break
      case 'DATA_INFRACAO_DESC':
        r = nulosPorUltimo(dataEmMs(a.dataInfracao), dataEmMs(b.dataInfracao), (x, y) => y - x)
        break
      default:
        r = nulosPorUltimo(dataEmMs(a.dataVencimento), dataEmMs(b.dataVencimento), (x, y) => x - y)
    }
    return r || collator.compare(a.ait, b.ait)
  })
}

/* ==========================================================================
 * Conversão para as views
 * ========================================================================*/

function inicioDoDia(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

function multaParaView(
  m: MultaRelatorioRecord,
  v: VeiculoRelatorioRecord,
  hoje: number
): MultaView {
  const venc = dataEmMs(m.dataVencimento)
  return {
    placa: v.placa,
    modelo: v.modelo?.trim() || '—',
    contrato: v.contrato?.trim() || 'Sem contrato',
    ait: m.ait,
    motivo: (m.motivo ?? '').trim() || '—',
    dataInfracao: formatarDataBr(m.dataInfracao),
    dataVencimento: formatarDataBr(m.dataVencimento),
    vencida: venc != null && venc < hoje,
    valor: formatarValorDetran(m.valor),
    valorPagar: formatarValorDetran(m.valorPagar),
    boleto: chipBoleto(m),
  }
}

const LIMITE_BLOCO_LONGO = 8

/* ==========================================================================
 * Textos de contexto
 * ========================================================================*/

function descreverSelecao(config: RelatorioPdfConfig, total: number): string {
  if (config.selecao.modo === 'IDS') {
    return `${inteiro.format(total)} veículo(s) selecionado(s) manualmente`
  }
  const partes: string[] = []
  if (config.selecao.busca) partes.push(`busca “${config.selecao.busca}”`)
  if (config.selecao.status) {
    partes.push(
      config.selecao.status === 'COM_DEBITOS'
        ? 'situação: com débito (IPVA/licenciamento)'
        : `situação: ${chipSituacaoConsulta(config.selecao.status).texto.toLowerCase()}`
    )
  }
  if (config.selecao.contratos?.length) {
    partes.push(`contratos: ${config.selecao.contratos.map((c) => (c === '__SEM_CONTRATO__' ? 'S/C' : c)).join(', ')}`)
  }
  return partes.length ? `Filtro aplicado — ${partes.join(' · ')}` : 'Todo o histórico de consultas'
}

/* ==========================================================================
 * API pública
 * ========================================================================*/

/** O que o PDF conteria — usado pela prévia do configurador (sem gerar o arquivo). */
export function calcularPrevia(
  config: RelatorioPdfConfig,
  veiculos: VeiculoRelatorioRecord[],
  multas: MultaRelatorioRecord[]
): RelatorioPrevia {
  const todos = agruparPorVeiculo(veiculos, multas)
  const noEscopo = todos.filter((item) => atendeEscopo(item, config.escopo))
  return {
    veiculosSelecionados: todos.length,
    veiculos: noEscopo.length,
    veiculosComMultasAtivas: noEscopo.filter((i) => i.multas.length > 0).length,
    multasAtivas: noEscopo.reduce((t, i) => t + i.multas.length, 0),
    valorTotalMultas: noEscopo.reduce((t, i) => t + i.valorCentavos, 0) / 100,
  }
}

export function montarRelatorio(
  config: RelatorioPdfConfig,
  veiculos: VeiculoRelatorioRecord[],
  multas: MultaRelatorioRecord[],
  agora: Date = new Date()
): RelatorioView {
  const todos = agruparPorVeiculo(veiculos, multas)
  const noEscopo = todos.filter((item) => atendeEscopo(item, config.escopo))
  const ordenados = ordenarVeiculos(noEscopo, config.ordenacaoVeiculos)
  const hoje = inicioDoDia(agora)

  const porVeiculo = config.agrupamento === 'POR_VEICULO'
  const { secoes } = config

  /* ---- blocos por veículo ---- */
  const veiculosView: VeiculoView[] = ordenados.map((item) => {
    const multasOrdenadas = ordenarMultas(item.multas, config.ordenacaoMultas)
    return {
      placa: item.veiculo.placa,
      modelo: item.veiculo.modelo?.trim() || '—',
      contrato: item.veiculo.contrato?.trim() || 'Sem contrato',
      chassi: item.veiculo.chassi || '—',
      situacao: chipSituacaoConsulta(item.veiculo.statusConsulta),
      ipva: chipDebito(item.veiculo.ipvaStatus),
      licenciamento: chipDebito(item.veiculo.licenciamentoStatus),
      qtdMultas: item.multas.length,
      temMultas: item.multas.length > 0,
      classeBloco: multasOrdenadas.length > LIMITE_BLOCO_LONGO ? 'veiculo veiculo--longo' : 'veiculo',
      multas: multasOrdenadas.map((m) => multaParaView(m, item.veiculo, hoje)),
      subtotalValor: formatarMoeda(item.valorCentavos),
      subtotalValorPagar: formatarMoeda(item.valorPagarCentavos),
    }
  })

  /* ---- lista única (todas as multas, ordenadas globalmente) ---- */
  const multasLista: MultaView[] = []
  if (!porVeiculo) {
    const porId = new Map(ordenados.map((i) => [i.veiculo.id, i.veiculo]))
    const todasMultas = ordenados.flatMap((i) => i.multas)
    for (const m of ordenarMultas(todasMultas, config.ordenacaoMultas)) {
      const v = porId.get(m.consultaId)
      if (v) multasLista.push(multaParaView(m, v, hoje))
    }
  }

  /* ---- relação de situação (lista única) ---- */
  const relacaoSituacao: LinhaSituacaoView[] =
    !porVeiculo && (secoes.ipva || secoes.licenciamento)
      ? ordenados.map((i) => ({
          placa: i.veiculo.placa,
          modelo: i.veiculo.modelo?.trim() || '—',
          contrato: i.veiculo.contrato?.trim() || 'Sem contrato',
          ipva: chipDebito(i.veiculo.ipvaStatus),
          licenciamento: chipDebito(i.veiculo.licenciamentoStatus),
        }))
      : []

  /* ---- totais ---- */
  const totalMultas = ordenados.reduce((t, i) => t + i.multas.length, 0)
  const totalCentavos = ordenados.reduce((t, i) => t + i.valorCentavos, 0)
  const totalPagarCentavos = ordenados.reduce((t, i) => t + i.valorPagarCentavos, 0)

  /* ---- resumo consolidado ---- */
  let kpisPrincipais: KpiView[] = []
  let kpisSecundarios: KpiView[] = []
  let porContrato: LinhaContratoView[] = []
  let evolucao: MesEvolucaoView[] = []
  let evolucaoSemData = 0

  if (secoes.resumoConsolidado) {
    const comMultas = ordenados.filter((i) => i.multas.length > 0).length
    const ipvaDebito = ordenados.filter((i) => i.veiculo.ipvaStatus === 'DEBITO').length
    const licDebito = ordenados.filter((i) => i.veiculo.licenciamentoStatus === 'DEBITO').length
    const boletos = ordenados.reduce((t, i) => t + i.multas.filter((m) => !!m.caminhoPdf).length, 0)
    const vencidas = ordenados.reduce(
      (t, i) =>
        t +
        i.multas.filter((m) => {
          const v = dataEmMs(m.dataVencimento)
          return v != null && v < hoje
        }).length,
      0
    )
    const comValorPagar = ordenados.reduce(
      (t, i) => t + i.multas.filter((m) => String(m.valorPagar ?? '').trim() !== '').length,
      0
    )

    kpisPrincipais = [
      {
        rotulo: 'Veículos no relatório',
        valor: inteiro.format(ordenados.length),
        detalhe: `${ROTULOS_ESCOPO[config.escopo].titulo.toLowerCase()}`,
      },
      {
        rotulo: 'Com multas ativas',
        valor: inteiro.format(comMultas),
        detalhe: `${inteiro.format(ordenados.length - comMultas)} sem multas ativas`,
      },
      {
        rotulo: 'Multas ativas',
        valor: inteiro.format(totalMultas),
        detalhe: vencidas > 0 ? `${inteiro.format(vencidas)} com vencimento passado` : 'nenhuma vencida',
      },
      {
        rotulo: 'Valor das multas',
        valor: formatarMoeda(totalCentavos),
        detalhe: 'soma dos valores informados',
      },
    ]
    kpisSecundarios = [
      {
        rotulo: 'Valor a pagar',
        valor: formatarMoeda(totalPagarCentavos),
        detalhe: `em ${inteiro.format(comValorPagar)} multa(s) com valor a pagar`,
      },
      {
        rotulo: 'IPVA em débito',
        valor: inteiro.format(ipvaDebito),
        detalhe: `de ${inteiro.format(ordenados.length)} veículo(s)`,
      },
      {
        rotulo: 'Licenciamento em débito',
        valor: inteiro.format(licDebito),
        detalhe: `de ${inteiro.format(ordenados.length)} veículo(s)`,
      },
      {
        rotulo: 'Boletos disponíveis',
        valor: inteiro.format(boletos),
        detalhe: `de ${inteiro.format(totalMultas)} multa(s) ativa(s)`,
      },
    ]

    /* por contrato */
    const contratos = new Map<string, { veiculos: number; multas: number; centavos: number }>()
    for (const i of ordenados) {
      const nome = i.veiculo.contrato?.trim() || 'Sem contrato'
      const atual = contratos.get(nome) ?? { veiculos: 0, multas: 0, centavos: 0 }
      atual.veiculos++
      atual.multas += i.multas.length
      atual.centavos += i.valorCentavos
      contratos.set(nome, atual)
    }
    porContrato = Array.from(contratos.entries())
      .sort((a, b) => b[1].centavos - a[1].centavos || collator.compare(a[0], b[0]))
      .map(([contrato, v]) => ({
        contrato,
        veiculos: v.veiculos,
        multas: v.multas,
        valor: formatarMoeda(v.centavos),
      }))

    /* evolução mensal (mês da infração) */
    const meses = new Map<string, { qtd: number; centavos: number }>()
    for (const i of ordenados) {
      for (const m of i.multas) {
        const mes = mesDaInfracao(m.dataInfracao)
        if (!mes) {
          evolucaoSemData++
          continue
        }
        const atual = meses.get(mes) ?? { qtd: 0, centavos: 0 }
        atual.qtd++
        atual.centavos += valorDetranEmCentavos(m.valor)
        meses.set(mes, atual)
      }
    }
    const chaves = Array.from(meses.keys()).sort()
    if (chaves.length) {
      const todosMeses = mesesEntre(chaves[0], chaves[chaves.length - 1])
      const maior = Math.max(...todosMeses.map((mes) => meses.get(mes)?.centavos ?? 0), 0)
      evolucao = todosMeses.map((mes) => {
        const v = meses.get(mes) ?? { qtd: 0, centavos: 0 }
        const largura = maior > 0 && v.centavos > 0 ? Math.max(3, Math.round((v.centavos / maior) * 100)) : 0
        return { rotulo: rotuloMes(mes), qtd: v.qtd, valor: formatarMoeda(v.centavos), largura }
      })
    }
  }

  /* ---- textos de contexto ---- */
  const ordenacaoTexto = porVeiculo
    ? `Veículos: ${ROTULOS_ORDENACAO_VEICULOS[config.ordenacaoVeiculos]} · Multas: ${ROTULOS_ORDENACAO_MULTAS[config.ordenacaoMultas]}`
    : `Multas: ${ROTULOS_ORDENACAO_MULTAS[config.ordenacaoMultas]}`

  return {
    titulo: config.titulo?.trim() || 'Relatório de débitos e multas',
    emitidoEm: formatarEmissao(agora),
    origemTexto:
      config.origem === 'RELATORIOS'
        ? 'Aba Relatórios'
        : config.origem === 'AUTOMACAO'
          ? 'Automação semanal'
          : 'Tabela de consultas',
    escopoTexto: `${ROTULOS_ESCOPO[config.escopo].titulo} · ${ROTULOS_AGRUPAMENTO[config.agrupamento].titulo}`,
    selecaoTexto: descreverSelecao(config, todos.length),
    ordenacaoTexto,
    observacao: config.observacao?.trim() ?? '',

    porVeiculo,
    listaUnica: !porVeiculo,
    mostrarResumo: secoes.resumoConsolidado,
    mostrarMultas: secoes.multasDetalhadas,
    mostrarIpva: secoes.ipva,
    mostrarLicenciamento: secoes.licenciamento,
    mostrarRelacaoSituacao: relacaoSituacao.length > 0,

    kpisPrincipais,
    kpisSecundarios,
    porContrato,
    evolucao,
    evolucaoSemData,

    veiculos: porVeiculo ? veiculosView : [],
    multasLista: secoes.multasDetalhadas ? multasLista : [],
    relacaoSituacao,

    totalVeiculos: ordenados.length,
    totalMultas,
    totalValor: formatarMoeda(totalCentavos),
    totalValorPagar: formatarMoeda(totalPagarCentavos),
    vazio: ordenados.length === 0,

    logoDataUri: '',
    fontFaceCss: '',
  }
}
