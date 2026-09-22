# Documento de Arquitetura e Mapeamento de Desenvolvimento
## Sistema Desktop de Consulta e Automação de Infrações (DETRAN-CE)

---

## 1. Visão Geral do Sistema e Escopo Incremental (MVP)

O objetivo desta funcionalidade é estender a plataforma desktop existente (Electron + React + TypeScript + Better-SQLite3) para automatizar a consulta de débitos e multas no portal do **DETRAN-CE** a partir da entrada de dados veiculares (Placa e Chassi/Renavam). 

Para garantir estabilidade e validação rápida, o desenvolvimento será **incremental**:
* **Fase 1 (MVP - Meta Atual):** Garantir a execução de **pelo menos 1 veículo** com sucesso de ponta a ponta (envio dos dados -> consulta no scraping -> download/renomeação do PDF -> persistência no banco SQLite local -> exibição no modal/tabela do React).
* **Fase 2 (Escalabilidade):** Execução do lote completo de 55 veículos via fila de trabalho em background com controle de taxa (*throttling*) e empacotamento final em arquivo `.ZIP`.

---

## 2. Estrutura de Arquivos no Projeto Existente

Os novos módulos e ajustes serão encaixados diretamente no ecossistema atual do repositório:

```text
📦src
 ┣ 📂main
 ┃ ┣ 📂controllers
 ┃ ┃ ┣ 📜infracaoController.ts       <-- (Ajustado: manipulação dos endpoints/IPC de consulta)
 ┃ ┃ ┗ ...
 ┃ ┣ 📂database
 ┃ ┃ ┣ 📂schema
 ┃ ┃ ┃ ┣ 📜infracoes.ts             <-- (Ajustado: novos campos para automação e PDF)
 ┃ ┃ ┃ ┗ 📜lotesConsultas.ts        <-- (Novo: controle de lotes de execução)
 ┃ ┃ ┗ 📜db.ts
 ┃ ┣ 📂jobs
 ┃ ┃ ┣ 📜detranBatchJob.ts          <-- (Novo: loop do lote e despacho de eventos IPC)
 ┃ ┃ ┗ 📜infracoesCron.ts
 ┃ ┣ 📂repositories
 ┃ ┃ ┣ 📜infracaoRepository.ts       <-- (Ajustado: persistência local do resultado)
 ┃ ┃ ┗ 📜loteRepository.ts          <-- (Novo: persistência do status do lote)
 ┃ ┣ 📂routes
 ┃ ┃ ┣ 📜infracaoRoutes.ts          <-- (Ajustado: rotas para acionar scraping)
 ┃ ┃ ┗ ...
 ┃ ┣ 📂services
 ┃ ┃ ┣ 📜detranScraperService.ts    <-- (Novo: automação Headless via Playwright)
 ┃ ┃ ┣ 📜excelParserService.ts      <-- (Novo: leitura e validação do Excel/CSV)
 ┃ ┃ ┣ 📜pdfService.ts              <-- (Ajustado: organização e compactação ZIP)
 ┃ ┃ ┗ ...
 ┃ ┗ 📜index.ts                     <-- (Ajustado: registro de IPC handlers)
 ┣ 📂renderer
 ┃ ┣ 📂components
 ┃ ┃ ┣ 📜InfracaoTableRow.tsx       <-- (Ajustado: exibe status da consulta e botão de PDF)
 ┃ ┃ ┣ 📜LoteProgressModal.tsx      <-- (Novo: barra de progresso em tempo real)
 ┃ ┃ ┣ 📜PdfModal.tsx               <-- (Existente: preview do PDF baixado)
 ┃ ┃ ┗ ...
 ┃ ┣ 📂pages
 ┃ ┃ ┗ 📜InfracoesPage.tsx          <-- (Ajustado: botão "Consultar DETRAN-CE" / Upload)
 ┃ ┗ 📜App.tsx
 ┗ 📂shared
 ┃ ┗ 📜types.ts                     <-- (Ajustado: interfaces de Lote e Infracao)
```

---

## 3. Mapeamento Arquitetural (Main vs Renderer)

