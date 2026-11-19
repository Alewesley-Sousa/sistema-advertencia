// apps/detran/src/main/domains/detran/relatorio/relatorioTemplate.ts
//
// Template Handlebars do PDF A4. Sem helpers customizados: apenas {{var}},
// {{#if}}, {{#each}} e {{{raw}}} (CSS/fonte). Toda lógica fica em relatorioModelo.ts.
// Paleta FORCE: navy #1B426C (títulos), ciano #2CCDFC (detalhes sutis), neutros claros.

const CSS = `
@page { size: A4; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: 'Inter', Arial, sans-serif; font-size: 9pt; line-height: 1.4; color: #1f2a37; }
h1, h2, h3 { margin: 0; color: #1B426C; }
.capa { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 3px solid #1B426C; position: relative; }
.capa::after { content: ''; position: absolute; left: 0; bottom: -3px; width: 72px; height: 3px; background: #2CCDFC; }
.capa img { height: 34px; }
.capa .meta { text-align: right; font-size: 8pt; color: #5b6b7c; }
.titulo { margin: 16px 0 4px; font-size: 18pt; font-weight: 700; }
.contexto { background: #f4f7fa; border: 1px solid #dde5ee; border-radius: 6px; padding: 8px 12px; margin: 10px 0 14px; font-size: 8.5pt; }
.contexto div { margin: 2px 0; }
.contexto b { color: #1B426C; font-weight: 600; }
.obs { border-left: 3px solid #2CCDFC; padding: 4px 10px; margin: 0 0 14px; color: #394a5c; background: #fafcfe; }
h2.secao { font-size: 12pt; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #dde5ee; break-after: avoid; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px; }
.kpi { border: 1px solid #dde5ee; border-radius: 6px; padding: 8px 10px; break-inside: avoid; background: #fff; }
.kpi .r { font-size: 7.5pt; color: #5b6b7c; text-transform: uppercase; letter-spacing: .03em; }
.kpi .v { font-size: 14pt; font-weight: 700; color: #1B426C; margin: 2px 0; }
.kpi .d { font-size: 7.5pt; color: #7a8896; }
.kpis.sec .v { font-size: 11pt; }
table { width: 100%; border-collapse: collapse; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th { text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .03em; color: #1B426C; background: #eef3f8; padding: 5px 6px; border-bottom: 1px solid #c9d6e3; }
td { padding: 5px 6px; border-bottom: 1px solid #e8eef4; vertical-align: top; }
th.n, td.n { text-align: right; white-space: nowrap; }
tbody tr:nth-child(even) td { background: #fafcfe; }
.vencida { color: #9a3b3b; font-weight: 600; }
.mono { font-variant-numeric: tabular-nums; white-space: nowrap; }
.chip { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 7.5pt; font-weight: 600; border: 1px solid transparent; white-space: nowrap; }
.chip-ok { background: #e9f6ef; color: #1f6b46; border-color: #bfe3cf; }
.chip-erro { background: #fbecec; color: #9a3b3b; border-color: #efc7c7; }
.chip-aviso { background: #fdf4e3; color: #8a5a12; border-color: #f0dcae; }
.chip-info { background: #e7f7fe; color: #14618a; border-color: #b9e6f8; }
.chip-neutro { background: #f1f4f7; color: #5b6b7c; border-color: #dde5ee; }
.barra { height: 8px; background: #eef3f8; border-radius: 4px; overflow: hidden; }
.barra i { display: block; height: 100%; background: #2CCDFC; }
.duas { display: grid; grid-template-columns: 1fr; gap: 12px; }
.veiculo { border: 1px solid #dde5ee; border-radius: 6px; margin-bottom: 10px; break-inside: avoid; }
.veiculo--longo { break-inside: auto; }
.veiculo header { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 7px 10px; background: #eef3f8; border-bottom: 1px solid #dde5ee; border-radius: 6px 6px 0 0; break-after: avoid; }
.veiculo header .placa { font-size: 11pt; font-weight: 700; color: #1B426C; }
.veiculo header .sub { font-size: 8pt; color: #5b6b7c; }
.veiculo .chips { display: flex; gap: 6px; flex-wrap: wrap; font-size: 7.5pt; color: #5b6b7c; align-items: center; }
.veiculo .sem { padding: 8px 10px; color: #7a8896; font-style: italic; }
.veiculo table { table-layout: fixed; }
.veiculo th:nth-child(1) { width: 14%; }
.veiculo th:nth-child(3), .veiculo th:nth-child(4) { width: 12%; }
.veiculo th:nth-child(5), .veiculo th:nth-child(6) { width: 11%; }
.veiculo th:nth-child(7) { width: 12%; }
.veiculo tfoot td { font-weight: 700; color: #1B426C; background: #f4f7fa; border-top: 1px solid #c9d6e3; }
.total { margin-top: 10px; padding: 8px 12px; border: 1px solid #1B426C; border-radius: 6px; display: flex; justify-content: space-between; font-weight: 700; color: #1B426C; break-inside: avoid; }
.vazio { text-align: center; padding: 40px 0; color: #5b6b7c; border: 1px dashed #c9d6e3; border-radius: 6px; }
.nota { font-size: 7.5pt; color: #7a8896; margin-top: 4px; }
`

