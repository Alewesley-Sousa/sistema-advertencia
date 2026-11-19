// apps/detran/src/shared/relatorioContrato.ts
//
// Contrato do relatório em PDF do DETRAN-CE — fonte única de verdade para
// o front (React) e o back (Express). Só tipos e constantes: nada aqui depende
// de Node, React ou Zod. O back valida com Zod (`relatorioSchema.ts`) a partir
// destas mesmas listas.

/* ==========================================================================
 * Enumerações
 * ========================================================================*/

/** De onde o usuário abriu a exportação (aparece no cabeçalho do PDF). */
export const ORIGENS_RELATORIO = ['TABELA', 'RELATORIOS'] as const
export type OrigemRelatorio = (typeof ORIGENS_RELATORIO)[number]

/**
 * Quais veículos, dentre os selecionados, entram no documento.
 * - SELECIONADOS: todos os selecionados;
 * - COM_MULTAS_ATIVAS: só quem tem ao menos 1 multa ativa;
 * - COM_PENDENCIAS: multa ativa OU IPVA em débito OU licenciamento em débito.
 */
export const ESCOPOS_RELATORIO = ['SELECIONADOS', 'COM_MULTAS_ATIVAS', 'COM_PENDENCIAS'] as const
export type EscopoRelatorio = (typeof ESCOPOS_RELATORIO)[number]

/**
 * - POR_VEICULO: um bloco por veículo, com as multas e o subtotal;
 * - LISTA_UNICA: uma única tabela de multas (todas as placas), sem blocos.
 */
export const AGRUPAMENTOS_RELATORIO = ['POR_VEICULO', 'LISTA_UNICA'] as const
export type AgrupamentoRelatorio = (typeof AGRUPAMENTOS_RELATORIO)[number]

/** Ordem dos veículos (só vale para POR_VEICULO). */
export const ORDENACOES_VEICULOS = ['PLACA', 'VALOR_DESC', 'QTD_MULTAS_DESC', 'CONTRATO'] as const
export type OrdenacaoVeiculos = (typeof ORDENACOES_VEICULOS)[number]

/**
 * Ordem das multas (dentro de cada veículo, ou na lista única).
 * O DETRAN não informa "gravidade" da multa, por isso não há ordenação por ela.
 */
export const ORDENACOES_MULTAS = ['VENCIMENTO_ASC', 'VALOR_DESC', 'DATA_INFRACAO_DESC'] as const
export type OrdenacaoMultas = (typeof ORDENACOES_MULTAS)[number]

/* ==========================================================================
 * Seleção de veículos
 * ========================================================================*/

/** Seleção explícita: ids das consultas (infracoes_detran.id). */
export interface SelecaoPorIds {
  modo: 'IDS'
  ids: number[]
}

/**
 * Seleção por filtro, resolvida no servidor ("todos os N filtrados", mesmo os
 * que estão em outras páginas). Os campos espelham os filtros da tabela
 * (`busca`, `status`) e o filtro de contratos da aba Relatórios.
 */
export interface SelecaoPorFiltro {
  modo: 'FILTRO'
  busca?: string
  status?: string
  contratos?: string[]
}

export type SelecaoRelatorio = SelecaoPorIds | SelecaoPorFiltro

/* ==========================================================================
 * Configuração do relatório
 * ========================================================================*/

export interface SecoesRelatorio {
  /** KPIs, valores, quebra por contrato e evolução mensal. */
  resumoConsolidado: boolean
  /** Tabela de multas (AIT, infração, vencimento, valor, boleto). */
  multasDetalhadas: boolean
  /** Situação do IPVA. O DETRAN informa só a situação, não valores. */
  ipva: boolean
  /** Situação do licenciamento. */
  licenciamento: boolean
}

export interface RelatorioPdfConfig {
  origem: OrigemRelatorio
  selecao: SelecaoRelatorio
  escopo: EscopoRelatorio
  secoes: SecoesRelatorio
  agrupamento: AgrupamentoRelatorio
  ordenacaoVeiculos: OrdenacaoVeiculos
  ordenacaoMultas: OrdenacaoMultas
  /** Título do documento (padrão: "Relatório de débitos e multas"). */
  titulo?: string
  /** Texto livre exibido no cabeçalho (ex.: contexto da emissão). */
  observacao?: string
}

/** Resposta de `POST /detran/relatorio-pdf/previa` — o que o PDF conteria. */
export interface RelatorioPrevia {
  /** Veículos selecionados antes do escopo. */
  veiculosSelecionados: number
  /** Veículos que entram no PDF depois do escopo. */
  veiculos: number
  veiculosComMultasAtivas: number
  multasAtivas: number
  valorTotalMultas: number
}

/* ==========================================================================
 * Rótulos (usados pela UI e pelo PDF)
 * ========================================================================*/

export const ROTULOS_ESCOPO: Record<EscopoRelatorio, { titulo: string; descricao: string }> = {
  SELECIONADOS: {
    titulo: 'Todos os selecionados',
    descricao: 'Inclui todos os veículos da seleção, com ou sem multas.',
  },
  COM_MULTAS_ATIVAS: {
    titulo: 'Apenas com multas ativas',
    descricao: 'Veículos que têm ao menos uma multa ativa.',
  },
  COM_PENDENCIAS: {
    titulo: 'Com pendências gerais',
    descricao: 'Multa ativa, IPVA em débito ou licenciamento em débito.',
  },
}

export const ROTULOS_AGRUPAMENTO: Record<AgrupamentoRelatorio, { titulo: string; descricao: string }> = {
  POR_VEICULO: {
    titulo: 'Agrupado por veículo',
    descricao: 'Um bloco por placa, com subtotal de multas.',
  },
  LISTA_UNICA: {
    titulo: 'Lista única de multas',
    descricao: 'Todas as multas em uma só tabela, sem blocos por veículo.',
  },
}

export const ROTULOS_ORDENACAO_VEICULOS: Record<OrdenacaoVeiculos, string> = {
  PLACA: 'Placa (A–Z)',
  VALOR_DESC: 'Maior valor em multas',
  QTD_MULTAS_DESC: 'Maior nº de multas',
  CONTRATO: 'Contrato (A–Z)',
}

export const ROTULOS_ORDENACAO_MULTAS: Record<OrdenacaoMultas, string> = {
  VENCIMENTO_ASC: 'Vencimento mais próximo',
  VALOR_DESC: 'Maior valor',
  DATA_INFRACAO_DESC: 'Infração mais recente',
}

/** Configuração inicial usada pela UI (e valores padrão do back). */
export const CONFIG_PADRAO_RELATORIO: Omit<RelatorioPdfConfig, 'origem' | 'selecao'> = {
  escopo: 'SELECIONADOS',
  secoes: {
    resumoConsolidado: true,
    multasDetalhadas: true,
    ipva: true,
    licenciamento: true,
  },
  agrupamento: 'POR_VEICULO',
  ordenacaoVeiculos: 'PLACA',
  ordenacaoMultas: 'VENCIMENTO_ASC',
}
