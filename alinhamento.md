# Alinhamento de Arquitetura: Gestão de Dados (Curto vs. Longo Prazo)

Este documento define a estratégia de persistência, retenção e exibição de dados para o sistema de monitoramento de infrações e emissão de ofícios, visando alta performance, economia de espaço no SQLite e uma experiência de usuário (UX) fluida.

---

## 1. Visão Geral da Estratégia

Para evitar o inchaço desnecessário do banco de dados e a poluição da interface, dividiremos o ciclo de vida dos dados em duas camadas:
1. **Curto Prazo (Operacional / Fila de Trabalho)**
2. **Longo Prazo (Auditoria / Histórico Definitivo)**

---

## 2. Camada de Curto Prazo (Operacional)
Focada no que exige atenção imediata do operador (RH / Gestor de Frotas).

* **O que armazena:** 
  * Infrações recentes que aguardam revisão ou geração de ofício.
  * Registros consolidados do dia baseados na lógica de **pico de velocidade** (se um veículo ultrapassar o limite várias vezes no mesmo dia, o sistema valida se já existe registro para a data/placa: se sim, atualiza para o maior pico; se não, cria um novo).
  * Itens com status de erro de processamento que precisam de reenvio.
* **Comportamento na UI (Dashboard Principal):**
  * Exibe os registros de forma **agrupada por dia e veículo** (cada linha representa o pior excesso de velocidade daquele veículo em um determinado dia), evitando poluição visual com dezenas de eventos brutos disparados pelo rastreador.
  * Foco em ações rápidas: "Gerar PDF", "Enviar E-mail" ou "Descartar".
  * Janela de exibição focada nas pendências recentes (últimos 7 a 14 dias).
* **Política de Retenção:** 
  * **Registros brutos, descartados ou de menor gravidade:** Retenção máxima de **7 a 14 dias** para garantir que o banco SQLite continue extremamente leve e rápido.
  * **Registros com Erro:** Retenção de até **30 dias** para permitir que o gestor consiga auditar e reenviar falhas pontuais ocorridas no mês corrente.

---

## 3. Camada de Longo Prazo (Histórico e Auditoria)
Focada na segurança jurídica, resguardo trabalhista e relatórios gerenciais da empresa.

* **O que armazena:** 
  * Apenas os **Ofícios Oficiais** gerados (`status = 'GERADO'` ou `'ENVIADO'`).
  * Caminho para os arquivos PDF armazenados em disco (`pdf_path`).
* **Comportamento na UI (Aba de Histórico / Relatórios):**
  * Tela dedicada e separada do painel principal.
  * Listagem paginada (evitando sobrecarga de renderização no front-end).
  * Filtros avançados por período, placa do veículo, condutor e status de envio.
* **Política de Retenção:** 
  * Retenção permanente ou arquivamento anual, servindo como histórico imutável das sanções aplicadas.

---

## 4. Ajustes no Banco de Dados (SQLite)

### Atualização da Tabela `infracoes`
O campo `status` deve contemplar todo o ciclo de vida operacional e de auditoria:
* `REGISTRADO` / `PENDENTE`: Aguardando ação.
* `GERADO`: Ofício em PDF criado com sucesso.
* `ENVIADO`: E-mail disparado para o condutor/RH.
* `IGNORADO_MENOR_GRAVIDADE`: Evento descartado pela regra de consolidação de pico diário.
* `ERRO`: Falha na geração/envio que requer intervenção.

### Rotina de Limpeza Automática (Housekeeping)
Implementar uma tarefa que roda na inicialização do servidor (ou via rotina agendada) para purgar registros de ruído/descartados antigos e erros expirados:
```sql
-- Limpa descartados e eventos de menor gravidade após 14 dias
DELETE FROM infracoes 
WHERE status = 'IGNORADO_MENOR_GRAVIDADE' 
  AND created_at < datetime('now', '-14 days');

-- Limpa erros de processamento após 30 dias
DELETE FROM infracoes 
WHERE status = 'ERRO' 
  AND created_at < datetime('now', '-30 days');