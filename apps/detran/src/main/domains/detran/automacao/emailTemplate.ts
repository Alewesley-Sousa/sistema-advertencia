// apps/detran/src/main/domains/detran/automacao/emailTemplate.ts
//
// E-mail HTML compatível com Outlook/Gmail/Apple Mail:
//  - layout em <table> de 600px, CSS inline (Gmail/Outlook ignoram <style> em vários casos);
//  - cores FORCE: marinho #1B426C, ciano #2CCDFC, neutros claros;
//  - imagens por CID (anexadas ao e-mail), não por URL remota: não dependem de
//    "carregar imagens externas" e não vazam rastreio;
//  - GIF opcional: o 1º quadro deve carregar a mensagem (Outlook desktop só mostra o 1º);
//  - versão texto simples (multipart/alternative) — reduz pontuação de spam.

export interface DadosEmailRelatorio {
  dataTexto: string
  totalVeiculos: number
  veiculosComMultas: number
  multasAtivas: number
  valorTotal: string
  consultasComErro: number
  /** Há logo/GIF embutidos? (cids fixos abaixo) */
  temLogo: boolean
  temGif: boolean
}

export const CID_LOGO = 'logo-force@detran'
export const CID_GIF = 'banner-force@detran'

const AZUL = '#1B426C'
const CIANO = '#2CCDFC'
const FUNDO = '#f4f7fa'
const BORDA = '#dde5ee'
const TEXTO = '#1f2a37'
const MUTED = '#5b6b7c'

