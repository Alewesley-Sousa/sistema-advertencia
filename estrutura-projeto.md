### Estrutura do Projeto

```text
gerador-oficios-wialon/
├── src/
│   ├── main/                    # Processo Principal / Backend (Node.js)
│   │   ├── config/              # Variáveis de ambiente e constantes
│   │   ├── database/            # Conexão, migrations e repositórios SQLite
│   │   ├── http/                # Express: rotas, controllers e webhooks Wialon
│   │   ├── services/            # Lógica de negócio (consulta API Wialon, geração de PDF)
│   │   ├── templates/           # Layouts HTML/Tailwind para geração do PDF
│   │   └── index.ts             # Ponto de entrada do backend/processo principal
│   │
│   ├── renderer/                # Processo Visual / Frontend (React + TS)
│   │   ├── components/          # Tabela de infrações, modais e cards do dashboard
│   │   ├── pages/               # Histórico, Configurações, Dashboard
│   │   ├── services/            # Cliente HTTP para comunicação com o backend local
│   │   ├── App.tsx              # Componente raiz React
│   │   └── main.tsx             # Ponto de entrada do frontend
│   │
│   └── shared/                  # Tipos TypeScript compartilhados (Interfaces de Infrações, DTOs)
│
├── storage/                     # Armazenamento local runtime
│   ├── database.sqlite          # Arquivo do banco de dados SQLite
│   └── pdfs/                    # Pasta destino onde os arquivos .pdf gerados são salvos
│
├── package.json
└── tsconfig.json
