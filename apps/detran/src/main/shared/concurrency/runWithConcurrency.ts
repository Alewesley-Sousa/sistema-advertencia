/**
 * CONCORRÊNCIA CONTROLADA
 *
 * Responsabilidade:
 * Executar várias tarefas assíncronas respeitando um limite
 * máximo de operações simultâneas.
 *
 * Uso principal esperado:
 * processamento de lotes do DETRAN;
 * sincronizações;
 * chamadas para APIs externas.
 *
 * Exemplo:
 *
 * await runWithConcurrency(
 *   veiculos,
 *   3,
 *   async (veiculo) => {
 *     return consultarVeiculoDetran(veiculo)
 *   }
 * )
 *
 * IMPORTANTE:
 * O limite existe para evitar sobrecarga do servidor externo,
 * consumo excessivo de memória e excesso de abas/contextos.
 */

export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  handler: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (concurrency < 1) {
    throw new Error(
      'A concorrência deve ser maior que zero.'
    )
  }

  const results = new Array<R>(
    items.length
  )

  let nextIndex = 0

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++

      if (index >= items.length) {
        return
      }

      results[index] =
        await handler(
          items[index],
          index
        )
    }
  }

  const workers = Array.from(
    {
      length: Math.min(
        concurrency,
        items.length
      ),
    },
    () => worker()
  )

  await Promise.all(workers)

  return results
}
