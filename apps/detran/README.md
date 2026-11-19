# App DETRAN-CE — Buscador de multas

Consulta débitos/multas de veículos no portal do DETRAN-CE, baixa os boletos em PDF e mantém um histórico local com relatórios e exportação ZIP.

- API `:3334` · front `:3001` · banco `storage/database.sqlite` (criado ao rodar, dentro desta pasta)
- Não usa Electron/IPC: o front chama a API HTTP local e acompanha o lote por **polling** (`GET /api/detran/lotes/:id/status`).

## Como rodar (projeto independente)

Este diretório é um projeto completo: não depende de nenhuma outra pasta do repositório. Pode ser copiado sozinho para outra máquina/servidor.

```bash
cd apps/detran
npm install
cp .env.example .env     # ajuste as variáveis
npm run dev              # API :3334 + front :3001
npm run build            # tsc -b && vite build
npm run typecheck        # tsc (servidor e front)
npm run lint             # oxlint
npm run test              # node:test (dom.test.ts, utils.test.ts)
```

Código reutilizável (UI kit, erros e respostas HTTP, cliente HTTP, tema) está **copiado** em `src/main/shared` e `src/renderer/shared` — não há pacote compartilhado entre os projetos.

## Stack (conforme `apps/detran/package.json`)

| Camada | Tecnologias |
| :--- | :--- |
| Front | React 19, TypeScript, Tailwind v4, React Router, Recharts (relatórios), `xlsx` (leitura da planilha de lote no navegador) |
| API | Node.js, Express 5 |
| Banco | SQLite (`better-sqlite3`) |
| Automação | **Puppeteer** (não Playwright) — `domains/detran/services/scraper/*` |
| Exportação | `archiver` (ZIP), carregado via `createRequire` no controller |
| Código de apoio | cópia local em `src/*/shared` (UI kit, erros, respostas HTTP, cliente HTTP) |

## Fluxo

```text
Front ── POST /detran/consultar (1 veículo)  ou  POST /detran/processar-lote (planilha lida no navegador)
   │
   ▼ infracaoDetranController → detranService.consultarEPersistir / processarFilaLote
   │     lote: concorrência 1 (modo NORMAL) ou 2 (modo RAPIDO) via runWithConcurrency
   ▼ detranScraperService (Puppeteer): central do DETRAN → Taxas/Multas → placa + chassi/renavam
   │     → detecta QUITADO / COM_DEBITO → modal de multas → baixa boletos
   ▼ detranRepository (SQLite) + PDFs em storage/documentos/detran
   ▼ Front: tabela/histórico, drawer de multas, relatórios, exportar ZIP (POST /detran/exportar)
```

## Regras de negócio implementadas

- Status da consulta: `PENDENTE`, `PROCESSANDO`, `QUITADO`, `COM_DEBITO`, `ERRO`; status do lote: `PROCESSANDO`, `CONCLUIDO`, `ERRO`.
- Multas já baixadas (com PDF e sem erro de emissão) não são baixadas de novo, exceto com `forcarRedownload`. A chave de multa é AIT + data da infração.
- Consulta concluída (com multas, ou quitada com `confirmacaoLimpa`) sincroniza as multas ativas: multas que sumiram do DETRAN são **inativadas** (`ativa = 0`, `inativada_em`), não apagadas.
- **Não há atraso fixo de 3,5 s** entre consultas; o controle de taxa é a concorrência do lote (1 ou 2).
- Fase 1 (1 veículo) e fase 2 (lote com fila e ZIP) estão ambas implementadas.

## Rotas (`/api/detran`)

| Método | Rota | Função |
| :--- | :--- | :--- |
| POST | `/consultar` | consulta avulsa de um veículo |
| POST | `/processar-lote` | inicia lote (`nomeArquivo`, `veiculos`, `modoBusca`) |
| GET | `/lotes/:id/status` | progresso do lote |
| GET | `/historico` | consultas paginadas |
| GET | `/relatorios` | agregações para os relatórios |
| GET | `/consultas/:id/multas` | multas de uma consulta |
| GET | `/pdf/:id` · `/multas/:id/pdf` | PDF da consulta / de uma multa |
| POST | `/exportar` | ZIP de multas |

## Tabelas

`infracoes_detran`, `infracoes_detran_multas` (com `ativa`, `baixado_em`, `ultima_consulta_em`, `inativada_em`), `lotes_consultas` (`src/main/database/schema`).

## Pendências em relação aos planos antigos

- **Limpeza manual de multas** (`DELETE /detran/consultas/:id/multas` + botão "Apagar multas"): **não existe**. A implementação final usa inativação (`sincronizarMultasAtivas`), não `removerMultasDaConsulta`.
- A regra "re-baixar boleto quando o download não for de hoje" (`baixado_em` = hoje) **não está aplicada**: `buscarChavesJaBaixadas` considera qualquer PDF já baixado, sem filtro de data (a coluna `baixado_em` e o índice existem).
- `apps/detran/src/shared/types.ts` (tipos do plano IPC original) **não é importado por nenhum arquivo**; mantido por não ter sido auditado como descartável.
