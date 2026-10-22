# Documento de implementação — Re-download diário e limpeza de multas DETRAN

## 1. Ordem de execução

### Etapa 1 — Schema
Adicionar a coluna `baixado_em TEXT` na tabela `infracoes_detran_multas`. Ambiente de desenvolvimento, então pode recriar a tabela se preferir, sem migration formal.

### Etapa 2 — Types
Renomear `DadosConsultaDetran.aitJaBaixados` → `aitBaixadosHoje` e adicionar `confirmacaoLimpa?: boolean` em `ResultadoConsultaDetran`.

### Etapa 3 — Repository
Ajustar `buscarChavesJaBaixadas` (filtro por hoje), atualizar `salvarMultas` (gravar `baixado_em`) e criar `removerMultasDaConsulta`.

### Etapa 4 — Scraper
Renomear o parâmetro `aitJaBaixados` → `aitBaixadosHoje`, descolapsar `detectarMultas` e propagar `confirmacaoLimpa` apenas nos retornos do caminho feliz.

### Etapa 5 — Orquestrador
Aplicar limpeza automática somente quando `sucesso && QUITADO && confirmacaoLimpa`. Apagar multas locais + PDFs do disco. Atualizar status sempre conforme o resultado.

### Etapa 6 — API + UI
Criar o endpoint `DELETE /detran/consultas/:id/multas` e o botão "Apagar multas" na tela, com modal de confirmação explícito.

### Etapa 7 — Validação final
Rodar uma consulta completa, verificar re-download no dia seguinte, simular `QUITADO` confirmado e testar a limpeza manual.

---

## 2. Objetivo

1. **Re-baixar boletos quando a data de download não for de hoje**, garantindo que o operador nunca pague um boleto com vencimento desatualizado.
2. **Limpar automaticamente** as multas locais e PDFs quando o DETRAN confirmar, de forma segura, que o veículo não tem mais débitos.
3. **Oferecer limpeza manual** como válvula de escape para quando o operador souber que quitou, mas o sistema não conseguiu confirmar sozinho.

---

## 3. Regras de negócio

### Re-download
- Uma multa só é pulada se foi baixada **no dia corrente** (dia do calendário local).
- Se o `baixado_em` for de dia anterior → re-baixa, sobrescreve o PDF e atualiza `baixado_em`.
- Se o re-download falhar, `erro_emissao` é preenchido e o `baixado_em` **antigo é mantido** (representa "última vez que consegui baixar").

### Limpeza automática
- Só acontece quando **as três condições** forem verdadeiras ao mesmo tempo:
  1. `sucesso: true`
  2. `statusConsulta === 'QUITADO'`
  3. `confirmacaoLimpa: true` (caminho feliz do scraper, sem timeout nem ambiguidade)
- Apaga **apenas** linhas de `infracoes_detran_multas` daquela consulta + os PDFs correspondentes.
- **Não** apaga a linha de `infracoes_detran` (mantém histórico de que o veículo foi consultado).
- Se o PDF não existir mais no disco, apenas loga e segue.

### Limpeza manual
- Endpoint sempre disponível, independente do status da consulta.
- Exige confirmação explícita do operador na UI.
- Mesmo escopo da automática: só `infracoes_detran_multas` + PDFs.

### Status da consulta
- DETRAN sem multas → `status_consulta = 'QUITADO'` (independente de limpar ou não).
- DETRAN com multas → `status_consulta = 'COM_DEBITO'`.

### Auditoria
- Apenas log. Sem rastreamento de quem apagou.

---

## 4. Mudanças por camada

### Etapa 1 — Schema
- Adicionar coluna `baixado_em TEXT` em `infracoes_detran_multas`.
- `NULL` = nunca baixado com sucesso (ou linha pré-migration).
- Preenchida com `CURRENT_TIMESTAMP` **somente** quando `caminho_pdf` é gravado com sucesso.
- Ambiente de desenvolvimento — pode recriar tabela se preferir, sem migration formal.

### Etapa 2 — Types
- `DadosConsultaDetran.aitJaBaixados` → renomear para `aitBaixadosHoje`.
- `ResultadoConsultaDetran` ganha `confirmacaoLimpa?: boolean`.
  - `true` **somente** no caminho feliz de "sem multas".
  - `undefined`/`false` em timeout, erro ou ambiguidade.

