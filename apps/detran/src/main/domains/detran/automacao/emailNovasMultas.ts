// apps/detran/src/main/domains/detran/automacao/emailNovasMultas.ts
//
// E-mail "multas novas": um resumo por rodada, agrupado por veículo. Mesmo visual do relatório semanal.

import { valorDetranEmCentavos } from '../utils'
import { AZUL, BORDA, escaparHtml, FUNDO, moldura, MUTED, TEXTO } from './emailTemplate'
import type { MultaPendente } from './novasMultasRepository'

export interface DadosEmailNovasMultas {
  dataTexto: string
  multas: MultaPendente[]
  /** Veículos que não puderam ser consultados nesta rodada (não dá para afirmar que não há multa nova neles). */
  naoVerificados: number
  temLogo: boolean
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmt = (centavos: number) => brl.format(centavos / 100)

/** dd/mm/aaaa -> número ordenável aaaammdd (datas inválidas vão para o fim). */
function chaveData(d: string): number {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(d ?? '')
  return m ? Number(`${m[3]}${m[2]}${m[1]}`) : 99999999
}

export function agruparPorVeiculo(multas: MultaPendente[]) {
  const mapa = new Map<string, { placa: string; modelo: string | null; contrato: string | null; multas: MultaPendente[]; centavos: number }>()
  for (const m of multas) {
    const g = mapa.get(m.placa) ?? { placa: m.placa, modelo: m.modelo, contrato: m.contrato, multas: [], centavos: 0 }
    g.multas.push(m)
    g.centavos += valorDetranEmCentavos(m.valorPagar)
    mapa.set(m.placa, g)
  }
  const grupos = [...mapa.values()]
  for (const g of grupos) g.multas.sort((a, b) => chaveData(a.dataInfracao) - chaveData(b.dataInfracao))
  return grupos.sort((a, b) => b.centavos - a.centavos || a.placa.localeCompare(b.placa))
}

const celula = (txt: string, extra = '') =>
  `<td style="padding:6px 8px;border-top:1px solid ${BORDA};font:12px/1.4 Arial,Helvetica,sans-serif;color:${TEXTO};vertical-align:top;${extra}">${escaparHtml(txt || '—')}</td>`
const cab = (txt: string, extra = '') =>
  `<td style="padding:6px 8px;background:${FUNDO};font:600 10px Arial,Helvetica,sans-serif;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;${extra}">${escaparHtml(txt)}</td>`

export function montarEmailNovasMultas(d: DadosEmailNovasMultas): { assunto: string; html: string; texto: string } {
  const grupos = agruparPorVeiculo(d.multas)
  const total = grupos.reduce((s, g) => s + g.centavos, 0)
  const n = d.multas.length
  const v = grupos.length
  const plural = (q: number, s: string, p: string) => (q === 1 ? s : p)

  const blocos = grupos
    .map((g) => {
      const sub = [g.modelo, g.contrato].filter(Boolean).join(' · ')
      const linhas = g.multas
        .map(
          (m) =>
            `<tr>${celula(m.ait)}${celula(m.motivo ?? '')}${celula(m.dataInfracao)}${celula(m.dataVencimento ?? '')}${celula(m.valorPagar ?? '', 'text-align:right;white-space:nowrap;')}</tr>`
        )
        .join('')
      return `
    <tr><td class="px" style="padding:0 28px 14px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDA};border-radius:6px;">
        <tr><td colspan="5" style="padding:10px 8px;font:700 14px Arial,Helvetica,sans-serif;color:${AZUL};">${escaparHtml(g.placa)}
          <span style="font:12px Arial,Helvetica,sans-serif;color:${MUTED};font-weight:400;">${sub ? ' — ' + escaparHtml(sub) : ''}</span></td></tr>
        <tr>${cab('AIT')}${cab('Infração')}${cab('Data')}${cab('Vencimento')}${cab('A pagar', 'text-align:right;')}</tr>
        ${linhas}
        <tr><td colspan="4" style="padding:8px;border-top:1px solid ${BORDA};font:600 12px Arial,Helvetica,sans-serif;color:${MUTED};text-align:right;">Subtotal</td>
            <td style="padding:8px;border-top:1px solid ${BORDA};font:700 12px Arial,Helvetica,sans-serif;color:${AZUL};text-align:right;white-space:nowrap;">${fmt(g.centavos)}</td></tr>
      </table></td></tr>`
    })
    .join('')

  const aviso =
    d.naoVerificados > 0
      ? `<tr><td class="px" style="padding:0 28px 16px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdf4e3;border:1px solid #f0dcae;border-radius:6px;">
            <tr><td style="padding:10px 12px;font:13px/1.5 Arial,Helvetica,sans-serif;color:#8a5a12;">
              <b>Atenção:</b> ${d.naoVerificados} ${plural(d.naoVerificados, 'veículo não pôde', 'veículos não puderam')} ser consultado${d.naoVerificados === 1 ? '' : 's'} nesta rodada. Se houver multa nova ${plural(d.naoVerificados, 'nele', 'neles')}, ela será avisada na próxima verificação.
            </td></tr></table></td></tr>`
      : ''

  const conteudo = `
    <tr><td class="px" style="padding:24px 28px 8px 28px;font:700 20px/1.3 Arial,Helvetica,sans-serif;color:${AZUL};">${n} ${plural(n, 'multa nova', 'multas novas')} no DETRAN-CE</td></tr>
    <tr><td class="px" style="padding:0 28px 16px 28px;font:14px/1.6 Arial,Helvetica,sans-serif;color:${TEXTO};">
      Verificação de <b>${escaparHtml(d.dataTexto)}</b>: ${n} ${plural(n, 'multa apareceu', 'multas apareceram')} em ${v} ${plural(v, 'veículo', 'veículos')}, somando <b>${fmt(total)}</b> a pagar.
    </td></tr>
    ${aviso}
    ${blocos}
    <tr><td class="px" style="padding:0 28px 24px 28px;font:13px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
      Estas multas não serão avisadas novamente. Valores e vencimentos conforme o portal do DETRAN-CE no momento da consulta.
    </td></tr>`

  const texto = [
    `${n} ${plural(n, 'multa nova', 'multas novas')} no DETRAN-CE — verificação de ${d.dataTexto}`,
    `${v} ${plural(v, 'veículo', 'veículos')}, total a pagar ${fmt(total)}`,
    '',
    ...grupos.flatMap((g) => [
      `${g.placa}${g.contrato ? ` (${g.contrato})` : ''} — subtotal ${fmt(g.centavos)}`,
      ...g.multas.map((m) => `  • AIT ${m.ait} | ${m.motivo ?? '—'} | infração ${m.dataInfracao} | venc. ${m.dataVencimento ?? '—'} | ${m.valorPagar ?? '—'}`),
      '',
    ]),
    d.naoVerificados > 0 ? `Atenção: ${d.naoVerificados} veículo(s) não puderam ser consultados nesta rodada.` : '',
    'Estas multas não serão avisadas novamente.',
  ]
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n')

  return {
    assunto: `${n} ${plural(n, 'multa nova', 'multas novas')} no DETRAN-CE (${v} ${plural(v, 'veículo', 'veículos')}) — ${d.dataTexto}`,
    html: moldura(conteudo, {
      temLogo: d.temLogo,
      temGif: false,
      titulo: 'Multas novas DETRAN-CE',
      preheader: `${n} ${plural(n, 'multa nova', 'multas novas')} em ${v} ${plural(v, 'veículo', 'veículos')} — ${fmt(total)} a pagar.`,
    }),
    texto,
  }
}

export function montarEmailFalhaNovasMultas(d: { dataTexto: string; motivo: string; temLogo: boolean }) {
  const conteudo = `
    <tr><td class="px" style="padding:24px 28px 8px 28px;font:700 20px/1.3 Arial,Helvetica,sans-serif;color:#9a3b3b;">A verificação de multas novas falhou</td></tr>
    <tr><td class="px" style="padding:0 28px 24px 28px;font:14px/1.6 Arial,Helvetica,sans-serif;color:${TEXTO};">
      A verificação de <b>${escaparHtml(d.dataTexto)}</b> não conseguiu consultar o DETRAN-CE.<br><br>
      <b>Motivo:</b> ${escaparHtml(d.motivo)}<br><br>
      Nenhuma multa foi marcada como avisada. A próxima verificação tentará novamente.
    </td></tr>`
  return {
    assunto: `[FALHA] Verificação de multas novas DETRAN-CE — ${d.dataTexto}`,
    html: moldura(conteudo, { temLogo: d.temLogo, temGif: false, titulo: 'Falha na verificação', preheader: 'A verificação de multas novas falhou.' }),
    texto: `A verificação de multas novas de ${d.dataTexto} falhou.\nMotivo: ${d.motivo}\nNenhuma multa foi marcada como avisada.`,
  }
}
