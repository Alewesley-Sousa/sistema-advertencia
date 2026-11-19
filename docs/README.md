# Documentação

| Documento | Conteúdo |
| :--- | :--- |
| [`arquitetura.md`](arquitetura.md) | Estrutura do monorepo, regras de isolamento entre os apps, `packages/shared`, portas e dados |
| [`wialon/README.md`](wialon/README.md) | App Wialon: stack, fluxo, regras de negócio, rotas, estado do roadmap |
| [`wialon/alinhamento-dados.md`](wialon/alinhamento-dados.md) | Estratégia de dados de curto/longo prazo (com o estado real de cada item) |
| [`wialon/wialon-task-messages-mock.md`](wialon/wialon-task-messages-mock.md) | Guia/mock da API Wialon `messages/get_task_messages` |
| [`wialon/centro-operacoes-infracoes.docx`](wialon/centro-operacoes-infracoes.docx) | Especificação de UX do Centro de Operações de Infrações (documento Word, **não revisado** nesta reorganização) |
| [`detran/README.md`](detran/README.md) | App DETRAN-CE: stack, fluxo do scraper, regras de negócio, rotas, tabelas, estado do roadmap |
| [`legado/`](legado/) | Material anterior à reorganização (HTML da especificação antiga e paleta de cores). **Não é fonte de verdade**: a especificação antiga descreve Electron/webhook, que não existem no código |

Regra do repositório: documento que descreve comportamento deve refletir o código. Ao mudar uma rota, tabela ou regra, atualize o README do app correspondente no mesmo commit.
