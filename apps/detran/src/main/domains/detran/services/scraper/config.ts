

/* ============================================================================
 * CONFIGURAÇÃO
 * ========================================================================== */

export const TAG = '[DETRAN Scraper]'

export const CONFIG = {
  urls: {
    central:
      'https://sistemas.detran.ce.gov.br/central/',
  },

  seletores: {
    linkTaxasMultas:
      '#taxas_multas, a[data-title="Taxas / Multas"]',

    inputPlaca:
      '#veiculo_placa',

    inputChassi:
      '#veiculo_renavam_chassi',

    btnConfirmar:
      '#submit-veiculo',

    alertaMultas:
      '.alert.multas.links-veiculo-danger, .alert.multas.links-veiculo',

    resultadoVeiculo:
      'h3',

    modalMultas:
      '#outros-servicos-modal',

    tabelaMultas:
      '#emissao-multas',

    checkboxMulta:
      'input.multas',

    btnVerOpcoes:
      '#btn-emitir-extrato',

    btnBaixarBoleto:
      '#btn-exibir-extrato',

    btnVoltarExtrato:
      '#btn-voltar-extrato',

    alertaErroDETRAN:
      '.multas-alert',
  },

  timeouts: {
    navegacao: 60_000,
    padrao: 30_000,
    seletor: 15_000,
    novaAba: 10_000,
    selecao: 5_000,
    emissao: 15_000,
    resultadoConsulta: 5_000,
  },
} as const


/* ============================================================================
 * LOG
 * ========================================================================== */

export function log(...args: unknown[]) {
  console.log(
    TAG,
    new Date().toISOString(),
    ...args
  )
}

export function logErr(...args: unknown[]) {
  console.error(
    TAG,
    new Date().toISOString(),
    ...args
  )
}

/* ============================================================================
 * MEDIÇÃO
 * ========================================================================== */

export async function medirEtapa<T>(
  nome: string,
  fn: () => Promise<T>
): Promise<T> {
  const inicio = performance.now()

  try {
    return await fn()
  } finally {
    const tempo =
      performance.now() - inicio

    log(
      `${nome}: ${tempo.toFixed(0)}ms`
    )
  }
}