### Etapa 3 — Repository
- **Renomear** `buscarChavesJaBaixadas` → `buscarChavesBaixadasHoje`.
  - Filtrar por `baixado_em IS NOT NULL AND date(baixado_em) = date('now', 'localtime')`.
  - Linhas antigas sem `baixado_em` são ignoradas (serão re-baixadas uma vez).
- **`salvarMultas`**: gravar `baixado_em = CURRENT_TIMESTAMP` no INSERT/UPDATE quando `caminhoPdf` estiver presente. Não tocar em `baixado_em` quando só houver `erro_emissao`.
- **Novo `removerMultasDaConsulta(consultaId)`**:
  - Retorna `{ removidas: number; caminhos: string[] }`.
  - Busca os `caminho_pdf` **antes** de deletar.
  - Deleta apenas linhas de `infracoes_detran_multas` daquela consulta.
  - Roda em transação.
  - **Não** mexe em filesystem — devolve os caminhos pro orquestrador.

### Etapa 4 — Scraper (`consultarVeiculoDetran`)
- Renomear parâmetro `aitJaBaixados` → `aitBaixadosHoje` (lógica inalterada).
- **Descolapsar `detectarMultas`**: hoje `null` significa tanto "timeout" quanto "sem multas confirmado". Passa a retornar objeto com estado explícito, permitindo distinguir os dois casos.
- Propagar `confirmacaoLimpa: true` **apenas** nos retornos `QUITADO` que vêm do caminho feliz:
  - página de resultado do veículo apareceu e não há alerta de multas; **ou**
  - tabela de multas foi lida com sucesso e está vazia.
- **Não** setar `confirmacaoLimpa` em retornos de `catch`.

### Etapa 5 — Orquestrador
- Após `consultarVeiculoDetran`, aplicar limpeza automática **somente** se `sucesso && QUITADO && confirmacaoLimpa`.
- Chamar `removerMultasDaConsulta`, apagar os PDFs do disco (logar falhas, seguir em frente).
- Sempre atualizar `status_consulta` conforme o resultado (comportamento atual já cobre isso).

### Etapa 6 — API + UI (limpeza manual)
- **Endpoint**: `DELETE /detran/consultas/:id/multas`.
  - Chama `removerMultasDaConsulta` + apaga PDFs.
  - Retorna `{ removidas, caminhosApagados, caminhosFaltando }`.
- **UI**: botão "Apagar multas" na tela de detalhe/linha da consulta.
  - Modal de confirmação explícito com contagem de multas a apagar.
  - Botão só habilitado se `qtdMultas > 0`.

### Etapa 7 — Validação final
- Rodar consulta completa e conferir gravação de `baixado_em`.
- No dia seguinte, rodar de novo e conferir re-download.
- Simular retorno `QUITADO` confirmado e verificar limpeza automática.
- Testar limpeza manual em consulta `COM_DEBITO` e em consulta já quitada.

---

## 5. Casos de borda

| Caso | Comportamento |
|---|---|
| Multa baixada ontem, DETRAN ainda tem | Re-baixa, atualiza `baixado_em` e `caminho_pdf` |
| Multa baixada hoje | Pula |
| Multa baixada ontem, hoje DETRAN deu erro | `erro_emissao` preenchido, `baixado_em` mantido |
| DETRAN retorna `QUITADO` por timeout | `confirmacaoLimpa` ausente → **não** apaga |
| DETRAN retorna `QUITADO` confirmado | Apaga multas + PDFs automaticamente |
| PDF já não existe no disco na limpeza | Loga e segue |
| Linha antiga sem `baixado_em` | Re-baixa uma vez, depois normaliza |
| Limpeza manual em consulta `COM_DEBITO` | Permitida; modal avisa que multa ainda consta no DETRAN |

---

## 6. Decisões fechadas

- Re-download: dia do calendário local, não janela de 24h.
- `baixado_em` mantido quando re-download falha.
- Linhas antigas sem `baixado_em` são re-baixadas uma vez.
- Limpeza automática só com `sucesso && QUITADO && confirmacaoLimpa`.
- Limpeza apaga só `infracoes_detran_multas` + PDFs.
- Auditoria apenas em log.
- Proteção de arquivo: somente leitura (Nível 1) + banco como fonte da verdade (Nível 3).