# AUVP Carteira / Diagrama do Cerrado — MCP

Módulo MCP para a ferramenta [Carteira / Diagrama do Cerrado](https://ferramentas.auvp.com.br/carteira) — ativos da carteira, notas do diagrama, metas percentuais, cálculo de aporte e mapa de ratings por país.

| Item                | Valor                                                       |
| ------------------- | ----------------------------------------------------------- |
| **API**             | `https://ferramentas-backend.auvp.com.br`                   |
| **Frontend**        | `https://ferramentas.auvp.com.br/carteira`                  |
| **Auth**            | `Authorization: Bearer <token>` (token próprio da Carteira) |
| **Token em disco**  | `~/.auvp-financas/carteira-token`                           |
| **Origem do token** | `localStorage["auvp-web@token"]`, capturado no login        |
| **Tools**           | **22** (10 leitura/cálculo + 12 escrita)                    |

---

## Autenticação

`auvp_ensure_auth` visita a Carteira com o perfil persistente do navegador e salva **apenas o bearer da aplicação** em `~/.auvp-financas/carteira-token`. O token é reutilizado entre chats; o navegador visível só abre depois de falhar a validação (`GET /auth/me`) e a renovação silenciosa. Detalhes no [README principal](../../README.md).

Duas rotas são públicas e funcionam sem token: `GET /config` e `GET /assets/sugestions` (além do CSV do mapa).

---

## Estrutura do módulo

| Arquivo         | Função                                                                   |
| --------------- | ------------------------------------------------------------------------ |
| `catalog.ts`    | Catálogo das rotas observadas (com marcação de escrita e rotas públicas) |
| `tools.ts`      | Definições das 22 tools `auvp_carteira_*`                                |
| `schemas.ts`    | Schemas Zod + JSON Schema específicos do módulo                          |
| `auth.ts`       | Persistência do token da Carteira                                        |
| `map.ts`        | Parser do CSV de países, índices, ratings, ETFs e empresas               |
| `scan-tools.ts` | Varredura ao vivo (somente leitura por padrão)                           |

---

## Tools MCP

Prefixo: `auvp_carteira_` (omitido nas tabelas). Liste tudo em runtime com `auvp_carteira_list_observed_routes`.
✏️ = escreve dados · 🔥 = irreversível. As tools mutáveis começam com **ESCRITA** na própria descrição MCP.

### Leitura

| Tool                       | Endpoint                                      | Parâmetros / notas                                                                                                                          |
| -------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_observed_routes`     | —                                             | Catálogo local (API base, frontend e rotas)                                                                                                 |
| `get_portfolio`            | `GET /auth/me`                                | Ativos, metas, perguntas e preferências — resposta **sanitizada**, sem dados pessoais do perfil                                             |
| `list_assets`              | `GET /auth/me`                                | Só o array de ativos                                                                                                                        |
| `get_investment_goals`     | `GET /auth/me`                                | Metas percentuais por classe de ativo                                                                                                       |
| `list_questions`           | `GET /auth/me`                                | Perguntas configuradas para pontuar ativos                                                                                                  |
| `get_classification`       | `GET /users/classification`                   | Classificação do perfil de investimento                                                                                                     |
| `get_config`               | `GET /config`                                 | Config pública, incluindo a cotação do dólar usada nos cálculos                                                                             |
| `search_asset_suggestions` | `GET /assets/sugestions`                      | `type` (obrigatório), `search` — ativos disponíveis para adicionar                                                                          |
| `search_country_ratings`   | CSV `/dados/paises_dados_completos_final.csv` | `query`, `limit` (≤200) — país, nome internacional, índice principal, ETFs americanos, ratings S&P/Moody's/Fitch, nível de risco e empresas |

### Cálculo

| Tool                     | Endpoint                  | Parâmetros / notas                                                                                                   |
| ------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `calculate_contribution` | `POST /users/suggestions` | `value` (> 0) — distribuição sugerida do aporte. **Atenção:** o serviço AUVP pode registrar o último valor calculado |

### Escrita — ativos

| Tool                      | Endpoint                                  | Parâmetros / notas                                                                                                                        |
| ------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| ✏️ `create_asset`         | `POST /users/assets`                      | `asset`: `type` + `name` (obrigatórios), `alocation?`, `value?`, `amount?`, `strength?` (0–10), `useForcedStrength?`, `diagramResponses?` |
| ✏️ `update_asset`         | `PATCH /users/assets/:assetId`            | `assetId`, `changes` (ao menos um campo do ativo)                                                                                         |
| 🔥 `delete_asset`         | `DELETE /users/assets/:assetId`           | `assetId`                                                                                                                                 |
| ✏️ `record_contribution`  | `PATCH /users/assets/:assetId/input`      | `assetId`, `value` (> 0) — registra aporte                                                                                                |
| ✏️ `record_sale`          | `PATCH /users/assets/:assetId/sell-input` | `assetId`, `value` (> 0) — registra venda                                                                                                 |
| ✏️ `update_asset_diagram` | `PATCH /users/assets/:assetId/diagram`    | `assetId`, `responses[]` (ids das perguntas respondidas), `strength` (nota)                                                               |

`type` aceito: `acoes_nacionais`, `acoes_internacionais`, `fundos_imobiliarios`, `reits`, `criptomoedas`, `rendafixa`, `rendafixa_internacional`.

`create_asset` e `update_asset` preenchem `updatedBy` automaticamente com o id do usuário obtido em `GET /auth/me`.

### Escrita — metas e perguntas do Diagrama

| Tool                           | Endpoint                                   | Parâmetros / notas                                                                            |
| ------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| ✏️ `update_investment_goals`   | `PATCH /users/:userId`                     | `goals[]` com `type` + `value` — **substitui** as metas; tipos únicos e soma exata de **100** |
| ✏️ `create_question`           | `POST /wallets/diagrams`                   | `question`, `criterias`, `diagram` (`diagrama-do-cerrado` \| `investimentos-imobiliarios`)    |
| ✏️ `update_question`           | `PATCH /wallets/diagrams/:questionId`      | `questionId` + os mesmos campos de `create_question`                                          |
| 🔥 `delete_question`           | `DELETE /wallets/diagrams/:questionId`     | `questionId`                                                                                  |
| ✏️ `apply_question_template`   | `PATCH /wallets/diagrams/autofill/:userId` | Sem parâmetros — aplica o modelo de perguntas ao usuário atual                                |
| ✏️ `restore_default_questions` | `POST /wallets/diagrams/:userId/restore`   | Sem parâmetros — restaura as perguntas padrão                                                 |

A validação de `goals` é feita **antes** da chamada: tipos duplicados ou soma diferente de 100 são recusados localmente.

---

## Rotas no catálogo sem tool dedicada

| Rota                                  | Nota                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| `GET /assets/:assetId/force-strength` | Nota mínima/forçada de um ativo (pública) — sem tool própria |

---

## Comportamentos conhecidos

| Tool / campo              | Observação                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `get_portfolio`           | Filtra a resposta de `/auth/me`: devolve só `assets`, `investmentGoals`, `questions` e `preferences` |
| `calculate_contribution`  | É `POST`: além de calcular, pode persistir o último valor no serviço                                 |
| `search_country_ratings`  | Lê e parseia um CSV público; sem token, mas a resposta pode ser grande — use `query`/`limit`         |
| `update_investment_goals` | Substitui todas as metas de uma vez; envie o conjunto completo                                       |

---

## Descoberta

```bash
.venv-scrapling/bin/python scripts/discover_endpoints.py carteira-all
```

Os relatórios registram apenas contratos, status e shapes; tokens e respostas do portfólio não são persistidos.

---

## Validação

```bash
npm run scan:carteira   # somente leitura: nenhuma tool de escrita é executada
npm test                # inclui test/carteiraTools.test.ts
```
