

# Wialon API — Mock & Guia: `messages/get_task_messages`

Guia de consulta e payload de simulação para captura de notificações de infração por excesso de velocidade via tarefas (`Create task`).

---

## 1. Pré-requisitos & Permissões

Para executar a requisição na API da Wialon, certifique-se de cumprir os seguintes requisitos:

* **Sessão:** Unidade com `sid` (Session ID) válido e autenticado.
* **Permissões de Acesso:** 
  * Ver objeto e suas propriedades básicas nas unidades.
  * Requisitar relatórios e mensagens nas unidades.
* **Serviços:** O serviço **Tarefas (Tasks)** precisa estar habilitado na conta Wialon.

> **Nota:** Se os pré-requisitos não forem atendidos, a API retornará **Erro 7 (Acesso Negado)**.

---

## 2. Parâmetros da Requisição

* **Endpoint Base:** `https://hst-api.wialon.com/wialon/ajax.html`
* **Método HTTP:** `POST` / `GET`
* **Serviço (`svc`):** `messages/get_task_messages`

| Parâmetro | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `itemIds` | `Array<long>` | Sim | Lista de IDs das unidades monitoradas. |
| `timeFrom` | `uint` | Sim | Timestamp inicial em formato Unix UTC. |
| `timeTo` | `uint` | Sim | Timestamp final em formato Unix UTC (`timeTo` ≥ `timeFrom`). |
| `loadCount` | `uint` | Sim | Limite máximo de mensagens retornadas (Teto: `20000`). |

### Exemplo de Chamada cURL
```bash
curl -X GET "[https://hst-api.wialon.com/wialon/ajax.html?sid=SESSION_ID&svc=messages/get_task_messages&params=](https://hst-api.wialon.com/wialon/ajax.html?sid=SESSION_ID&svc=messages/get_task_messages&params=){\"itemIds\":[1546,1545],\"timeFrom\":1724347800,\"timeTo\":1724693399,\"loadCount\":10000}"

```

---

## 3. Mock da Resposta (Simulação de Excesso de Velocidade)

Utilize este JSON para alimentar seus testes unitários ou integrar no mock local:

```json
{
  "count": 1,
  "messages": [
    {
      "item_id": 1546,
      "t": 1724420460,
      "f": 1536,
      "tp": "task",
      "rt": 1724420493,
      "p": {
        "task_sub_type": 21,
        "task_reg_type": 1,
        "task_evt_name": "Excesso de Velocidade",
        "task_id": "b1978b93a308c5c3be0697223bf0c5002ee87de02ce7937b23a34830516c330466c8916c",
        "task_update_time": 1724420460,
        "task_status": 6,
        "task_priority": 2,
        "task_assignee": 0,
        "task_description": "Veículo excedeu o limite máximo de velocidade permitido na via.",
        "task_tags": "{\"SPEED\":\"95 km/h\",\"MAX_SPEED\":\"80 km/h\",\"POS_TIME\":\"10.07.2025 15:52:28\",\"UNIT\":\"ABC-1234 - Volvo FH\"}",
        "task_comments": "[]",
        "task_account": 1063,
        "task_address_x": -3.7431,
        "task_address_y": -38.5178,
        "task_done_rejected": 1752152438,
        "task_params": {}
      }
    }
  ]
}

```

---

## 4. Mapeamento de Campos Principais (`p`)

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `item_id` | `Number` | ID da unidade referente à infração. |
| `task_id` | `String` | Hash único de 72 caracteres. Usado para atualizar o status via `unit/update_task`. |
| `task_evt_name` | `String` | Nome da regra/notificação geradora (campo principal para filtro). |
| `task_description` | `String` | Descrição configurada no alerta do Wialon. |
| `task_status` | `Number` | `1`=New, `2`=To do, `3`=In progress, `4`=Paused, `5`=Rejected, `6`=Done. |
| `task_priority` | `Number` | `1`=Low, `2`=Medium, `3`=High. |
| `task_sub_type` | `Number` | Tipo de condição disparada (`11`=Geofence, `13`=Sensor, `21`=Speeding, `32`=Combinação). |
| `task_tags` | `String (JSON)` | Contém as variáveis dinâmicas capturadas (Velocidade, Limite, Placa, Data/Hora). |
| `task_address_x / y` | `Number` | Coordenadas Geográficas (Latitude e Longitude) da ocorrência. |

---

## 5. Exemplo de Filtragem e Parsing em JavaScript (Node.js)

Como o método não possui filtro nativo no payload da requisição, processe os dados no backend:

```javascript
// 1. Requisição à API da Wialon
const response = await fetch(
  "[https://hst-api.wialon.com/wialon/ajax.html](https://hst-api.wialon.com/wialon/ajax.html)?" +
  new URLSearchParams({
    svc: "messages/get_task_messages",
    params: JSON.stringify({
      itemIds: [1546, 1545],
      timeFrom: 1724347800,
      timeTo: 1724693399,
      loadCount: 10000
    }),
    sid: "SESSION_ID"
  })
);

const data = await response.json();

// 2. Filtrar apenas eventos de excesso de velocidade
const infraçoesVelocidade = data.messages.filter(
  msg => msg.p?.task_evt_name === "Excesso de Velocidade"
);

// 3. Extrair as variáveis contidas em task_tags
infraçoesVelocidade.forEach(msg => {
  const tags = JSON.parse(msg.p.task_tags || "{}");
  
  console.log(`Veículo: ${tags.UNIT}`);
  console.log(`Velocidade Registrada: ${tags.SPEED}`);
  console.log(`Limite Permitido: ${tags.MAX_SPEED}`);
});

```

---

## 6. Tabela de Códigos de Erro da API

| Código | Descrição | Solução |
| --- | --- | --- |
| **4** | Parâmetros Inválidos | Verifique se `timeFrom` ≤ `timeTo` ou se há campos obrigatórios ausentes. |
| **5** | Erro de Execução | Falha interna no servidor Wialon ao processar a busca. |
| **7** | Acesso Negado | Valide se o `sid` expirou ou se faltam permissões no usuário. |
| **1004** | Limite Excedido | O valor de `loadCount` passou do teto permitido de 20.000 mensagens. |

```

```