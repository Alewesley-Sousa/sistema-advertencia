# App Wialon — Gerador de Ofícios de Advertência

Automatiza a emissão de **ofícios de advertência por excesso de velocidade** a partir das tarefas/notificações do Wialon. Público: operadores de frota e RH/Transporte.

- API `:3333` · front `:3000` · banco `storage/database.sqlite` (criado ao rodar, dentro desta pasta)
- Não é desktop empacotado: é um servidor Node local + front React (não há Electron/Tauri no código).

## Como rodar (projeto independente)

Este diretório é um projeto completo: não depende de nenhuma outra pasta do repositório. Pode ser copiado sozinho para outra máquina/servidor.

```bash
cd apps/wialon
npm install
cp .env.example .env     # ajuste as variáveis
npm run dev              # API :3333 + front :3000
npm run build            # tsc -b && vite build
npm run typecheck        # tsc (servidor e front)
npm run lint             # oxlint
```

Código reutilizável (UI kit, erros e respostas HTTP, cliente HTTP, tema) está **copiado** em `src/main/shared` e `src/renderer/shared` — não há pacote compartilhado entre os projetos.

## Stack (conforme `apps/wialon/package.json`)

| Camada | Tecnologias |
| :--- | :--- |
| Front | React 19, TypeScript, Tailwind v4, React Router, Vite |
| API | Node.js, Express 5, `dotenv`, `cors` |
| Banco | SQLite (`better-sqlite3`, WAL) |
| Integração | Axios → API REST do Wialon (`messages/get_task_messages`) |
| PDF | Puppeteer; o template HTML do ofício está em `domains/infracoes/templates/oficioTemplate.ts` |
| E-mail | Nodemailer (SMTP) |
| Agendamento | `node-cron` (hora em hora) |
| Código de apoio | cópia local em `src/*/shared` (UI kit, erros, respostas HTTP, cliente HTTP) |

Dependências declaradas e **sem uso no código atual**: `@tanstack/react-query`, `zod`, `handlebars`, `puppeteer-core`, `inter-ui` (a fonte Inter é servida de `public/fonts`).

## Fluxo real

```text
[Wialon] ──(cron 0 * * * * ou POST /api/sincronizar)──► wialonSyncService (axios)
        └─► grava eventos em `infracoes` (status REGISTRADO)
                         │
        consolidacaoService (na subida do servidor e a cada hora)
                         │  para dias anteriores a hoje: MAX(velocidade) por data + placa
                         ▼
        pdfService (Puppeteer) → storage/documentos/oficios/*.pdf
        → status GERADO (pdf_path) ; demais eventos do dia/placa → IGNORADO_MENOR_GRAVIDADE
                         ▼
        Operador (front): visualizar PDF · gerar PDF · enviar e-mail (→ ENVIADO) · histórico
```

Não existe endpoint de **webhook** do Wialon: a entrada de dados é por **sincronização** (cron + botão "Sincronizar"). `wialonMockService` / `/api/dev/*` simulam eventos fora de produção.

## Regras de negócio implementadas

- Consolidação por **pico de velocidade** por data e placa (só dias anteriores a hoje).
- Fila operacional: `PENDENTE`/`REGISTRADO` dos últimos 14 dias e `ERRO` dos últimos 30 (filtro de exibição; nada é apagado).
- Histórico: apenas `GERADO` e `ENVIADO`, paginado, com `pdf_path`.
- Status possíveis (`CHECK` em `infracoes`): `PENDENTE`, `REGISTRADO`, `GERADO`, `ENVIADO`, `ERRO`, `DESCARTADO`, `IGNORADO_MENOR_GRAVIDADE`.
- **Não há regra de tolerância de velocidade** no código atual (a especificação antiga a previa).

## Rotas (`/api`)

| Método | Rota | Função |
| :--- | :--- | :--- |
| GET | `/health` | healthcheck |
| POST | `/sincronizar` | sincroniza com o Wialon |
| GET | `/infracoes` | fila operacional |
| GET | `/infracoes/historico` | histórico |
| GET | `/infracoes/:id/preview` · `/:id/pdf` | HTML de preview / PDF |
| POST | `/infracoes/:id/gerar-pdf` · `/:id/enviar-email` | gera ofício / envia e-mail |
| GET·POST·DELETE | `/configuracoes` (`/:chave`) | configurações (ex.: e-mails de notificação) |
| POST · GET | `/dev/mock-wialon`, `/dev/mock-wialon/limpar`, `/dev/oficio/preview` | somente fora de produção |

## Tabelas

`infracoes` e `configuracoes` (`src/main/database/schema`).

## Estado do roadmap

| Bloco | Situação |
| :--- | :--- |
| 1. Base (Express, SQLite, estrutura, aliases) | Feito |
| 2. Integração Wialon (sync, regras) | Sync de unidades e mensagens de tarefa feito; **tolerâncias não implementadas**; entrada por webhook **não existe** |
| 3. Template HTML + PDF (Puppeteer) | Feito; salva em `storage/documentos/oficios` |
| 4. Dashboard React (fila, histórico, PDF, configurações, métricas) | Feito |
| 5. Empacotamento desktop (`.exe`) | **Não iniciado** (nenhuma dependência de Electron/Tauri) |
| Housekeeping 14/30 dias (`DELETE`) | **Não implementado** — ver [docs/alinhamento-dados.md](docs/alinhamento-dados.md) |

## Outros documentos

- [`docs/alinhamento-dados.md`](docs/alinhamento-dados.md) — estratégia de dados curto/longo prazo (com o estado real)
- [`docs/wialon-task-messages-mock.md`](docs/wialon-task-messages-mock.md) — guia/mock da API Wialon
- [`docs/centro-operacoes-infracoes.docx`](docs/centro-operacoes-infracoes.docx) — especificação de UX (Word, não revisada)
