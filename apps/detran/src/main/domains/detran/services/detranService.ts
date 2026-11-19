/**
 * ============================================================================
 * Arquivo: services/detranService.ts
 *
 * Regras de negócio do domínio DETRAN-CE: consultar um veículo, persistir o
 * resultado e processar filas de veículos (lote). Os controllers só cuidam de
 * HTTP e chamam este módulo.
 * ============================================================================
 */

import { runWithConcurrency } from '../../../shared/concurrency/runWithConcurrency'

import { detranRepository } from '../repositories/detranRepository'
import { consultarVeiculoDetran as executarScraper } from './detranScraperService'

/**
 * Consulta um veículo no DETRAN e persiste o resultado.
 *
 * Ponto único de entrada para "consultar 1 veículo" — usado tanto pela
 * consulta avulsa quanto pelo worker do lote, que fazem exatamente a
 * mesma sequência de operações.
 */
export async function consultarEPersistir(params: {
  placa: string
  chassi: string
  modelo?: string
  contrato?: string
  forcarRedownload?: boolean
}) {
  const { placa, chassi, modelo, contrato, forcarRedownload = false } = params

  const consultaId = detranRepository.obterOuCriarConsulta(placa, chassi, {
    modelo,
    contrato,
  })

  const aitJaBaixados = forcarRedownload
    ? new Set<string>()
    : detranRepository.buscarChavesJaBaixadas(placa)

  const resultado = await executarScraper({
    placa,
    chassi,
    aitJaBaixados,
  })

  detranRepository.atualizarResultadoConsulta(consultaId, resultado)

  let salvas = { inseridas: 0, atualizadas: 0 }
  if (resultado.multas?.length) {
    salvas = detranRepository.salvarMultas(consultaId, placa, resultado.multas)
  }

  const consultaCompletaComMultas =
    resultado.sucesso &&
    resultado.statusConsulta === 'COM_DEBITO' &&
    Array.isArray(resultado.multas)
  const consultaCompletaSemMultas =
    resultado.sucesso && resultado.confirmacaoLimpa === true

  if (consultaCompletaComMultas || consultaCompletaSemMultas) {
    detranRepository.sincronizarMultasAtivas(
      consultaId,
      placa,
      resultado.multas ?? []
    )
  }

  return { consultaId, resultado, salvas, aitJaBaixados }
}


export async function processarFilaLote(
  loteId: number,
  veiculos: Array<{
    placa: string
    chassi: string
    modelo?: string
    contrato?: string
  }>,
  concorrencia: number
): Promise<void> {
  console.log(
    `[DETRAN] Lote ${loteId} iniciado — ` +
      `${veiculos.length} veículo(s) — concorrência: ${concorrencia}`
  )

  try {
    await runWithConcurrency(veiculos, concorrencia, async (veiculo) => {
      await processarVeiculoLote(loteId, veiculo)
    })

    detranRepository.finalizarLote(loteId)

    console.log(
      `[DETRAN] Lote ${loteId} concluído — ${veiculos.length} veículo(s)`
    )
  } catch (err: any) {
    console.error(
      `[DETRAN] Lote ${loteId} falhou de forma inesperada:`,
      err?.message
    )

    try {
      detranRepository.marcarLoteComoErro(loteId)
    } catch (dbErr: any) {
      console.error(
        `[DETRAN] Falha ao marcar lote ${loteId} como ERRO:`,
        dbErr?.message
      )
    }
  }
}

async function processarVeiculoLote(
  loteId: number,
  veiculo: {
    placa: string
    chassi: string
    modelo?: string
    contrato?: string
  }
): Promise<void> {
  const { placa, chassi, modelo, contrato } = veiculo

  try {
    detranRepository.atualizarItemAtualLote(loteId, placa)

    const { aitJaBaixados, salvas } = await consultarEPersistir({
      placa,
      chassi,
      modelo,
      contrato,
    })

    console.log(
      `[DETRAN] Lote ${loteId} — ${placa}: ` +
        `${aitJaBaixados.size} já baixada(s), ` +
        `${salvas.inseridas} nova(s), ${salvas.atualizadas} atualizada(s)`
    )
  } catch (err: any) {
    const mensagem = err?.message || 'Erro ao processar veículo.'

    console.error(
      `[DETRAN] Erro no item ${placa} do lote ${loteId}:`,
      mensagem
    )

    try {
      const consultaId = detranRepository.obterOuCriarConsulta(placa, chassi, {
        modelo,
        contrato,
      })
      detranRepository.atualizarResultadoConsulta(consultaId, {
        statusConsulta: 'ERRO',
        mensagemErro: mensagem,
      })
    } catch (erroBanco: any) {
      console.error(
        `[DETRAN] Falha ao registrar erro de ${placa}:`,
        erroBanco?.message
      )
    }
  } finally {
    detranRepository.incrementarProgressoLote(loteId)
  }
}