export function escaparHtml(t: string): string {
  return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function kpi(rotulo: string, valor: string): string {
  return `<td width="25%" valign="top" style="padding:0 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDA};border-radius:6px;background:#ffffff;">
      <tr><td style="padding:10px 10px 2px 10px;font:600 10px Arial,Helvetica,sans-serif;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;">${escaparHtml(rotulo)}</td></tr>
      <tr><td style="padding:0 10px 10px 10px;font:700 18px Arial,Helvetica,sans-serif;color:${AZUL};">${escaparHtml(valor)}</td></tr>
    </table></td>`
}

function moldura(conteudo: string, d: { temLogo: boolean; temGif: boolean; preheader: string }): string {
  const logo = d.temLogo
    ? `<img src="cid:${CID_LOGO}" width="56" alt="FORCE" style="display:block;border:0;height:auto;max-width:56px;">`
    : `<span style="font:800 24px Arial,Helvetica,sans-serif;letter-spacing:.14em;color:${AZUL};">FORCE</span><span style="font:600 11px Arial,Helvetica,sans-serif;letter-spacing:.08em;color:${MUTED};text-transform:uppercase;"> &nbsp;Logística Especializada</span>`
  const gif = d.temGif
    ? `<tr><td style="padding:0;"><img src="cid:${CID_GIF}" width="600" alt="Relatório semanal de multas e débitos" style="display:block;border:0;width:100%;max-width:600px;height:auto;"></td></tr>`
    : ''

  return `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<title>Relatório semanal DETRAN-CE</title>
<style>
  @media only screen and (max-width: 620px) {
    .container { width: 100% !important; }
    .kpi-cell { display: block !important; width: 100% !important; padding: 4px 0 !important; }
    .px { padding-left: 16px !important; padding-right: 16px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${FUNDO};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${FUNDO};">${escaparHtml(d.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${FUNDO}" style="background:${FUNDO};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:600px;max-width:600px;background:#ffffff;border:1px solid ${BORDA};border-radius:8px;overflow:hidden;">
    <tr><td class="px" style="padding:20px 28px;border-bottom:3px solid ${AZUL};">${logo}</td></tr>
    <tr><td style="height:3px;line-height:3px;font-size:0;background:${CIANO};width:72px;" width="72">&nbsp;</td></tr>
    ${gif}
    ${conteudo}
    <tr><td class="px" style="padding:16px 28px;background:${FUNDO};border-top:1px solid ${BORDA};font:12px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};">
      Mensagem automática do sistema de consulta de multas e débitos do DETRAN-CE. Contém dados internos da frota — não encaminhe fora da empresa.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}

export function montarEmailRelatorio(d: DadosEmailRelatorio): { assunto: string; html: string; texto: string } {
  const aviso =
    d.consultasComErro > 0
      ? `<tr><td class="px" style="padding:0 28px 16px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdf4e3;border:1px solid #f0dcae;border-radius:6px;">
            <tr><td style="padding:10px 12px;font:13px/1.5 Arial,Helvetica,sans-serif;color:#8a5a12;">
              <b>Atenção:</b> ${d.consultasComErro} veículo(s) não puderam ser consultados nesta rodada e aparecem como “Erro na consulta” no PDF. Eles serão tentados novamente na próxima execução.
            </td></tr></table></td></tr>`
      : ''

  const conteudo = `
    <tr><td class="px" style="padding:24px 28px 8px 28px;font:700 20px/1.3 Arial,Helvetica,sans-serif;color:${AZUL};">Relatório semanal de multas e débitos</td></tr>
    <tr><td class="px" style="padding:0 28px 16px 28px;font:14px/1.6 Arial,Helvetica,sans-serif;color:${TEXTO};">
      Segue em anexo o relatório consolidado em PDF com a situação da frota no DETRAN-CE em <b>${escaparHtml(d.dataTexto)}</b>: multas ativas, IPVA e licenciamento, agrupados por veículo.
    </td></tr>
    <tr><td class="px" style="padding:0 24px 16px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        ${[
          kpi('Veículos', String(d.totalVeiculos)),
          kpi('Com multas', String(d.veiculosComMultas)),
          kpi('Multas ativas', String(d.multasAtivas)),
          kpi('Valor total', d.valorTotal),
        ]
          .map((c) => c.replace('<td width="25%"', '<td class="kpi-cell" width="25%"'))
          .join('')}
      </tr></table>
    </td></tr>
    ${aviso}
    <tr><td class="px" style="padding:0 28px 24px 28px;font:13px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
      O arquivo PDF está anexado a esta mensagem. Se não conseguir abri-lo, responda a este e-mail avisando a equipe responsável.
    </td></tr>`

  const texto = [
    'Relatório semanal de multas e débitos — DETRAN-CE',
    `Data: ${d.dataTexto}`,
    '',
    `Veículos: ${d.totalVeiculos}`,
    `Com multas ativas: ${d.veiculosComMultas}`,
    `Multas ativas: ${d.multasAtivas}`,
    `Valor total: ${d.valorTotal}`,
    d.consultasComErro > 0 ? `\nAtenção: ${d.consultasComErro} veículo(s) não puderam ser consultados nesta rodada.` : '',
    '',
    'O PDF com o detalhamento está anexado.',
  ]
    .filter((l) => l !== undefined)
    .join('\n')

  return {
    assunto: `Relatório semanal de multas e débitos (DETRAN-CE) — ${d.dataTexto}`,
    html: moldura(conteudo, {
      temLogo: d.temLogo,
      temGif: d.temGif,
      preheader: `${d.multasAtivas} multa(s) ativa(s) em ${d.veiculosComMultas} veículo(s) — total ${d.valorTotal}.`,
    }),
    texto,
  }
}

export function montarEmailFalha(d: { dataTexto: string; motivo: string; temLogo: boolean }): {
  assunto: string
  html: string
  texto: string
} {
  const conteudo = `
    <tr><td class="px" style="padding:24px 28px 8px 28px;font:700 20px/1.3 Arial,Helvetica,sans-serif;color:#9a3b3b;">A execução semanal falhou</td></tr>
    <tr><td class="px" style="padding:0 28px 24px 28px;font:14px/1.6 Arial,Helvetica,sans-serif;color:${TEXTO};">
      A rodada de <b>${escaparHtml(d.dataTexto)}</b> não gerou o relatório.<br><br>
      <b>Motivo:</b> ${escaparHtml(d.motivo)}<br><br>
      Nenhum PDF foi enviado. Verifique o servidor e execute novamente pela tela de automação.
    </td></tr>`
  return {
    assunto: `[FALHA] Relatório semanal DETRAN-CE — ${d.dataTexto}`,
    html: moldura(conteudo, { temLogo: d.temLogo, temGif: false, preheader: 'A execução semanal falhou e nenhum relatório foi enviado.' }),
    texto: `A execução semanal de ${d.dataTexto} falhou.\nMotivo: ${d.motivo}\nNenhum PDF foi enviado.`,
  }
}