```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           PROCESS RENDERER (React)                     │
  │  [InfracoesPage] ──(1. Seleciona Arquivo/Placa)──> [useInfracoesHook]   │
  │        ▲                                                     │         │
  │        │ (4. Recebe evento IPC de progresso em tempo real)    │         │
  │  [LoteProgressModal] <───────────────────────────────────────┼────┐    │
  └────────┼─────────────────────────────────────────────────────┼────┼────┘
           │                                                     │    │
           │ ContextBridge / IPC Handle                          │    │
           ▼                                                     ▼    │
  ┌───────────────────────────────────────────────────────────────────┼────┐
  │                            PROCESS MAIN (Node.js)                 │    │
  │  [infracaoController] ──(2. Executa Parser)──> [excelParserService]   │
  │        │                                                          │
  │        └──(3. Inicia Job Background)──> [detranBatchJob]          │
  │                                                │                  │
  │                                      (Itera 1 ou 55 itens)       │
  │                                                ▼                  │
  │                                    [detranScraperService]         │
  │                                                │                  │
  │                                     (Acessa DETRAN-CE)            │
  │                                                │                  │
  │                                                ├──(Envia Progresso)┘
  │                                                ▼
  │                                    [infracaoRepository]
  │                                                │
  │                                      (Grava no SQLite Local)
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Detalhamento dos Módulos para Implementação

### Módulo 1: Recepção de Dados e Parsing (`Main Process`)

1. **Gatilhos de Entrada:**
   * **Modo Teste Unitário / 1 Veículo:** O usuário clica em "Consultar Veículo" direto na tabela para a placa selecionada.
   * **Modo Lote (Excel):** O usuário faz upload do arquivo `.xlsx` na `InfracoesPage.tsx`.

2. **Parsing & Validação (`excelParserService.ts`):**
   * Lê o arquivo recebido no `Main Process`.
   * Mapeia as colunas: `identificador_veiculo`, `placa`, `chassi` (ou `renavam`).
   * Normaliza os valores (remove espaços, hífens e converte caracteres para maiúsculas).

3. **Registro do Lote no SQLite:**
   * Cria registro na tabela `lotes_consultas` (`total = 1` no teste, ou `total = N` no lote).

---

### Módulo 2: Motor de Automação Web (`detranScraperService.ts`)

1. **Configuração do Browser Headless:**
   * Executa em modo *headless* integrado ao processo `Main`.
   * Define diretório padrão para recebimento automático de PDFs sem abrir prompt do SO.

2. **Ciclo de Execução por Veículo (Ponta a Ponta):**
   * **Passo A:** Navega até o portal de emissão/consulta do DETRAN-CE.
   * **Passo B:** Preenche os campos `#placa` e `#chassi`.
   * **Passo C:** Clica no botão de consulta e aguarda a renderização dos resultados.
   * **Passo D (Validação):**
     * **Caso A (Quitado):** Registra no banco local como `QUITADO` / `SEM_DEBITO`.
     * **Caso B (Com Débito do Ano Vigente):** Identifica a pendência (`MULTA`, `IPVA` ou `LICENCIAMENTO`), clica em "Gerar Boleto/PDF" e captura o download.
   * **Passo E (Padronização do Arquivo):**
     * Renomeia o PDF para o formato padrão:  
       `[Identificador]_[Placa]_[TipoDebito]_[Ano].pdf`
     * Move o arquivo para a pasta de armazenamento da aplicação local.

3. **Resiliência e Pausa de Segurança:**
   * Adiciona *delay* de 3,5 segundos entre consultas no modo lote para evitar bloqueios por taxa de requisição no servidor do DETRAN-CE.

---

### Módulo 3: Gerenciador de Job e Notificação IPC (`detranBatchJob.ts`)

1. **Loop de Execução:**
   * O Job orquestra a chamada do `detranScraperService`.
   * A cada veículo processado, o Job calcula o percentual concluído e dispara uma mensagem via IPC para a janela do Electron:
     ```typescript
     mainWindow.webContents.send('detran-progresso', {
       loteId,
       processados: atual,
       total,
       percentual: Math.round((atual / total) * 100),
       itemAtual: veiculo.placa
     });
     ```

2. **Persistência do Resultado:**
   * Atualiza a tabela local SQLite usando `infracaoRepository.ts`.

---

### Módulo 4: Interface e Visualização (`Renderer - React`)

1. **Barra de Progresso (`LoteProgressModal.tsx`):**
   * Escuta o evento IPC `detran-progresso`.
   * Exibe barra preenchida de 0% a 100% e o contador de tempo restante aproximado.

2. **Exibição do Resultado (`InfracaoTableRow.tsx` e `PdfModal.tsx`):**
   * Atualiza a lista de infrações.
   * Se o boleto foi baixado, exibe um badge `COM DÉBITO` e o botão para abrir o PDF diretamente no `PdfModal.tsx` ou na pasta do SO.

---

## 5. Schema do Banco de Dados (Drizzle ORM / Better-SQLite3)

### Tabela: `infracoes` (`src/main/database/schema/infracoes.ts`)

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const infracoes = sqliteTable('infracoes', {
  id: text('id').primaryKey(),
  loteId: text('lote_id'),
  identificadorVeiculo: text('identificador_veiculo'),
  placa: text('placa').notNull(),
  chassi: text('chassi').notNull(),
  statusConsulta: text('status_consulta').notNull(), // 'PENDENTE' | 'QUITADO' | 'COM_DEBITO' | 'ERRO'
  tipoDebito: text('tipo_debito'),                  // 'MULTA' | 'IPVA' | 'LICENCIAMENTO'
  caminhoPdf: text('caminho_pdf'),                  // Caminho absoluto do arquivo PDF baixado
  mensagemErro: text('mensagem_erro'),
  criadoEm: text('criado_em').notNull(),
  atualizadoEm: text('atualizado_em').notNull()
});
```

### Tabela: `lotes_consultas` (`src/main/database/schema/lotesConsultas.ts`)

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const lotesConsultas = sqliteTable('lotes_consultas', {
  id: text('id').primaryKey(),
  nomeArquivo: text('nome_arquivo'),
  status: text('status').notNull(),                 // 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO'
  totalVeiculos: integer('total_veiculos').notNull(),
  processados: integer('processados').default(0),
  criadoEm: text('criado_em').notNull(),
  atualizadoEm: text('atualizado_em').notNull()
});
```

---

## 6. Plano de Validação do MVP (Meta: 1 Veículo)

Para considerar o MVP concluído com sucesso, os seguintes passos devem ser executados sem falhas:

1. **[ ] Teste de Scraping Isolado:** Executar o `detranScraperService` com 1 Placa e 1 Chassi de teste e verificar se o PDF foi salvo na pasta local com o nome correto.
2. **[ ] Teste de Persistência:** Confirmar se a linha foi gravada no banco SQLite local com o status `COM_DEBITO` ou `QUITADO` e o caminho do PDF associado.
3. **[ ] Teste da Interface:** Disparar a consulta a partir da tela `InfracoesPage.tsx` e confirmar se o progresso de 0% a 100% foi exibido e se o botão de abrir PDF funcionou no frontend.