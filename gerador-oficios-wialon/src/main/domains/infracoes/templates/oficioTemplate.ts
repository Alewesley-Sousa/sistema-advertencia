// src/main/domains/infracoes/templates/oficioTemplate.ts

export interface OficioTemplateData {
  id: number
  placa: string
  condutor: string
  velocidade: number
  endereco: string
  data_hora: string | null   // ← aceita null

  cpf?: string
  cargo?: string
  cidadeEmissao?: string
  dataEmissaoExtenso?: string
  logoBase64?: string
}

const EMPRESA = {
  razaoSocial: 'FORCE REPRESENTACAO COMERCIO E SERVICOS LTDA',
  cnpj: '21.765.330/0001-48',
  endereco: 'Rua Raimunda Nogueira Martins, 1230',
  cep: 'Cep: 61.700-000',
  bairro: 'Parque das Flores',
  cidade: 'Aquiraz',
  uf: 'Ce',
  contato: '(85) 3275-2444',
  email: 'administrativo@staff-ge.com.br',
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/* ═══════════════════════════════════════════════════════════════
   LOGO PADRÃO — extraída do próprio HTML/PDF do ofício
   (JPEG base64, dimensões originais 180.24pt × 36.24pt)
   ═══════════════════════════════════════════════════════════════ */
const LOGO_PADRAO_BASE64 = 'data:image/jpeg;base64,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lBVvULQ3US7G2uh3L6UJwg0twkq1WEpWs7WS/P8A4Bmi5tsfNfXJPc5qRrlhPZrFNIY2JyWPJ5qXGqY/1UH5D/GiS0upri2lkVAUJ3bT05q7x6/mYqNS2ifTo11Xmys9wVuplurmeMBjtVfSrNhNBJcgJdTO2D8rng0+X+0jI22KErk4yO350W8F417HNcLGqopA2jrmlJxcf+CXCM4zVrvXqn+dzRooorkPTCiiigApskUcqFJEV1PZhkUUUAc9feCtHuipjja225/1R6/nXP3Hw+u0SRobyOQjJVNpBPtnpRRWiqSXUhwizJPg3xBn/jw/8jR//FUf8Id4g/6B/wD5Gj/+KooqvbSJ9lEtWPgbV53IuVS1UDIZmDZPp8prbsfh/bomb27eR88eWMDH40UUnVkxqnFHT2GkafpwP2S1SMnqep/WrtFFZN33NNgooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA/9k=' // ← mantém a tua

function formatarDataExtenso(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = MESES[data.getMonth()]
  const ano = data.getFullYear()
  return `${dia} de ${mes} de ${ano}`
}

function sanitizar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Extrai dia/mês e hora/minuto. Aceita dois formatos:
 *
 *   1) Canônico do SQLite / Wialon:
 *      "2024-05-12 16:20:00"
 *      "2024-05-12T16:20:00"
 *
 *   2) Saída do toLocaleString('pt-BR') (usado pelo consolidador):
 *      "12/05/2024, 16:20:00"
 *      "12/05/2024 16:20:00"
 *
 * NÃO usa `new Date()` — evita Invalid Date silencioso,
 * dependência de runtime e deslocamento de fuso.
 */
function parseDataHora(raw: string | null | undefined): {
  diaMes: string
  hora: string
} {
  if (!raw) return { diaMes: '—', hora: '—' }

  const str = String(raw).trim()

  // Formato 1 — YYYY-MM-DD[ T]HH:mm
  const iso = str.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
  )
  if (iso) {
    const [, , mes, dia, hh, mi] = iso
    return { diaMes: `${dia}/${mes}`, hora: `${hh}:${mi}` }
  }

  // Formato 2 — DD/MM/YYYY[, ]HH:mm
  const br = str.match(
    /^(\d{2})\/(\d{2})\/(\d{4})[,\s]+(\d{2}):(\d{2})/
  )
  if (br) {
    const [, dia, mes, , hh, mi] = br
    return { diaMes: `${dia}/${mes}`, hora: `${hh}:${mi}` }
  }

  return { diaMes: '—', hora: '—' }
}

/* ── Timbrado (SVG) ─────────────────────────────────────────────
   Coordenadas em mm, viewBox = 210 × 297 (A4).
   Idêntico ao HTML de referência.
   ─────────────────────────────────────────────────────────────── */
