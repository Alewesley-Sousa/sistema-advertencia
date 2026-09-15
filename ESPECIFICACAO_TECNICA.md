
# 📄 Especificação Técnica & Roadmap
## Gerador Automático de Ofícios de Advertência (Wialon)

> Documento de Arquitetura, Especificação Técnica e Trajetória de Desenvolvimento.

---

## 01. Visão Geral do Projeto

O objetivo do sistema é automatizar a emissão de **Ofícios de Advertência por Excesso de Velocidade**. O sistema receberá notificações de infrações em tempo real da plataforma **Wialon**, processará as regras de negócio, consultará dados complementares de veículos/condutores e gerará um documento PDF formatado de forma automática.

---

## 02. Escopo e Implantação

* **Público-Alvo:** Operadores da frota e setor de Recursos Humanos / Transporte da empresa.
* **Modelo de Implantação:** Aplicação local (Desktop / Executável `.exe`) com backend integrado e banco de dados embarcado.

---

## 03. Arquitetura e Stack Tecnológica

| Camada | Tecnologias | Descrição |
| :--- | :--- | :--- |
| **Frontend (UI)** | React, TypeScript, Tailwind CSS | Interface gráfica para visualização do histórico, gerenciamento de regras, logs e visualização de 2ª via dos PDFs. |
| **Backend (API)** | Node.js, Express, TypeScript | Servidor HTTP local para recepção de Webhooks da API do Wialon, processamento das regras e geração dos documentos. |
| **Banco de Dados** | SQLite (`better-sqlite3`) | Banco de dados relacional leve em arquivo local embarcado, dispensando instalação de servidores externos. |
| **Motor de PDF** | Puppeteer / HTML-pdf | Renderização do template HTML/Tailwind em arquivos PDF oficiais de alta fidelidade. |
| **Empacotamento** | Electron / Tauri | Empacotamento do backend e frontend em um único executável desktop (`.exe`). |

---

## 04. Fluxo de Funcionamento (Pipeline)

```text
[ Wialon (Nuvem) ] 
       │
       ▼ (Webhook HTTP POST)
[ Servidor Node.js Local ] ──► [ Validação & Regra de Negócio ]
                                           │
                                           ▼
                               [ Consulta API Wialon ] (Dados do Condutor/Veículo)
                                           │
                                           ▼
                               [ Preenchimento do Template HTML ]
                                           │
                                           ▼
                               [ Geração do PDF (Puppeteer) ]
                                           │
                                           ▼
                               [ Armazenamento no SQLite & Pasta Local ]

```

---

## 05. Requisitos Funcionais

1. **Recepção de Alertas:** Expor um endpoint HTTP (`POST /api/webhooks/wialon`) para receber os dados de excesso de velocidade.
2. **Processamento & Filtros:** Identificar veículo, grupo, velocidade registrada, limite da via e aplicar tolerâncias antes de disparar a infração.
3. **Geração Automática do Documento:** Preencher o template HTML e compilar o PDF na pasta local configurada (`/documentos/oficios/`), registrando:
* Condutor / Matrícula
* Placa & Modelo
* Data, Hora & Localização
* Velocidade Registrada vs. Limite da Via


4. **Painel de Gestão (Dashboard React):** Tabela de histórico de infrações, download de 2ª via e tela de configurações (tokens da API Wialon, regras de tolerância e diretórios).

---

## 06. Trajetória de Desenvolvimento em Blocos (Roadmap)

### 🧱 Bloco 1: Setup da Base & Arquitetura

> **Objetivo:** Estabelecer a infraestrutura inicial do projeto monorepo/desktop.

* [x] Estruturar pastas organizadas (`src/main`, `src/renderer`, `src/shared`).
* [x] Configurar aliases de importação (`@/`) no TypeScript e Vite.
* [ ] Configurar servidor backend Express básico integrado ao Vite.
* [ ] Criar conexão e migrações iniciais da base de dados SQLite.

### 🧱 Bloco 2: Integração Wialon & Webhook Engine

> **Objetivo:** Receber e processar requisições em tempo real.

* [ ] Definir o schema dos dados recebidos via Webhook do Wialon.
* [ ] Criar rotas do Webhook no backend para validação das requisições.
* [ ] Implementar serviço de comunicação com a API REST do Wialon (enriquecimento de dados do condutor/veículo).
* [ ] Criar camada de regras de negócio e validação de tolerâncias de velocidade.

### 🧱 Bloco 3: Template HTML & Engine de Impressão PDF

> **Objetivo:** Transformar as infrações processadas em documentos oficiais.

* [ ] Desenvolver o layout HTML/Tailwind responsivo do Ofício de Advertência.
* [ ] Configurar o Puppeteer para renderização e exportação do HTML para PDF.
* [ ] Implementar salvamento automático de arquivos na estrutura de diretórios locais (`/documentos/oficios/`).

### 🧱 Bloco 4: Dashboard & Interface de Operação (React)

> **Objetivo:** Construir a interface do usuário para acompanhamento das infrações.

* [ ] Criar tabela de histórico de ofícios gerados com filtros e busca.
* [ ] Implementar modal de visualização rápida do PDF (2ª via).
* [ ] Desenvolver tela de configurações (credenciais Wialon, limites e pastas do sistema).
* [ ] Adicionar indicadores (Cards de totais do dia, alertas pendentes e falhas).

### 🧱 Bloco 5: Empacotamento Desktop & Finalização

> **Objetivo:** Entregar a aplicação funcional em arquivo único executável `.exe`.

* [ ] Configurar empacotador (Electron / Tauri) para juntar Frontend + Backend.
* [ ] Testar fluxo completo de inicialização local e persistência no SQLite.
* [ ] Gerar o build final (`.exe`) e validar em ambiente limpo de produção.

```

---

<ElicitationsGroup message="Como deseja dar prosseguimento ao projeto?">
  <Elicitation label="Criar o banco SQLite (Bloco 1)" query="Vamos implementar a conexão SQLite e a tabela de infrações no backend."/>
  <Elicitation label="Criar o template do Ofício HTML (Bloco 3)" query="Vamos desenvolver o layout HTML/Tailwind do Ofício de Advertência para a conversão em PDF."/>
</ElicitationsGroup>

```