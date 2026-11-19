// apps/detran/src/renderer/features/detran/lib/lerPlanilhaVeiculos.ts
//
// Lê .xlsx/.xls/.csv no navegador e devolve as linhas brutas (placa, chassi,
// modelo, contrato). A normalização e a validação são feitas no servidor.
// Nada é logado: a planilha tem dados sensíveis.

import * as XLSX from 'xlsx'

export interface LinhaVeiculo {
  placa: string
  chassi: string
  modelo?: string
  contrato?: string
}

const normalizarChave = (chave: string) =>
  chave
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

function valorDe(row: Record<string, unknown>, chaves: string[]): string {
  const aceitas = chaves.map(normalizarChave)
  for (const k of Object.keys(row)) {
    if (aceitas.includes(normalizarChave(k)) && row[k] != null) return String(row[k]).trim()
  }
  return ''
}

export async function lerPlanilhaVeiculos(file: File): Promise<LinhaVeiculo[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const aba = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(aba)

  return rows
    .map((row) => ({
      placa: valorDe(row, ['placa', 'plate', 'placa do veiculo']),
      chassi: valorDe(row, ['chassi', 'renavam', 'chassis', 'chassi/renavam']),
      modelo: valorDe(row, ['modelo', 'modelo do veiculo', 'veiculo/modelo']) || undefined,
      contrato: valorDe(row, ['contrato', 'contrato da frota', 'cliente', 'empresa', 'contratante']) || undefined,
    }))
    .filter((v) => v.placa && v.chassi)
}
