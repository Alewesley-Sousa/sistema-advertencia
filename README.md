# sistema-advertencia

Monorepo (npm workspaces) com dois apps independentes e um pacote compartilhado explícito.

| Pacote | O que é | Front (Vite) | API (Express) | Banco |
| :--- | :--- | :--- | :--- | :--- |
| [`apps/wialon`](apps/wialon) (`@force/wialon`) | Gerador de ofícios de advertência por excesso de velocidade (integração Wialon) | `:3000` | `:3333` | `apps/wialon/storage/database.sqlite` |
| [`apps/detran`](apps/detran) (`@force/detran`) | Buscador de multas DETRAN-CE (consulta individual e em lote, download de boletos, relatórios, ZIP) | `:3001` | `:3334` | `apps/detran/storage/database.sqlite` |
| [`packages/shared`](packages/shared) (`@force/shared`) | Infraestrutura comum: erros/respostas HTTP/logger (server) e UI kit, tema, cliente HTTP (web) | — | — | — |

Cada app tem o próprio servidor, banco SQLite, `.env`, build e porta. Um app **nunca importa do outro**; o que for comum vive em `packages/shared` e é importado por `@force/shared/...`.

> Não há Electron/Tauri neste repositório: cada app é um servidor Node (Express) local + front React (Vite).

## Rodando

```bash
npm install                 # na raiz (instala todos os workspaces)
cp apps/wialon/.env.example apps/wialon/.env
cp apps/detran/.env.example apps/detran/.env

npm run dev:wialon          # API :3333 + front :3000
npm run dev:detran          # API :3334 + front :3001
```

Outros comandos (na raiz): `npm run build`, `npm run typecheck`, `npm run test`, `npm run lint`. Para um app só: `npm run build:wialon`, `npm run build:detran`, ou `npm run <script> -w @force/<app>`.

Os dois apps podem rodar ao mesmo tempo (portas distintas). Os dados (`storage/`) são criados na pasta de cada app, a partir do diretório de trabalho do `npm run`.

## Migrando um `storage/` existente

Antes da reorganização existia um único `gerador-oficios-wialon/storage/database.sqlite` com as tabelas dos dois projetos. Para não perder dados locais:

- copie o arquivo (e `pdfs/`, se houver) para `apps/wialon/storage/` — o app Wialon usa só `infracoes` e `configuracoes`;
- copie o mesmo arquivo para `apps/detran/storage/` (mais as pastas de PDFs/downloads do DETRAN) — o app DETRAN usa só `infracoes_detran`, `infracoes_detran_multas` e `lotes_consultas`.

As tabelas do outro app ficam inertes no arquivo e podem ser removidas depois. (`storage/` e `.env` estão no `.gitignore`.)

## Documentação

Veja [`docs/README.md`](docs/README.md).
