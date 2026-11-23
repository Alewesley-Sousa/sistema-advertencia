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
| POST | `/relatorio-pdf` | Relatório A4 em PDF conforme a configuração enviada |
| GET | `/automacao/status` | Estado da automação (só contagens e histórico) |
| PUT | `/automacao/veiculos` | Importa/substitui a lista (guardada cifrada) |
| DELETE | `/automacao/veiculos` | Remove a lista guardada |
| POST | `/automacao/executar` | Dispara a rotina semanal agora (202) |
| POST | `/automacao/reenviar` | Reenvia o e-mail com os dados já consultados, sem nova busca (202) |
| POST | `/relatorio-pdf/previa` | Contagens (veículos, multas, valor) do que o PDF conteria |

## Relatório em PDF

Exportação configurável, disponível na tabela de consultas (botão **Relatório PDF**) e na aba **Relatórios** (**Exportar PDF**, respeitando o filtro de contratos).

- **Contrato** (front e back): `src/shared/relatorioContrato.ts`; validação Zod em `src/main/domains/detran/relatorio/relatorioSchema.ts`.
- **Seleção**: `IDS` (veículos marcados, qualquer página; máx. 5000) ou `FILTRO` (busca, status e contratos resolvidos no servidor — "todos os N filtrados").
- **Escopo**: todos os selecionados · só com multas ativas · com pendências gerais (multa, IPVA ou licenciamento em débito).
- **Seções**: resumo consolidado, multas detalhadas, IPVA, licenciamento (ao menos uma).
- **Organização**: por veículo (bloco com subtotal) ou lista única; ordenação de veículos (placa, valor, nº de multas, contrato) e de multas (vencimento, valor, infração recente). O DETRAN não informa gravidade, então não há ordenação por ela.
- **Geração**: view model puro (`relatorioModelo.ts`) → template Handlebars (`relatorioTemplate.ts`) → Puppeteer (`page.pdf`, A4, rodapé "Página X de Y"). Logo e fonte Inter são embutidas a partir de `public/`.
- **Limite conhecido**: IPVA e licenciamento mostram apenas a situação (o scraper não guarda valores deles).
- Testes: `relatorio/relatorio.test.ts`.

## Automação semanal (relatório por e-mail)

Toda sexta-feira (padrão `0 7 * * 5`, fuso `America/Fortaleza`) o servidor decifra a lista, consulta o DETRAN-CE (concorrência 1 ou 2), gera o PDF e envia por e-mail. Desligada por padrão; configure o bloco "Automação semanal" do `.env.example` e abra **Automação semanal** na tela de consultas para importar a lista.

- **Cofre**: `automacao/cofre.ts` — AES-256-GCM, IV aleatório por gravação, AAD fixo, tag de autenticação (adulteração é detectada). A chave vem de `DETRAN_COFRE_CHAVE` (`npm run cofre:gerar-chave`) ou de `DETRAN_COFRE_SENHA` (scrypt). Rotação: coloque a chave antiga em `DETRAN_COFRE_CHAVE_ANTERIOR`; a lista é regravada com a nova na próxima leitura. **Perdeu a chave = reimportar a lista.**
- **Banco**: só o blob cifrado e a contagem ficam em `automacao_cofre`; o histórico (`automacao_execucoes`) não guarda placas nem e-mails. A API nunca devolve a lista.
- **Resiliência**: falha em um veículo não derruba a rodada (PDF sai com aviso no e-mail); falha total (cofre ilegível, nenhuma consulta ok, PDF) envia e-mail de alerta; travas impedem duas rodadas ao mesmo tempo; e-mail com 3 tentativas e backoff (erros de autenticação/destinatário não são repetidos).
- **E-mail**: `emailTemplate.ts` — tabelas + CSS inline, 600 px, logo e GIF opcional embutidos por CID, versão texto. Para o GIF, coloque `public/email/banner.gif` (≤ 1 MB, 600 px de largura; o **1º quadro** deve trazer a mensagem, pois o Outlook desktop não anima). Sem o arquivo, o e-mail sai sem GIF. Use remetente de domínio com SPF/DKIM/DMARC.
- **Limites conhecidos**: o servidor precisa estar ligado na sexta (não há reposição de execução perdida — use "Executar agora"); o restante do `database.sqlite` (resultados das consultas) **não** é cifrado — proteja a pasta `storage/` com BitLocker/permissões do SO; a chave em `.env` é texto puro no disco, prefira variável de ambiente do sistema em produção; a API local não tem autenticação (não exponha a porta na rede).

