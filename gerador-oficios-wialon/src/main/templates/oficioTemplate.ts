export interface OficioTemplateData {
  id: number
  placa: string
  condutor: string
  velocidade: number
  limite_via: number
  endereco: string
  data_hora: string
}

export function gerarHtmlOficio(dados: OficioTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ofício de Advertência - ${dados.placa}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1f2937;
      background-color: #ffffff;
    }
  </style>
</head>
<body class="p-8 max-w-[210mm] mx-auto bg-white text-sm leading-relaxed">

  <!-- Cabeçalho Institucional -->
  <header class="border-b-2 border-gray-800 pb-4 mb-8 flex justify-between items-center">
    <div>
      <h1 class="text-xl font-bold uppercase tracking-wider text-gray-900">Gestão de Frotas & Transportes</h1>
      <p class="text-xs text-gray-500">Departamento de Recursos Humanos & Segurança Viária</p>
    </div>
    <div class="text-right">
      <span class="text-xs font-semibold bg-gray-100 text-gray-800 px-3 py-1 rounded border border-gray-300">
        OFÍCIO Nº ${String(dados.id || 1).padStart(4, '0')}/2026
      </span>
    </div>
  </header>

  <!-- Título do Documento -->
  <div class="text-center my-6">
    <h2 class="text-lg font-extrabold uppercase text-gray-900 underline decoration-2 underline-offset-4">
      Notificação de Advertência Disciplinar por Infração de Trânsito
    </h2>
  </div>

  <!-- Destinatário -->
  <div class="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
    <p><strong>À(Ao) Sr.(a) Condutor(a):</strong> <span class="uppercase">${dados.condutor}</span></p>
    <p><strong>Veículo / Placa:</strong> ${dados.placa}</p>
    <p class="text-xs text-gray-500 mt-1">Registro gerado automaticamente via Sistema de Monitoramento Wialon.</p>
  </div>

  <!-- Corpo do Texto / Embasamento Jurídico -->
  <div class="space-y-4 text-justify text-gray-800">
    <p>
      Prezado(a) Colaborador(a),
    </p>
    <p>
      O presente documento tem por finalidade formalizar a aplicação de <strong>ADVERTÊNCIA ESCRITA</strong>, em conformidade com as diretrizes de segurança viária da empresa e o artigo 474 da Consolidação das Leis do Trabalho (CLT), em decorrência de infração cometida na condução de veículo corporativo.
    </p>
    <p>
      Conforme os registros telemáticos obtidos através da plataforma de rastreamento em <strong>${dados.data_hora}</strong>, constatou-se que o veículo sob sua responsabilidade operava a uma velocidade de <strong>${dados.velocidade} km/h</strong> em uma via cujo limite regulamentado é de <strong>${dados.limite_via} km/h</strong>.
    </p>
    <p>
      <strong>Local da Ocorrência:</strong> ${dados.endereco}
    </p>
    <p>
      Ressaltamos que o excesso de velocidade coloca em risco não apenas a integridade física do condutor e de terceiros, mas também o patrimônio da empresa e a conformidade legal das operações de transporte.
    </p>
    <p>
      Solicitamos a máxima atenção e o estrito cumprimento das normas de trânsito vigentes em suas próximas jornadas. Destacamos que a reiteração de condutas semelhantes poderá acarretar medidas disciplinares mais severas, incluindo suspensão e rescisão contratual por justa causa, conforme a legislação aplicável.
    </p>
  </div>

  <!-- Encerramento e Data -->
  <div class="mt-8 text-right">
    <p>Fortaleza - CE, ${new Date().toLocaleDateString('pt-BR')}</p>
  </div>

  <!-- Assinaturas -->
  <div class="mt-20 grid grid-cols-2 gap-12 text-center">
    <div class="border-t border-gray-400 pt-2">
      <p class="font-semibold uppercase text-xs">${dados.condutor}</p>
      <p class="text-xs text-gray-500">Ciente do Colaborador</p>
    </div>
    <div class="border-t border-gray-400 pt-2">
      <p class="font-semibold uppercase text-xs">Gestão de Frota / RH</p>
      <p class="text-xs text-gray-500">Empresa Responsável</p>
    </div>
  </div>

</body>
</html>
  `
}