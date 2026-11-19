# sistema-advertencia

Repositório com **dois projetos independentes**. Cada pasta é um projeto completo (próprio `package.json`, lockfile, `node_modules`, servidor, banco SQLite, `.env`, build e documentação) e pode ser copiada e executada sozinha. Não há workspace, pacote compartilhado nem import entre eles.

| Projeto | O que é | API | Front |
| :--- | :--- | :--- | :--- |
| [`apps/wialon`](apps/wialon) | Gerador de ofícios de advertência por excesso de velocidade (integração Wialon) | `:3333` | `:3000` |
| [`apps/detran`](apps/detran) | Buscador de multas DETRAN-CE (consulta avulsa e em lote, boletos, relatórios, ZIP) | `:3334` | `:3001` |

```bash
cd apps/wialon   # ou apps/detran
npm install && cp .env.example .env && npm run dev
```

Cada projeto tem seu `README.md` (stack, fluxo, rotas, regras de negócio, estado do roadmap) e sua pasta `docs/`.

> Não há Electron/Tauri: cada projeto é um servidor Node (Express) local + front React (Vite).

**Duplicação intencional:** UI kit, erros/respostas HTTP, cliente HTTP, tema e fontes existem nas duas pastas (`src/main/shared`, `src/renderer/shared`, `public/`). Uma correção nesses arquivos precisa ser feita nos dois lugares.

## Migrando um `storage/` antigo

Antes existia um único `gerador-oficios-wialon/storage/database.sqlite` com as tabelas dos dois projetos. Copie o arquivo para `apps/wialon/storage/` (usa `infracoes` e `configuracoes`) e outra cópia para `apps/detran/storage/` (usa `infracoes_detran`, `infracoes_detran_multas` e `lotes_consultas`), junto com as pastas `documentos/` de cada um. As tabelas do outro projeto ficam inertes.

## Material antigo

[`docs/legado/`](docs/legado) guarda a especificação HTML antiga (descreve Electron/webhook, que não existem) e a paleta de cores. Não é fonte de verdade.