export const TEMPLATE_RELATORIO = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>{{titulo}}</title>
<style>
{{{fontFaceCss}}}
${CSS}
</style>
</head>
<body>
<div class="capa">
  {{#if logoDataUri}}<img src="{{logoDataUri}}" alt="FORCE">{{/if}}
  <div class="meta">Emitido em {{emitidoEm}}<br>Origem: {{origemTexto}}</div>
</div>

<h1 class="titulo">{{titulo}}</h1>
<div class="contexto">
  <div><b>Seleção:</b> {{selecaoTexto}}</div>
  <div><b>Escopo e organização:</b> {{escopoTexto}}</div>
  <div><b>Ordenação:</b> {{ordenacaoTexto}}</div>
  {{#if temPeriodo}}<div><b>Multas detalhadas:</b> infrações de {{periodoTexto}}</div>{{/if}}
</div>
{{#if observacao}}<div class="obs">{{observacao}}</div>{{/if}}

{{#if vazio}}
<div class="vazio">Nenhum veículo atende ao escopo escolhido. Ajuste a seleção ou o escopo e gere novamente.</div>
{{else}}

{{#if mostrarResumo}}
<h2 class="secao">Resumo consolidado</h2>
{{#if temPeriodo}}<div class="nota" style="margin:-4px 0 8px;">Multas, valores e contratos referem-se às infrações de {{periodoTexto}}. O total de veículos analisados e a situação de IPVA e licenciamento consideram toda a frota selecionada.</div>{{/if}}
<div class="kpis">
{{#each kpisPrincipais}}<div class="kpi"><div class="r">{{rotulo}}</div><div class="v">{{valor}}</div><div class="d">{{detalhe}}</div></div>{{/each}}
</div>
<div class="kpis sec">
{{#each kpisSecundarios}}<div class="kpi"><div class="r">{{rotulo}}</div><div class="v">{{valor}}</div><div class="d">{{detalhe}}</div></div>{{/each}}
</div>

<h2 class="secao">Por contrato</h2>
<table>
<thead><tr><th>Contrato</th><th class="n">Veículos</th><th class="n">Multas ativas</th><th class="n">Valor</th></tr></thead>
<tbody>
{{#each porContrato}}<tr><td>{{contrato}}</td><td class="n">{{veiculos}}</td><td class="n">{{multas}}</td><td class="n mono">{{valor}}</td></tr>{{/each}}
</tbody>
</table>
{{/if}}

{{#if porVeiculo}}
<h2 class="secao">{{#if temPeriodo}}Multas da semana ({{periodoTexto}}){{else}}Detalhamento por veículo{{/if}}</h2>
{{#if semMultasNoPeriodo}}<div class="vazio">Nenhuma multa com infração neste período.</div>{{/if}}
{{#each veiculos}}
<section class="{{classeBloco}}">
  <header>
    <div><span class="placa">{{placa}}</span> <span class="sub">{{modelo}} · {{contrato}}</span></div>
    <div class="chips">
      <span class="chip {{situacao.classe}}">{{situacao.texto}}</span>
      {{#if ../mostrarIpva}}<span>IPVA <span class="chip {{ipva.classe}}">{{ipva.texto}}</span></span>{{/if}}
      {{#if ../mostrarLicenciamento}}<span>Licenc. <span class="chip {{licenciamento.classe}}">{{licenciamento.texto}}</span></span>{{/if}}
    </div>
  </header>
  {{#if ../mostrarMultas}}
  {{#if temMultas}}
  <table>
    <thead><tr><th>AIT</th><th>Motivo</th><th>Infração</th><th>Vencimento</th><th class="n">Valor</th><th class="n">A pagar</th><th>Boleto</th></tr></thead>
    <tbody>
    {{#each multas}}<tr><td class="mono">{{ait}}</td><td>{{motivo}}</td><td class="mono">{{dataInfracao}}</td><td class="mono{{#if vencida}} vencida{{/if}}">{{dataVencimento}}</td><td class="n mono">{{valor}}</td><td class="n mono">{{valorPagar}}</td><td><span class="chip {{boleto.classe}}">{{boleto.texto}}</span></td></tr>{{/each}}
    </tbody>
    <tfoot><tr><td colspan="4">Subtotal ({{qtdMultas}} multa(s))</td><td class="n mono">{{subtotalValor}}</td><td class="n mono">{{subtotalValorPagar}}</td><td></td></tr></tfoot>
  </table>
  {{else}}<div class="sem">Sem multas ativas.</div>{{/if}}
  {{/if}}
</section>
{{/each}}
{{/if}}

{{#if listaUnica}}
{{#if mostrarMultas}}
<h2 class="secao">{{#if temPeriodo}}Multas da semana ({{periodoTexto}}){{else}}Multas ativas{{/if}}</h2>
{{#if semMultasNoPeriodo}}<div class="vazio">Nenhuma multa com infração neste período.</div>{{/if}}
<table>
<thead><tr><th>Placa</th><th>Contrato</th><th>AIT</th><th>Motivo</th><th>Infração</th><th>Vencimento</th><th class="n">Valor</th><th class="n">A pagar</th></tr></thead>
<tbody>
{{#each multasLista}}<tr><td class="mono"><b>{{placa}}</b></td><td>{{contrato}}</td><td class="mono">{{ait}}</td><td>{{motivo}}</td><td class="mono">{{dataInfracao}}</td><td class="mono{{#if vencida}} vencida{{/if}}">{{dataVencimento}}</td><td class="n mono">{{valor}}</td><td class="n mono">{{valorPagar}}</td></tr>{{/each}}
</tbody>
</table>
{{/if}}
{{#if mostrarRelacaoSituacao}}
<h2 class="secao">Situação de IPVA e licenciamento</h2>
<table>
<thead><tr><th>Placa</th><th>Modelo</th><th>Contrato</th>{{#if mostrarIpva}}<th>IPVA</th>{{/if}}{{#if mostrarLicenciamento}}<th>Licenciamento</th>{{/if}}</tr></thead>
<tbody>
{{#each relacaoSituacao}}<tr><td class="mono"><b>{{placa}}</b></td><td>{{modelo}}</td><td>{{contrato}}</td>{{#if ../mostrarIpva}}<td><span class="chip {{ipva.classe}}">{{ipva.texto}}</span></td>{{/if}}{{#if ../mostrarLicenciamento}}<td><span class="chip {{licenciamento.classe}}">{{licenciamento.texto}}</span></td>{{/if}}</tr>{{/each}}
</tbody>
</table>
{{/if}}
{{/if}}

{{#if mostrarMultas}}
<div class="total"><span>Total — {{totalVeiculosDetalhe}} veículo(s), {{totalMultas}} multa(s)</span><span>Valor {{totalValor}} · A pagar {{totalValorPagar}}</span></div>
{{/if}}
{{/if}}
</body>
</html>`
