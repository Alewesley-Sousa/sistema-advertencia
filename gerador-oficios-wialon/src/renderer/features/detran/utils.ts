// src/renderer/features/detran/utils.ts

import type { MultaDetran } from './services/detran'
import type { BoletoStatus, ResumoBoletos } from './types'

/* ==========================================================================
 * Normalização de placa / chassi
 * ======================================================================== */

/**
 * Normaliza uma placa removendo tudo que não é letra ou número e
 * deixando em caixa alta.
 *
 *   "abc-1234"   → "ABC1234"
 *   "abc 1d23"   → "ABC1D23"
 *   "ABC.1234"   → "ABC1234"
 *   "abc1d23"    → "ABC1D23"
 *
 * O DETRAN não aceita hífen, espaço nem ponto — só 7 caracteres alfanuméricos.
 */
export function normalizarPlaca(valor: string): string {
  return (valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Normaliza um chassi (ou RENAVAM) removendo tudo que não é letra ou número.
 *
 *   "9535-V6TB-9PR0-48086" → "9535V6TB9PR048086"
 *   "9535 1234 5678 9012"  → "9535123456789012"
 */
export function normalizarChassi(valor: string): string {
  return (valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Retorna `true` se a string original tinha caracteres além de letras/números
 * (ou seja, se a normalização alterou algo). Útil pra avisar o usuário.
 */
export function precisouNormalizar(
  valorOriginal: string,
  valorNormalizado: string
): boolean {
  return (valorOriginal || '').toUpperCase() !== valorNormalizado
}

/* ==========================================================================
 * Boletos
 * ======================================================================== */

/**
 * Deriva o estado de um boleto a partir do que o DETRAN devolveu.
 *
 *   - caminhoPdf preenchido  → BAIXADO
 *   - erroEmissao preenchido → FALHA
 *   - nenhum dos dois        → PENDENTE
 *
 * Ordem importa: `caminhoPdf` tem prioridade — se já baixou, ignora erro
 * antigo (que pode ter ficado de uma tentativa anterior).
 */
export function derivarStatusBoleto(multa: MultaDetran): BoletoStatus {
  if (multa.caminhoPdf) return 'BAIXADO'
  if (multa.erroEmissao) return 'FALHA'
  return 'PENDENTE'
}

export function contarBoletos(multas: MultaDetran[]): ResumoBoletos {
  const resumo: ResumoBoletos = {
    baixados: 0,
    falhas: 0,
    pendentes: 0,
    total: multas.length,
  }

  for (const m of multas) {
    const status = derivarStatusBoleto(m)
    if (status === 'BAIXADO') resumo.baixados++
    else if (status === 'FALHA') resumo.falhas++
    else resumo.pendentes++
  }

  return resumo
}

/**
 * Gera as partes textuais do resumo. Ex.: ["2 baixados", "1 falha"].
 * Retorna array vazio se não há nada relevante.
 */
export function resumoBoletosTexto(resumo: ResumoBoletos): string[] {
  const partes: string[] = []
  if (resumo.baixados > 0)
    partes.push(`${resumo.baixados} baixado${resumo.baixados > 1 ? 's' : ''}`)
  if (resumo.falhas > 0)
    partes.push(`${resumo.falhas} falha${resumo.falhas > 1 ? 's' : ''}`)
  if (resumo.pendentes > 0)
    partes.push(`${resumo.pendentes} pendente${resumo.pendentes > 1 ? 's' : ''}`)
  return partes
}

/* ==========================================================================
 * Valores monetários
 * ======================================================================== */

/**
 * Converte um valor monetário vindo da API/scraper em número.
 *
 * Aceita:
 *   "293.47"        → 293.47
 *   "293,47"        → 293.47
 *   "R$ 293,47"     → 293.47
 *   "R$ 1.234,56"   → 1234.56
 *   "1,234.56"      → 1234.56
 *   293.47          → 293.47
 *   null / ""       → 0
 *
 * Regra de detecção de separador:
 *   - tem ponto E vírgula → formato BR ("1.234,56") → tira pontos, vírgula vira ponto
 *   - só vírgula          → vírgula é decimal  → vira ponto
 *   - só ponto            → já está OK
 *   - nenhum              → parseFloat direto
 */
export function parseValorMulta(
  valor: string | number | null | undefined
): number {
  if (valor == null) return 0
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0

  // Remove tudo que não for dígito, ponto, vírgula ou sinal
  let limpo = String(valor).replace(/[^\d.,-]/g, '')
  if (!limpo) return 0

  const temPonto = limpo.includes('.')
  const temVirgula = limpo.includes(',')

  if (temPonto && temVirgula) {
    // Formato BR: 1.234,56 → 1234.56
    limpo = limpo.replace(/\./g, '').replace(',', '.')
  } else if (temVirgula) {
    // 293,47 → 293.47
    limpo = limpo.replace(',', '.')
  }
  // else: já está em formato US/plain → deixa como está

  const n = parseFloat(limpo)
  return Number.isFinite(n) ? n : 0
}

/** Soma o valor a pagar de uma lista de multas. */
export function totalValorMultas(multas: MultaDetran[]): number {
  return multas.reduce((soma, m) => {
    // valorPagar tem prioridade; cai pra valor se não vier.
    // `??` (não `||`) para não descartar "0" ou 0 legítimos.
    const bruto = m.valorPagar ?? m.valor ?? null
    return soma + parseValorMulta(bruto)
  }, 0)
}

/* ==========================================================================
 * Tradução de erros de emissão de boleto
 * ======================================================================== */

export type MotivoFalhaBoleto =
  | 'DETRAN_RECUSOU'
  | 'TIMEOUT'
  | 'SESSAO_EXPIRADA'
  | 'INDISPONIVEL_NO_PORTAL'
  | 'DESCONHECIDO'

export interface FalhaBoletoTraduzida {
  motivo: MotivoFalhaBoleto
  titulo: string
  descricao: string
  /** Sugere mostrar o link do portal do DETRAN-CE pro usuário conferir */
  sugerirPortalDetran: boolean
}

/**
 * Classifica o `erroEmissao` técnico do scraper num motivo conhecido
 * e devolve um texto amigável pronto pra UI.
 *
 * O scraper grava strings como:
 *   - "Timeout aguardando 'Baixar boleto' ou alerta do DETRAN após 'Ver opções de pagamento'."
 *   - "Timeout aguardando seletor ..."
 *   - "Sessão expirada no portal do DETRAN"
 *   - "Elemento 'Baixar boleto' não encontrado"
 *
 * A ideia é nunca vazar essas strings cruas na interface.
 */
export function traduzirErroEmissaoBoleto(
  erroEmissao?: string | null
): FalhaBoletoTraduzida {
  const raw = (erroEmissao || '').toLowerCase()

  // Timeout aguardando o botão "Baixar boleto" — cenário mais comum.
  // O DETRAN aceitou abrir "Ver opções de pagamento" mas não liberou
  // a emissão. Na prática, é uma recusa silenciosa do portal.
  if (
    raw.includes('timeout') &&
    (raw.includes('baixar boleto') || raw.includes('ver opções de pagamento'))
  ) {
    return {
      motivo: 'DETRAN_RECUSOU',
      titulo: 'DETRAN não liberou a emissão',
      descricao:
        'O portal do DETRAN-CE não disponibilizou o boleto para este veículo no momento da consulta. ' +
        'Isso costuma acontecer quando há restrição na emissão pelo próprio DETRAN. ' +
        'Acesse o portal do DETRAN-CE para verificar a situação e emitir o boleto diretamente.',
      sugerirPortalDetran: true,
    }
  }

  if (raw.includes('timeout')) {
    return {
      motivo: 'TIMEOUT',
      titulo: 'Tempo esgotado ao consultar',
      descricao:
        'O portal do DETRAN-CE demorou mais que o esperado para responder. ' +
        'Tente novamente em alguns minutos.',
      sugerirPortalDetran: false,
    }
  }

  if (raw.includes('sessão') || raw.includes('sessao') || raw.includes('login')) {
    return {
      motivo: 'SESSAO_EXPIRADA',
      titulo: 'Sessão expirada no DETRAN',
      descricao:
        'A sessão de consulta com o DETRAN-CE expirou antes de emitir o boleto. ' +
        'Refaça a consulta do veículo para tentar novamente.',
      sugerirPortalDetran: false,
    }
  }

  if (
    raw.includes('indisponível') ||
    raw.includes('indisponivel') ||
    raw.includes('não disponível') ||
    raw.includes('nao disponivel')
  ) {
    return {
      motivo: 'INDISPONIVEL_NO_PORTAL',
      titulo: 'Boleto indisponível no DETRAN',
      descricao:
        'O DETRAN-CE não disponibilizou este boleto para emissão. ' +
        'Acesse o portal do DETRAN-CE para verificar a situação da multa.',
      sugerirPortalDetran: true,
    }
  }

  // Fallback — não sabemos classificar; mostramos um texto genérico
  // e mandamos pro portal do DETRAN conferir manualmente.
  return {
    motivo: 'DESCONHECIDO',
    titulo: 'Falha ao emitir o boleto',
    descricao:
      'Não foi possível obter este boleto junto ao DETRAN-CE. ' +
      'Acesse o portal do DETRAN-CE para verificar a situação e emitir diretamente.',
    sugerirPortalDetran: true,
  }
}

/** URL pública do DETRAN-CE para consulta de multas. */
export const URL_PORTAL_DETRAN_CE =
  'https://portal.detran.ce.gov.br/'