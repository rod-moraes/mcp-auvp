# AUVP Finanças — MCP

Módulo MCP para a API REST do [AUVP Finanças](https://financas.auvp.com.br/).

| Item | Valor |
|------|-------|
| **API** | `https://financas-api.auvp.com.br` |
| **Frontend (SPA)** | `https://financas.auvp.com.br` |
| **Auth** | `Authorization: Bearer <token>` |
| **Token em disco** | `~/.auvp-financas/access-token` |
| **Contrato JSON** | `{ status, message, data }` |

Renove a sessão com `auvp_ensure_auth` (tool transversal do MCP). Detalhes de login e variáveis de ambiente estão no [README principal](../../README.md).

---

## Estrutura do módulo

| Arquivo | Função |
|---------|--------|
| `catalog.ts` | Catálogo de rotas API e páginas SPA observadas |
| `tools.ts` | Definições das tools `auvp_financas_*` |
| `scan-tools.ts` | Varredura ao vivo das tools (leitura + ciclo de escrita com marker `MCP_SCAN`) |

Schemas Zod/JSON compartilhados: `src/mcp/schemas/`.

---

## Tools MCP

Prefixo: `auvp_financas_`. Liste tudo em runtime com `auvp_financas_list_observed_routes`.

### Catálogo e perfil

| Tool | Endpoint |
|------|----------|
| `list_observed_routes` | — (retorna catálogo local) |
| `get_profile` | `GET /users/profile` |
| `get_user` | `GET /users` *(403 em alguns planos)* |

### Contas

| Tool | Endpoint |
|------|----------|
| `list_accounts` | `GET /accounts` |
| `list_account_last_transactions` | `GET /accounts/lastTransactions` |
| `get_account` | `GET /accounts/:accountId` |
| `create_manual_account` | `POST /accounts/manual` |
| `update_account` | `PATCH /accounts/:accountId` |
| `delete_account` | `DELETE /accounts/:accountId` |
| `get_account_bills` | `GET /bills/account/:accountId` *(404 se não for cartão)* |
| `list_banks` | `GET /banks` |
| `create_pluggy_connect_token` | `POST /pluggy/connect-token` |

### Transações

| Tool | Endpoint |
|------|----------|
| `list_transactions` | `GET /transactions` |
| `export_transactions` | `GET /transactions/export` |
| `get_transaction` | `GET /transactions/:transactionId` |
| `create_manual_transaction` | `POST /transactions/manual` |
| `update_transaction` | `PATCH /transactions/:transactionId` |
| `delete_transaction` | `DELETE /transactions/:transactionId` |

Filtros de `list_transactions` / `export_transactions`: `page`, `limit`, `referenceMonth` (YYYY-MM), `sortBy`, `sortOrder`, `status`, `type`, `accountIds`.

`update_transaction` aceita `tagIds: [1, 2]` ou `body` parcial.

Transação manual: use `accountId` (número), `date` em `dd-MM-yyyy HH:mm`, `type` `DEBIT`/`CREDIT`.

### Dashboard e orçamento

| Tool | Endpoint |
|------|----------|
| `get_dashboard` | `GET /dashboard` — query `date` em **MM-YYYY** |
| `get_cashflow` | `GET /dashboard/cashflow` — `startDate`/`endDate` em **DD/MM/YYYY** |
| `list_budgets` | `GET /budgets` |
| `get_monthly_budget` | `GET /budgets/monthly` — `date` em **MM-YYYY** |
| `get_budgets_summary` | `GET /budgets/summary` *(403 em alguns planos)* |
| `create_budget` | `POST /budgets` |
| `update_budget` | `PATCH /budgets/:budgetId` |

### Categorias e tags

| Tool | Endpoint |
|------|----------|
| `list_categories` | `GET /categories` (catálogo Pluggy) |
| `get_categories_tree` | `GET /categories/tree` *(403 em alguns planos)* |
| `create_category` | `POST /categories` *(admin; pode 403/500)* |
| `delete_category` | `DELETE /categories/:categoryId` |
| `list_tags` | `GET /tags` |
| `create_tag` | `POST /tags` |
| `update_tag` | `PATCH /tags/:tagId` |
| `delete_tag` | `DELETE /tags/:tagId` |

---

## Rotas no catálogo sem tool dedicada

Documentadas em `catalog.ts` para descoberta e SSO; não expostas como tools de escrita:

- `GET /auth/redirect-url` — fluxo SSO (tools `auvp_create_sso_login_url` / `auvp_complete_sso_login`)

---

## Páginas SPA (frontend)

Rotas em `FINANCAS_PAGE_ROUTES` — úteis para navegação e captura XHR, não são endpoints REST:

`/dashboard/home`, `/dashboard/transactions`, `/dashboard/budget`, `/dashboard/general-accounts`, `/dashboard/goals`, `/dashboard/invoices`, `/dashboard/tags`, `/settings/profile`, `/settings/categories`, `/settings/types`, `/pluggy/auth`

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
2. Tool em `tools.ts` + schema em `src/mcp/schemas/`
3. Probe em `scan-tools.ts` (se leitura)
4. `npm run scan:financas && npm test`

---

## Validação

```bash
npm run scan:financas   # relatório em data/financas-tools-report.json
npm test
```

O scan de escrita cria conta/tag/transação com prefixo `MCP_SCAN` e remove ao final. Erros 403/404 em rotas com restrição de plano são marcados como *esperados*.

---

## Referência rápida de formatos

| Campo | Formato |
|-------|---------|
| Dashboard / orçamento mensal | `MM-YYYY` (ex.: `06-2026`) |
| `referenceMonth` (transações) | `YYYY-MM` (ex.: `2026-06`) |
| Fluxo de caixa | `DD/MM/YYYY` |
| Transação manual `date` | `dd-MM-yyyy HH:mm` |
| Cor de tag | `#RRGGBB` |

---

*Catálogo validado por probe HTTP + bundles JS em jun/2026.*