## Tabelas

`infracoes_detran`, `infracoes_detran_multas` (com `ativa`, `baixado_em`, `ultima_consulta_em`, `inativada_em`), `lotes_consultas` (`src/main/database/schema`).

## Pendências em relação aos planos antigos

- **Limpeza manual de multas** (`DELETE /detran/consultas/:id/multas` + botão "Apagar multas"): **não existe**. A implementação final usa inativação (`sincronizarMultasAtivas`), não `removerMultasDaConsulta`.
- A regra "re-baixar boleto quando o download não for de hoje" (`baixado_em` = hoje) **não está aplicada**: `buscarChavesJaBaixadas` considera qualquer PDF já baixado, sem filtro de data (a coluna `baixado_em` e o índice existem).
- `apps/detran/src/shared/types.ts` (tipos do plano IPC original) **não é importado por nenhum arquivo**; mantido por não ter sido auditado como descartável.

## Uso de memória em segundo plano
- O Chromium (scraper e PDF) **fecha sozinho** após `BROWSER_OCIOSO_MIN` minutos sem uso (padrão 2) e reabre quando necessário. Em repouso, só o Node fica na RAM.
- Em produção o servidor roda **compilado** (`npm run build:prod`), em Node puro, sem o `tsx` (~30 MB a menos).
- `ecosystem.config.cjs` sobe o servidor com PM2 em um único processo, com teto de heap e reinício automático se passar de 350 MB:
  `npm run build:prod && pm2 start ecosystem.config.cjs && pm2 save`
- A cada atualização no servidor: `git pull`, `npm install`, `npm run build:prod`, `pm2 restart detran`.

## Segurança de acesso (túnel) e backup
- O servidor escuta só em `127.0.0.1` (`HOST`). O túnel deve apontar para `http://127.0.0.1:3334`.
- **Dispositivos aprovados** (ligado por padrão, exceto em `npm run dev`): quem abre o sistema sem aprovação vê uma tela com um código.
  Libere pelo servidor: `npm run dispositivos -- listar`, `aprovar 7F3A-91C2 "PC da Maria"`, `revogar CODIGO`, `remover CODIGO`.
  A identidade é do **navegador** (cookie com token aleatório; o banco guarda só o hash). Outro navegador, janela anônima ou cookies apagados pedem nova aprovação.
  Camada extra opcional: `IPS_PERMITIDOS`.
- **Limite de requisições** por dispositivo: `RATE_LIMIT_GERAL` (600/min) e `RATE_LIMIT_PESADO` (20/min em consulta, lote, PDF e automação — só POST/PUT/DELETE).
- Downloads de PDF só servem arquivos dentro de `storage/`.
- **Histórico da automação** registra quem executou (dispositivo e IP, ou "Agendador").
- **Backup** diário às 02:30 (`BACKUP_CRON`): cópia consistente do banco, verificada, mais os PDFs (`storage/documentos`), retenção de 14 dias (mantém sempre os 3 últimos; PDFs nunca são apagados do backup).
  Manual: `npm run dispositivos -- backup`. Defina `BACKUP_DIR` para **outro disco ou pasta de rede**.
- Rode o PM2 com um usuário Windows comum (não administrador), com acesso apenas à pasta do app.

