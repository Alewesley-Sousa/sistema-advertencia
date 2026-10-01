export interface MultaDetran {
  ait: string
  motivo: string
  dataInfracao: string
  dataVencimento: string
  valor: string
  valorPagar: string
  caminhoPdf?: string
  erroEmissao?: string
  jaBaixada?: boolean
}

export interface DadosConsultaDetran {
  placa: string
  chassi: string
  aitJaBaixados?: Set<string>
}

export interface ResultadoConsultaDetran {
  sucesso: boolean
  placa: string
  chassi: string
  statusConsulta: 'QUITADO' | 'COM_DEBITO' | 'ERRO'
  tipoDebito?: string
  multas?: MultaDetran[]
  caminhoPdf?: string
  mensagemErro?: string
}