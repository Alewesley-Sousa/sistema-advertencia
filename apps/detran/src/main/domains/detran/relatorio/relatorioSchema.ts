// apps/detran/src/main/domains/detran/relatorio/relatorioSchema.ts
//
// Validação (Zod) do payload enviado pelo front. Os enums vêm de
// `src/shared/relatorioContrato.ts`, a mesma fonte usada pela UI.

import { z } from 'zod'
import {
  AGRUPAMENTOS_RELATORIO,
  CONFIG_PADRAO_RELATORIO,
  ESCOPOS_RELATORIO,
  ORDENACOES_MULTAS,
  ORDENACOES_VEICULOS,
  ORIGENS_RELATORIO,
  type RelatorioPdfConfig,
} from '../../../../shared/relatorioContrato'

/** Limite de ids numa seleção explícita (acima disso, use o modo FILTRO). */
export const MAX_IDS_RELATORIO = 5000

const texto = (max: number) => z.string().trim().max(max)

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use aaaa-mm-dd).')

const selecaoPorIds = z.object({
  modo: z.literal('IDS'),
  ids: z.array(z.number().int().positive()).min(1, 'Selecione ao menos um veículo.').max(MAX_IDS_RELATORIO),
})

const selecaoPorFiltro = z.object({
  modo: z.literal('FILTRO'),
  busca: texto(60).optional(),
  status: texto(30).optional(),
  contratos: z.array(texto(120)).max(200).optional(),
})

const secoes = z.object({
  resumoConsolidado: z.boolean(),
  multasDetalhadas: z.boolean(),
  ipva: z.boolean(),
  licenciamento: z.boolean(),
})

export const relatorioPdfSchema = z.object({
  origem: z.enum(ORIGENS_RELATORIO),
  selecao: z.discriminatedUnion('modo', [selecaoPorIds, selecaoPorFiltro]),
  escopo: z.enum(ESCOPOS_RELATORIO).default(CONFIG_PADRAO_RELATORIO.escopo),
  secoes: secoes.refine(
    (s) => s.resumoConsolidado || s.multasDetalhadas || s.ipva || s.licenciamento,
    { message: 'Ative ao menos uma seção do relatório.' }
  ).default({ ...CONFIG_PADRAO_RELATORIO.secoes }),
  agrupamento: z.enum(AGRUPAMENTOS_RELATORIO).default(CONFIG_PADRAO_RELATORIO.agrupamento),
  ordenacaoVeiculos: z.enum(ORDENACOES_VEICULOS).default(CONFIG_PADRAO_RELATORIO.ordenacaoVeiculos),
  ordenacaoMultas: z.enum(ORDENACOES_MULTAS).default(CONFIG_PADRAO_RELATORIO.ordenacaoMultas),
  titulo: texto(120).optional(),
  observacao: texto(500).optional(),
  periodoMultas: z
    .object({ de: dataIso, ate: dataIso })
    .refine((p) => p.de <= p.ate, { message: 'O período das multas está invertido.' })
    .optional(),
})

/** Garante, em tempo de compilação, que o schema produz exatamente o contrato compartilhado. */
export type RelatorioPdfConfigValidado = z.infer<typeof relatorioPdfSchema>
const _contratoCompativel = (c: RelatorioPdfConfigValidado): RelatorioPdfConfig => c
void _contratoCompativel

export type ResultadoValidacao =
  | { ok: true; config: RelatorioPdfConfig }
  | { ok: false; mensagem: string; detalhes: Array<{ field: string; message: string }> }

export function validarConfigRelatorio(entrada: unknown): ResultadoValidacao {
  const resultado = relatorioPdfSchema.safeParse(entrada)
  if (resultado.success) return { ok: true, config: resultado.data }

  const detalhes = resultado.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }))
  return {
    ok: false,
    mensagem: detalhes[0]?.message || 'Configuração do relatório inválida.',
    detalhes,
  }
}