function timbradoSvg(): string {
  return `
    <svg class="timbrado" xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 210 297" preserveAspectRatio="none">
      <!-- Faixa ciano — topo esquerdo -->
      <polygon points="5.97,21.00 5.97,0 62.78,0" fill="rgb(73, 182, 239)" />
      <!-- Faixa escura — topo esquerdo -->
      <polygon points="0.13,27.86 0.13,0 24.01,0" fill="rgb(42, 63, 87)" />
      <!-- Faixa ciano — fundo direito -->
      <polygon points="204.21,278.89 204.21,299.85 147.40,299.85" fill="rgb(73, 182, 239)" />
      <!-- Faixa escura — fundo direito -->
      <polygon points="210.00,271.99 210.00,299.85 186.19,299.85" fill="rgb(42, 63, 87)" />
    </svg>
  `
}

/* ── Template ──────────────────────────────────────────────────── */
export function gerarHtmlOficio(dados: OficioTemplateData): string {
  const agora = new Date()
  const dataEmissao = dados.dataEmissaoExtenso ?? formatarDataExtenso(agora)
  const cidade = dados.cidadeEmissao ?? EMPRESA.cidade

  const nomeCondutor = sanitizar(dados.condutor || 'Não informado')
  const placa = sanitizar(dados.placa)
  const cpf = sanitizar(dados.cpf ?? '—')
  const cargo = sanitizar(dados.cargo ?? 'MOTORISTA (CATEGORIA B)')

  const { diaMes, hora } = parseDataHora(dados.data_hora)

  // Logo: se vier do banco, usa; senão, usa a embutida (extraída do PDF)
  const logoBase64 = dados.logoBase64 ?? LOGO_PADRAO_BASE64
  const logoHtml = `<img class="logo" src="${logoBase64}" alt="Force" />`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Comunicado de Advertência Disciplinar — ${placa}</title>
<style>
  /* ── @font-face: MANTER OS 4 BLOCOS JÁ EXISTENTES ── */
  /* (F1 Lucida Sans / F2 Times Bold / F3 Arial Bold / F4 Times Regular) */

  @page { size: A4; margin: 0; }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    /* Cores do timbrado (extraídas do PDF) */
    --timbre-escuro: rgb(42, 63, 87);
    --timbre-claro:  rgb(73, 182, 239);

    /* Layout — valores em mm, calibrados pela régua do PDF */
    --margem-lateral: 25mm;

    /* Cabeçalho */
    --logo-top: 11.43mm;
    --logo-altura: 12.79mm;
    --gap-logo-titulo: 22.94mm;

    /* Título */
    --titulo-altura: 5.48mm;
    --gap-titulo-corpo: 8.16mm;

    /* Corpo */
    --tam-titulo: 14.04pt;
    --tam-corpo: 12pt;
    --tam-rodape: 9.96pt;
    --lh-corpo: 4.87mm;
    --gap-paragrafo: 1.57mm;

    /* Blocos entre seções */
    --gap-corpo-aquiraz: 14.65mm;
    --gap-aquiraz-ass1: 16.35mm;
    --gap-ass1-ass2: 14.66mm;

    /* Rodapé — topo absoluto do container */
    --rodape-top: 268.15mm;
  }

  html, body {
    background: #e5e7eb;
    font-family: system-ui, -apple-system, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ═══════════════════════════════════════════════════════════════
     PÁGINA — A4 exata, sem fluxo externo
     ═══════════════════════════════════════════════════════════════ */
  .pagina {
    position: relative;
    width: 210mm;
    height: 297mm;
    margin: 0 auto;
    background: #ffffff;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
    overflow: hidden;

    font-family: 'Times New Roman', 'Liberation Serif', Georgia, serif;
    color: #000000;
  }

  /* ═══════════════════════════════════════════════════════════════
     TIMBRADO — SVG cobre a página inteira
     ═══════════════════════════════════════════════════════════════ */
  .timbrado {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  }

  /* ═══════════════════════════════════════════════════════════════
     CABEÇALHO — logo centralizada, topo exato
     ═══════════════════════════════════════════════════════════════ */
  .cabecalho {
    position: relative;
    z-index: 1;
    padding-top: var(--logo-top);
    height: calc(var(--logo-top) + var(--logo-altura));
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .logo {
    height: var(--logo-altura);
    width: auto;
    display: block;
  }

  /* ═══════════════════════════════════════════════════════════════
     CONTEÚDO — tudo flui a partir daqui
     ═══════════════════════════════════════════════════════════════ */
  .conteudo {
    position: relative;
    z-index: 1;
    padding: 0 var(--margem-lateral);
  }

  /* ─── Título ─────────────────────────────────────────────────── */
  .titulo {
    text-align: center;
    font-size: var(--tam-titulo);
    font-weight: 700;
    line-height: 1.1;
    margin-top: var(--gap-logo-titulo);
    margin-bottom: var(--gap-titulo-corpo);
  }

  /* ─── Corpo do texto ─────────────────────────────────────────── */
  .corpo {
    font-size: var(--tam-corpo);
    line-height: var(--lh-corpo);
    text-align: justify;
  }

  .corpo p { margin: 0; }
  .corpo p + p { margin-top: var(--gap-paragrafo); }

  .destacado { font-weight: 700; }

  /* ─── Local e data ───────────────────────────────────────────── */
  .local-data {
    font-size: var(--tam-corpo);
    line-height: var(--lh-corpo);
    margin-top: var(--gap-corpo-aquiraz);
  }

  /* ─── Assinaturas ────────────────────────────────────────────── */
  .assinatura-1 { margin-top: var(--gap-aquiraz-ass1); }
  .assinatura-2 { margin-top: var(--gap-ass1-ass2); }

  .assinatura {
    font-size: var(--tam-corpo);
    line-height: var(--lh-corpo);
  }

  .assinatura-linha {
    width: 127mm;
    border-bottom: 1px solid #000000;
    margin-bottom: 1.27mm;
  }

  .assinatura-nome { font-weight: 700; }
  .assinatura-info { font-weight: 700; }

  /* ─── Rodapé — posicionado absoluto no fundo ─────────────────── */
  .rodape {
    position: absolute;
    z-index: 1;
    left: var(--margem-lateral);
    right: var(--margem-lateral);
    top: var(--rodape-top);
    font-size: var(--tam-rodape);
    line-height: 1.5;
  }

  .rodape p { margin: 0; }
</style>
</head>
<body>

<div class="pagina">

  <!-- ═══ TIMBRADO ═══ -->
  ${timbradoSvg()}

  <!-- ═══ CABEÇALHO ═══ -->
  <header class="cabecalho">
    ${logoHtml}
  </header>

  <!-- ═══ CONTEÚDO ═══ -->
  <main class="conteudo">

    <h1 class="titulo">COMUNICADO DE ADVERTÊNCIA DISCIPLINAR</h1>

    <div class="corpo">
      <p>Prezado Senhor <span class="destacado">${nomeCondutor}</span>,</p>

      <p>
        Pelo presente instrumento, aplicamos a V. Sa. a penalidade de
        <span class="destacado">ADVERTÊNCIA DISCIPLINAR POR ESCRITO</span>,
        em razão da conduta inadequada identificada no dia
        <span class="destacado">${diaMes}</span>, às
        <span class="destacado">${hora}</span>.
      </p>

      <p>
        Constatou-se, por meio dos registros de ponto eletrônico e do sistema
        de telemetria do veículo, que V. Sa. conduzia o veículo de placa
        <span class="destacado">${placa}</span>, vinculado ao contrato da empresa,
        em velocidade superior à máxima permitida para a via (excesso de
        velocidade), gerando uma autuação de trânsito.
      </p>

      <p>
        A condução de veículos da empresa fora das normas de trânsito vigentes
        e dos padrões de segurança estabelecidos constitui descumprimento das
        obrigações contratuais e das normas internas da instituição.
      </p>

      <p>
        Esclarecemos que a repetição de condutas desta natureza, ou o cometimento
        de outras faltas disciplinares, ensejará a aplicação de penalidades mais
        severas, que podem incluir suspensão ou, eventualmente, a rescisão do
        contrato de trabalho por justa causa, nos termos da Consolidação das
        Leis do Trabalho (CLT).
      </p>

      <p>
        Solicitamos sua assinatura no ciente deste documento, comprometendo-se
        a observar rigidamente as normas de trânsito e de segurança da empresa
        nas próximas ocasiões.
      </p>
    </div>

    <p class="local-data">${sanitizar(cidade)}, ${dataEmissao}</p>

    <div class="assinatura assinatura-1">
      <div class="assinatura-linha"></div>
      <p class="assinatura-nome">${nomeCondutor}</p>
      <p class="assinatura-info">${cargo}</p>
      <p class="assinatura-info">CPF: ${cpf}</p>
    </div>

    <div class="assinatura assinatura-2">
      <div class="assinatura-linha"></div>
      <p class="assinatura-nome">${EMPRESA.razaoSocial}</p>
      <p class="assinatura-info">CNPJ: ${EMPRESA.cnpj}</p>
    </div>

  </main>

  <!-- ═══ RODAPÉ ═══ -->
  <footer class="rodape">
    <p>Force Representação Comercio E Serviços Ltda – Cnpj: ${EMPRESA.cnpj}</p>
    <p>${EMPRESA.endereco} ${EMPRESA.cep}, ${EMPRESA.bairro}-${EMPRESA.cidade}/${EMPRESA.uf}</p>
    <p>Contato: ${EMPRESA.contato} E-Mail: ${EMPRESA.email}</p>
  </footer>

</div>

</body>
</html>
`
}