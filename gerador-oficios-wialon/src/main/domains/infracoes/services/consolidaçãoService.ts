import { gerarPdfOficio } from '../../../services/pdfService'
import { infracaoRepository } from '../repositories/infracaoRepository'

export async function consolidarInfracoesPendentes(): Promise<void> {
  console.log(
    '[Consolidação] Verificando infrações pendentes de dias anteriores...'
  )

  try {
    const picosMaisGraves =
      infracaoRepository.buscarPicosPendentesDiasAnteriores()

    if (
      picosMaisGraves.length === 0
    ) {
      console.log(
        '[Consolidação] Nenhuma infração de dias anteriores pendente para processamento.'
      )

      return
    }

    console.log(
      `[Consolidação] Encontrados ${picosMaisGraves.length} ofício(s) para consolidar.`
    )

    for (
      const pico of picosMaisGraves
    ) {
      try {
        /*
         * A data do ofício é a data/hora em que
         * a infração realmente aconteceu.
         */
        const dataFormatada =
          new Date(
            pico.data_hora
          ).toLocaleString(
            'pt-BR'
          )

        const pdfPath =
          await gerarPdfOficio({
            id:
              pico.id,

            placa:
              pico.placa,

            condutor:
              pico.condutor ||
              'Não informado',

            velocidade:
              pico.velocidade,

            endereco:
              pico.endereco ||
              'Endereço não informado',

            data_hora:
              dataFormatada,
          })

        infracaoRepository.marcarComoGerado(
          pico.id,
          pdfPath
        )

        infracaoRepository.descartarInfracoesMenorGravidade(
          pico.data_evento,
          pico.placa,
          pico.id
        )

        console.log(
          `[Consolidação] Ofício gerado com sucesso para a placa ${pico.placa} (${pico.data_evento})`
        )
      } catch (err) {
        console.error(
          `[Consolidação Error] Falha ao processar id ${pico.id}:`,
          err
        )

        infracaoRepository.marcarComoErro(
          pico.id
        )
      }
    }
  } catch (error) {
    console.error(
      '[Consolidação Error] Erro ao executar consolidação:',
      error
    )
  }
}