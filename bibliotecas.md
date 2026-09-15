| Pacote | Função Principal | Por que facilita o desenvolvimento? |
| --- | --- | --- |
| **express** | Servidor HTTP local | Facilita a criação imediata da rota (ex: `POST /webhook`) para receber os dados enviados pela Wialon. |
| **axios** | Cliente HTTP | Simplifica as chamadas secundárias à API REST do Wialon para buscar dados do condutor e veículo. |
| **better-sqlite3** | Banco de dados | É síncrono, extremamente rápido e não precisa de configuração de servidor SQL (opera diretamente no arquivo `.sqlite`). |
| **zod** | Validação de schemas | Valida o payload recebido do Webhook e os formulários no backend, garantindo que campos nulos/inválidos não quebrem o app. |
| **handlebars** | Renderização de templates | Permite injetar as variáveis da infração (placa, velocidade, data) dentro do HTML do Ofício de forma simples antes de converter para PDF. |
| **puppeteer-core** | Geração de PDF | Converte o HTML compilado pelo Handlebars em PDF. Usar a versão `-core` evita empacotar o executável do Chrome inteiro dentro do projeto. |
| **@tanstack/react-query** | Gerenciamento de estado/API | No React, lida com o *fetching*, *cache* e atualização automática da tabela de infrações sem precisar de lógica manual complexa. |
| **lucide-react** | Ícones da interface | Conjunto leve de ícones modernos para montar o Dashboard no React sem peso de imagens externas. |
| **electron-builder** *(ou `tauri`)* | Empacotamento Desktop | Compila toda a aplicação (Node.js + React + SQLite) em um instalador único ou executável portátil `.exe`. |
| **dotenv** | Configurações locais | Lê o arquivo `.env` para carregar tokens, portas e caminhos de pastas em ambiente de desenvolvimento. |