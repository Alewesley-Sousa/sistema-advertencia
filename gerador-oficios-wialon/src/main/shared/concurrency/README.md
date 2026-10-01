# Concurrency

Controle de tarefas simultâneas.

Uso esperado:
- lotes do DETRAN;
- sincronização Wialon;
- chamadas externas independentes;
- processamento de arquivos.

Não usar concorrência ilimitada.

O limite deve ser definido de acordo com:
- capacidade do servidor;
- memória;
- quantidade de contextos/abas;
- limites da API externa.
