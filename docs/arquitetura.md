# Arquitetura do monorepo

## Estrutura

```text
sistema-advertencia/
├── package.json              # workspaces: apps/*, packages/*  (+ scripts da raiz)
├── package-lock.json         # lockfile único
├── .oxlintrc.json            # lint (oxlint) para apps/ e packages/
├── apps/
│   ├── wialon/               # @force/wialon  — ofícios de advertência (Wialon)
│   │   ├── src/main/         #   API Express, SQLite, cron, PDF, e-mail
│   │   ├── src/renderer/     #   front React (Vite)
│   │   ├── scripts/          #   wialon_explorer.py (exploração da API Wialon)
│   │   ├── .env.example  index.html  vite.config.ts  tsconfig*.json
│   │   └── storage/          #   (gerado) database.sqlite, documentos/oficios, debug/wialon
│   └── detran/               # @force/detran  — buscador de multas DETRAN-CE
│       ├── src/main/         #   API Express, SQLite, scraper Puppeteer, ZIP
│       ├── src/renderer/     #   front React (Vite)
│       ├── src/shared/types.ts   (tipos do módulo DETRAN, sem uso atual)
│       ├── .env.example  index.html  vite.config.ts  tsconfig*.json
│       └── storage/          #   (gerado) database.sqlite, documentos/detran, debug/detran
├── packages/
│   └── shared/               # @force/shared — único código compartilhado
│       ├── public/           #   fontes, favicon, ícones, logo (publicDir dos dois apps)
│       └── src/
│           ├── server/       #   errors, http (asyncHandler, paginação), logger, utils (respostas/params)
│           └── web/          #   ui (componentes), lib (cn, format), hooks, layout, api (createApi), tema (theme.css), assets
└── docs/
```

## Regras de isolamento

1. **Apps não se importam.** `apps/wialon` e `apps/detran` só dependem de seus próprios arquivos e de `@force/shared`.
2. **`@force/shared` não conhece nenhum app.** Nada de regra de negócio, rota, tabela ou URL de API dentro dele. O cliente HTTP é uma fábrica (`createApi(baseURL)`); cada app informa a sua URL.
3. **Entradas públicas do shared** (`exports` do `package.json`): `@force/shared/server`, `@force/shared/web`, `@force/shared/web/api` (cliente HTTP e tipos de paginação, separado porque o tipo `Pagination` colide com o componente `Pagination`) e `@force/shared/web/assets/*`. Não há imports por caminho profundo.
4. **Banco e storage por app.** Cada app abre `storage/database.sqlite` relativo ao diretório de trabalho (a pasta do app, quando iniciado via `npm run ... -w`). Não há tabela compartilhada.
5. **Configuração por app.** Cada app tem `.env`, porta de API, origem de CORS e porta do Vite próprios.
6. **Duplicação aceita e intencional:** `database/db.ts` (8 linhas de abertura do SQLite), `services/api.ts` (1 linha com a `baseURL`) e o `Header` (cada app mostra só a sua navegação). Se algo passar disso, vira candidato a `packages/shared`.

## Tailwind

Tailwind v4 só escaneia a raiz do app. Por isso o `src/renderer/index.css` de cada app contém `@import "tailwindcss"`, importa `packages/shared/src/web/theme.css` e declara `@source` apontando para `packages/shared/src/web`. Sem essa linha, as classes usadas apenas nos componentes compartilhados não seriam geradas.

## Build e execução

- `dev` de cada app roda `tsx watch src/main/index.ts` (API) e `vite` (front) em paralelo.
- `build` de cada app: `tsc -b && vite build`. O backend roda direto com `tsx` (não há build de produção do servidor, igual ao estado anterior).
- O pacote `@force/shared` é consumido como **código-fonte TypeScript** (sem build próprio); `tsx` e `vite` transpilam.
