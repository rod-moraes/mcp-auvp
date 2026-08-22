# AUVP Finanças — MCP

Módulo MCP para a API REST do [AUVP Finanças](https://financas.auvp.com.br/) — contas, transações, dashboard, orçamento, categorias, tags e conexão bancária via Pluggy.

| Item               | Valor                              |
| ------------------ | ---------------------------------- |
| **API**            | `https://financas-api.auvp.com.br` |
| **Frontend (SPA)** | `https://financas.auvp.com.br`     |
| **Auth**           | `Authorization: Bearer <token>`    |
| **Token em disco** | `~/.auvp-financas/access-token`    |
| **Contrato JSON**  | `{ status, message, data }`        |
| **Tools**          | **36** (leitura + escrita)         |

Renove a sessão com `auvp_ensure_auth` (tool transversal do MCP). Detalhes de login e variáveis de ambiente no [README principal](../../README.md).

---

## Estrutura do módulo

| Arquivo         | Função                                                                         |
| --------------- | ------------------------------------------------------------------------------ |
| `catalog.ts`    | Catálogo de rotas API e páginas SPA observadas                                 |
| `tools.ts`      | Definições das 36 tools `auvp_financas_*`                                      |
| `scan-tools.ts` | Varredura ao vivo das tools (leitura + ciclo de escrita com marker `MCP_SCAN`) |

Schemas Zod/JSON compartilhados: `src/mcp/schemas/`.

---

## Tools MCP

Prefixo: `auvp_financas_` (omitido nas tabelas). Liste tudo em runtime com `auvp_financas_list_observed_routes`.
✏️ = escreve dados · 🔥 = irreversível.

### Catálogo, plano e perfil

| Tool                   | Endpoint                | Parâmetros / notas                                             |
| ---------------------- | ----------------------- | -------------------------------------------------------------- |
| `list_observed_routes` | —                       | Catálogo local (rotas API, páginas SPA e operações de escrita) |
| `get_access_status`    | `GET /access/status`    | Acesso e plano do usuário atual                                |
| `get_feature_flags`    | `GET /feature-flags/me` | Feature flags habilitadas                                      |
| `get_profile`          | `GET /users/profile`    | Perfil do usuário logado                                       |
| `get_user`             | `GET /users`            | _403 em planos sem permissão_                                  |

### Contas, bancos e faturas

| Tool                             | Endpoint                         | Parâmetros / notas                                                         |
| -------------------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `list_accounts`                  | `GET /accounts`                  | Contas + `accountsSummary` agregado                                        |
| `list_hidden_accounts`           | `GET /accounts/hidden`           | Contas ocultas                                                             |
| `list_account_last_transactions` | `GET /accounts/lastTransactions` | Últimas transações por conta                                               |
| `get_account`                    | `GET /accounts/:accountId`       | `accountId` (string)                                                       |
| ✏️ `create_manual_account`       | `POST /accounts/manual`          | `name`, `type`, `subtype`, `number`, `balance`, `bankCode?`, `creditData?` |
| ✏️ `update_account`              | `PATCH /accounts/:accountId`     | `accountId`, `body` (parcial)                                              |
| 🔥 `delete_account`              | `DELETE /accounts/:accountId`    | `accountId`                                                                |
| `get_account_bills`              | `GET /bills/account/:accountId`  | _404 se a conta não for cartão ou não houver faturas sincronizadas_        |
| `list_banks`                     | `GET /banks`                     | Bancos e conectores Pluggy                                                 |
| ✏️ `create_pluggy_connect_token` | `POST /pluggy/connect-token`     | `body?` — token para conectar banco (201)                                  |

**`create_manual_account`** — `type`: `BANK` ou `CREDIT`. `subtype`: `CHECKING_ACCOUNT`/`SAVINGS_ACCOUNT` (BANK) ou `CREDIT_CARD` (CREDIT). `balance` é **número**, não string. `creditData.brand` informa a bandeira do cartão.

### Transações

| Tool                           | Endpoint                              | Parâmetros / notas                                                                               |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `list_transactions`            | `GET /transactions`                   | `page`, `limit` (≤1000), `referenceMonth`, `sortBy`, `sortOrder`, `status`, `type`, `accountIds` |
| `export_transactions`          | `GET /transactions/export`            | Mesmos filtros; _400 se faltar filtro obrigatório_                                               |
| `get_transaction`              | `GET /transactions/:transactionId`    | `transactionId`                                                                                  |
| ✏️ `create_manual_transaction` | `POST /transactions/manual`           | `accountId`, `amount`, `type`, `description`, `date` + opcionais                                 |
| ✏️ `update_transaction`        | `PATCH /transactions/:transactionId`  | `transactionId` + `tagIds: [1,2]` **ou** `body` parcial                                          |
| 🔥 `delete_transaction`        | `DELETE /transactions/:transactionId` | `transactionId`                                                                                  |

**`create_manual_transaction`** — use `accountId` (**não** `user_account_id`), `date` em `dd-MM-yyyy HH:mm`, `type` `DEBIT`/`CREDIT`. Opcionais: `budgetId`, `categoryId`, `userCategoryId`, `referenceMonth` (ISO), `tagIds[]`, `ignore`, `observations`, `isRecurrent`, `recurrenceInDays`.

### Dashboard e orçamento

| Tool                  | Endpoint                   | Parâmetros / notas                                       |
| --------------------- | -------------------------- | -------------------------------------------------------- |
| `get_dashboard`       | `GET /dashboard`           | `date` em **MM-YYYY**                                    |
| `get_cashflow`        | `GET /dashboard/cashflow`  | `startDate` + `endDate` em **DD/MM/YYYY** (obrigatórios) |
| `list_budgets`        | `GET /budgets`             | Metas e categorias de orçamento                          |
| `get_monthly_budget`  | `GET /budgets/monthly`     | `date` em **MM-YYYY** (obrigatório)                      |
| `get_budgets_summary` | `GET /budgets/summary`     | _403 em planos sem permissão_                            |
| ✏️ `create_budget`    | `POST /budgets`            | `body` conforme o frontend                               |
| ✏️ `update_budget`    | `PATCH /budgets/:budgetId` | `budgetId`, `body`                                       |

### Categorias e tags

| Tool                  | Endpoint                         | Parâmetros / notas                             |
| --------------------- | -------------------------------- | ---------------------------------------------- |
| `list_categories`     | `GET /categories`                | Catálogo Pluggy                                |
| `get_categories_tree` | `GET /categories/tree`           | _403 em planos sem permissão_                  |
| ✏️ `create_category`  | `POST /categories`               | `description` — administrativo; _pode 403/500_ |
| 🔥 `delete_category`  | `DELETE /categories/:categoryId` | `categoryId`                                   |
| `list_tags`           | `GET /tags`                      | Tags de transação                              |
| ✏️ `create_tag`       | `POST /tags`                     | `name`, `color` (`#RRGGBB`)                    |
| ✏️ `update_tag`       | `PATCH /tags/:tagId`             | `tagId`, `body`                                |
| 🔥 `delete_tag`       | `DELETE /tags/:tagId`            | `tagId`                                        |

---

## Rotas no catálogo sem tool dedicada

Documentadas em `catalog.ts` para descoberta e SSO; não expostas como tools:

| Rota                                         | Nota                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `GET /auth/redirect-url`                     | Fluxo SSO — use `auvp_create_sso_login_url` / `auvp_complete_sso_login` |
| `GET /bills`                                 | Prefixo de faturas; detalhe validado em `/bills/account/:accountId`     |
| `POST /bills/admin/sync-all-users`           | Sincronização administrativa observada no bundle                        |
| `POST /transactions/admin/resync-currencies` | Reprocessamento administrativo de moedas                                |

---

## Páginas SPA (frontend)

Rotas em `FINANCAS_PAGE_ROUTES` — úteis para navegação e captura XHR, não são endpoints REST:

`/dashboard/home`, `/dashboard/transactions`, `/dashboard/transactions/edit`, `/dashboard/budget`, `/dashboard/general-accounts`, `/dashboard/goals`, `/dashboard/invoices`, `/dashboard/tags`, `/settings/profile`, `/pluggy/auth`, `/sign-in`

---

## Descoberta de novas rotas

Skill e scripts do repositório: [auvp-scrapling](../../.cursor/skills/auvp-scrapling/SKILL.md).

```bash
source .venv-scrapling/bin/activate

# Varredura completa: probe REST + bundles JS + XHR nas páginas SPA
python scripts/discover_endpoints.py financas-all

# Uma página
python scripts/discover_endpoints.py financas --path /dashboard/transactions

# Probe pontual
python scripts/discover_endpoints.py probe --site financas_api --path /categories
```

Relatórios em `data/endpoint-discovery/`. O método mais confiável é **probe REST com bearer**; o XHR via browser exige sessão logada no SPA (bearer em memória).

Fluxo para adicionar rota:

1. Entrada em `catalog.ts`
2. Tool em `tools.ts` + schema em `src/mcp/schemas/` (JSON Schema **e** Zod)
3. Probe em `scan-tools.ts` (se leitura)
4. `npm run scan:financas && npm test`

---

## Validação

```bash
npm run scan:financas   # relatório em data/financas-tools-report.json
npm test
```

O scan é somente leitura por padrão. Com `AUVP_SCAN_ALLOW_WRITES=1` ele cria conta/tag/transação com prefixo `MCP_SCAN` e remove ao final. Erros 403/404 em rotas com restrição de plano são marcados como _esperados_.

---

## Referência rápida de formatos

| Campo                                  | Formato            | Exemplo            |
| -------------------------------------- | ------------------ | ------------------ |
| Dashboard / orçamento mensal (`date`)  | `MM-YYYY`          | `06-2026`          |
| `referenceMonth` (transações)          | `YYYY-MM`          | `2026-06`          |
| Fluxo de caixa (`startDate`/`endDate`) | `DD/MM/YYYY`       | `01/06/2026`       |
| Transação manual (`date`)              | `dd-MM-yyyy HH:mm` | `15-06-2026 14:30` |
| Cor de tag                             | `#RRGGBB`          | `#ff00ff`          |

---

_Catálogo validado por probe HTTP + bundles JS em jun/2026._
