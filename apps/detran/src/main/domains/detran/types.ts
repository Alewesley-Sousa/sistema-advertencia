export interface MultaDetran {
  ait: string
  motivo: string
  dataInfracao: string
  dataVencimento: string
  valor: string
  valorPagar: string
  caminhoPdf?: string
  erroEmissao?: string
  /**
   * Marcada pelo orquestrador quando a multa já foi baixada HOJE.
   * Multas com `jaBaixada: true` são filtradas em `salvarMultas`.
   */
  jaBaixada?: boolean
}

export interface DadosConsultaDetran {
  placa: string
  chassi: string
  /**
   * Conjunto de chaves "AIT|DATA_INFRACAO" já baixadas no dia corrente (local).
   * Multas cuja chave esteja aqui são puladas pelo scraper.
   */
  aitJaBaixados?: Set<string>
}

export type SituacaoDebito =
  | 'DEBITO'
  | 'SEM_DEBITO'
  | 'INFORMACAO'
  | 'DESCONHECIDO'

export interface SituacaoDebitosVeiculo {
  ipva: SituacaoDebito
  licenciamento: SituacaoDebito
}

export interface ResultadoConsultaDetran {
  sucesso: boolean
  placa: string
  chassi: string
  statusConsulta: 'QUITADO' | 'COM_DEBITO' | 'ERRO'
  tipoDebito?: string
  multas?: MultaDetran[]
  debitos?: SituacaoDebitosVeiculo
  caminhoPdf?: string
  mensagemErro?: string
  /**
   * `true` SOMENTE quando o scraper percorreu o caminho feliz e confirmou
   * explicitamente que o veículo não tem multas (página de resultado
   * apareceu, tabela foi lida com sucesso e está vazia).
   *
   * `undefined`/`false` em timeout, erro controlado, alerta do DETRAN
   * ou qualquer estado ambíguo.
   *
   * Gate obrigatório para a limpeza automática (Etapa 5).
   */
  confirmacaoLimpa?: boolean
}