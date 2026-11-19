// apps/detran/src/main/domains/detran/automacao/periodoSemana.ts
// Janela de datas do detalhamento semanal (função pura, testável).

/** Hoje (no fuso da automação) como `aaaa-mm-dd` e dia da semana (0 = domingo). */
function hojeNoFuso(timezone: string, agora: Date): { iso: string; diaSemana: number } {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(agora)
    .split('-')
    .map(Number)
  const [a, m, d] = partes
  const utc = new Date(Date.UTC(a, m - 1, d))
  return { iso: utc.toISOString().slice(0, 10), diaSemana: utc.getUTCDay() }
}

/**
 * Janela da semana: do sábado mais recente até hoje (inclusive).
 * Rodando numa sexta: sábado anterior → essa sexta (7 dias). Se hoje for sábado,
 * usa o sábado da semana anterior para não detalhar um único dia.
 */
export function periodoDaSemana(timezone: string, agora: Date = new Date()): { de: string; ate: string } {
  const { iso, diaSemana } = hojeNoFuso(timezone, agora)
  const diasDesdeSabado = diaSemana === 6 ? 7 : (diaSemana + 1) % 7
  const fim = new Date(iso + 'T00:00:00Z')
  const ini = new Date(fim.getTime() - diasDesdeSabado * 86_400_000)
  return { de: ini.toISOString().slice(0, 10), ate: iso }
}

