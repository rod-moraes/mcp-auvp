# AUVP Analítica — MCP

Módulo MCP para a plataforma [AUVP Analítica](https://analitica.auvp.com.br/) — análise fundamentalista de ações, FIIs, stocks US, rankings e ferramentas de comparação.

| Item | Valor |
|------|-------|
| **Base** | `https://analitica.auvp.com.br` |
| **Auth** | `Authorization: Bearer <token>` **+** cookie de sessão (`Cookie:`) |
| **Bearer em disco** | `~/.auvp-financas/access-token` |
| **Cookie em disco** | `~/.auvp-financas/analitica-cookie` |
| **Contrato JSON** | Respostas `/api/*` em JSON; rankings e páginas SPA em payload **RSC** (Next.js) |

Renove a sessão com `auvp_ensure_auth` (tool transversal do MCP). Detalhes de login e variáveis de ambiente estão no [README principal](../../README.md).

---

## Estrutura do módulo

| Arquivo | Função |
|---------|--------|
| `catalog.ts` | Catálogo de rotas API e páginas SPA observadas |
| `tools.ts` | Definições das 44 tools `auvp_analitica_*` |
| `scan-tools.ts` | Varredura ao vivo das tools (somente leitura) |
| `ranking.ts` | Fetch e parse de rankings paginados via RSC |
| `ranking-display.ts` | Formatação da tabela de ranking (colunas do site) |
| `ranking-types.ts` | Segmentos e tipos de ranking suportados |
| `cookies.ts` | Persistência do cookie de sessão do Analítica |

Schemas Zod/JSON compartilhados: `src/mcp/schemas/`.

---

## Tools MCP

Prefixo: `auvp_analitica_`. Liste tudo em runtime com `auvp_analitica_list_observed_routes`.

### Catálogo, sessão e conta

| Tool | Endpoint |
|------|----------|
| `list_observed_routes` | — (retorna catálogo local) |
| `get_session` | `GET /api/session` |
| `get_me` | `GET /api/auth/me` |
| `is_premium` | `GET /api/auth/is-premium` |
| `get_feature_flags` | `GET /api/feature-flags/user` |
| `get_live_video_status` | `GET /api/videos/in-live` |
| `get_onboard_start` | `GET /api/onboard/start` |
| `get_onboard` | `GET /api/onboard?scope=` |
| `list_subscriptions` | `GET /api/subscriptions` |
| `get_subscription_status` | `GET /api/subscriptions/status` |
| `list_notifications` | `GET /api/notifications` |
| `get_user` | `GET /api/users/:userId` |
| `get_last_answer_feedback` | `GET /api/users/:userId/meta/last-answer-feedback` |
| `get_credits` | `GET /api/credits` |
| `get_pay_wall` | `GET /api/pay-wall` |

`get_onboard` aceita `scope` como `rankings`, `asset_page`, etc.

### Visualizações e rankings

| Tool | Endpoint |
|------|----------|
| `list_views` | `GET /api/views` — query `limit` |
| `list_most_viewed` | `GET /api/views/most-viewed` — `companyType`, `limit` |
| `rank_codes_by_rating` | `GET /api/codes/ranked-by-rating` — `ratingType`, `limit`, `page`, `type` |
| `get_home_ranking` | `POST /api/bff?key=home-rankings` — preview (~3 itens) |
| `get_ranking` | `GET /rankings/{segment}/{rankingType}` — RSC paginado |

**`get_ranking`** — ranking completo com paginação:

- `segment`: `acoes` (BR) ou `stocks` (US)
- `rankingType`: ex. `dividend_yield`, `upside_graham`, `roe`, `p_l` (lista em `ranking-types.ts`)
- `page` (default 1), `limit` (default 50, máx. 100)
- `includeViabilidade`: busca selo de viabilidade (blue/green/yellow/red) por código
- `includeIndicators`: inclui indicadores extras por linha

Resposta estruturada com `ranking`, `pagination` e `data[]` (cotação, métrica do ranking, P/L, P/VP, ROE, ROA, médias de setor, etc.). Timeout dedicado de **3 minutos** (`ANALITICA_RANKING_REQUEST_TIMEOUT_MS`).

Para preview rápido na home, prefira `get_home_ranking`.

### Ativo — cotações e fundamentos

| Tool | Endpoint |
|------|----------|
| `get_code` | `GET /api/codes?code=` |
| `get_quotes` | `GET /api/quotes/:ticker` — query `period` (ex. `1y`, `1m`) |
| `get_balance` | `GET /api/balance` — `codes`, `indicators`, `period`, `from`, `to`, … |
| `get_dres` | `GET /api/dres` — `asset`, `dre`, `period`, `aggregate`, `is_fund` |
| `get_dividends` | `GET /api/dividends` — `code`, `period`, `aggregate` |
| `get_share_holders` | `GET /api/share-holders?ticker=` |
| `get_reviews` | `GET /api/reviews?code=` |
| `get_documents` | `GET /api/documents` — `code`, `from`, `to`, `page`, `type` |
| `get_alerts` | `GET /api/alerts?asset=` |
| `list_favorites` | `GET /api/favorites/list` |
| `get_assets_config` | `GET /api/assets-config` — `companyType`, `countryType` |
| `get_asset_tooltip` | `POST /api/bff?key=asset-image-tooltip` |

Filtros de `get_balance`: `codes` (ticker), `indicators` (ex. `ativo_total`), `frequency`, `formatted`, `dres`, `period`, `from`, `to`.

### Mercado, notícias e simuladores

| Tool | Endpoint |
|------|----------|
| `get_currency_quote` | `GET /api/currency-quote?currency=` (ex. `USD`) |
| `list_indices_quotes` | `GET /api/index/list-with-last-quote` |
| `list_rates` | `GET /api/rate/list-with-last-value` (CDI, Selic, IPCA, IGP-M) |
| `list_news` | `GET /api/news?asset=&page=` |
| `list_news_categories` | `GET /api/news/categories` |
| `list_videos` | `GET /api/videos?asset=&page=` |
| `get_rentability` | `GET /api/rentability/:ticker?period=` |
| `get_rentability_config` | `GET /api/rentability/config/:ticker` |
| `get_fii_summary` | `GET /api/fii-summary/:ticker` |

### Comparador e templates

| Tool | Endpoint |
|------|----------|
| `get_codes_dres` | `GET /api/codes/dres?from=&to=&key=` |
| `get_column_templates` | `GET /api/column-templates?type=` (ex. `balance-stock`) |

### Páginas SPA (RSC bruto)

| Tool | Endpoint |
|------|----------|
| `get_page_route` | `GET {path}?_rsc=` — HTML/payload RSC da rota |

Útil para engenharia reversa; respostas podem ser grandes (vários MB). Prefira as tools `/api/*` quando existirem.

---

## Rotas no catálogo sem tool dedicada

Documentadas em `catalog.ts` para descoberta; parâmetros ainda não mapeados:

| Rota | Nota |
|------|------|
| `GET /api/search?q=` | Probe com `q` simples retorna 400 |
| `GET /api/indicators` | Existe na API; params exatos a confirmar |
| `GET /api/segments` | Probe sem params retorna 400 |
| `GET /api/sectors` | Probe sem params retorna 400 |

---

## Páginas SPA (frontend)

Rotas em `ANALITICA_PAGE_ROUTES` — navegação e captura XHR, não são endpoints REST:

`/acoes`, `/acoes/:ticker`, `/fiis`, `/fiis/:ticker`, `/stocks`, `/stocks/:ticker`, `/etfs`, `/reits`, `/fiiagros`, `/indices`, `/rankings`, `/rankings/acoes/:rankingType`, `/rankings/stocks/:rankingType`, `/noticias`, `/calculadoras`, `/simulador-de-rentabilidade`, `/acoes/comparar`, `/acoes/busca-avancada`, `/acoes/agenda-de-dividendos`, `/agenda-de-resultados`, …

---

## Comportamentos conhecidos

| Tool / campo | Observação |
|--------------|------------|
| `get_documents` | Sem `from`/`to` costuma retornar `[]`; com intervalo de datas a resposta pode demorar |
| `get_dividends` | `period=1Y` pode retornar vazio; o site usa valores como `5Y` e `ANUAL` |
| `get_codes_dres` | Endpoint do comparador; pode exigir params adicionais além de `from`/`to`/`key` |
| `get_assets_config` | `companyType=BRA:stock` pode retornar `data: []` |
| `get_currency_quote` | Algumas moedas (ex. EUR) retornam `quote: null` |
| `get_balance` | Indicadores do ano corrente podem vir como `"---"` antes da divulgação |
| `get_ranking` | Resposta via RSC; latência variável (segundos a ~1 min na página 1) |
| `get_page_route` | Payload RSC/HTML grande; use com parcimônia |

---

## Descoberta de novas rotas

Skill e scripts do repositório: [auvp-scrapling](../../.cursor/skills/auvp-scrapling/SKILL.md).

```bash
source .venv-scrapling/bin/activate

# Varredura completa: XHR em ~25 páginas SPA + probe REST + scan JS
python scripts/discover_endpoints.py analitica-all

# Uma página
python scripts/discover_endpoints.py analitica --path /acoes/BBAS3

# Probe pontual
python scripts/discover_endpoints.py probe --site analitica --path /api/credits
```

Relatórios em `data/endpoint-discovery/`. O XHR via browser exige sessão logada (cookie + bearer).

Fluxo para adicionar rota:

1. Entrada em `catalog.ts`
2. Tool em `tools.ts` + schema em `src/mcp/schemas/`
3. Probe em `scan-tools.ts` (se leitura)
4. Caso de auditoria em `scripts/audit-analitica-tools.ts` (opcional)
5. `npm run scan:analitica && npm run audit:analitica && npm test`

---

## Validação

```bash
npm run scan:analitica    # relatório em data/analitica-tools-report.json (44 tools)
npm run audit:analitica   # relatório em data/analitica-tools-audit.json (shape + filtros)
npm test
```

Requer bearer token e cookie do Analítica (`auvp_ensure_auth`). O scan e a auditoria usam `BBAS3` como ticker de exemplo e `limit=20` nos probes de listagem.

---

## Referência rápida

### Tipos de ranking (`ranking-types.ts`)

`upside_graham`, `upside_bazin`, `dividend_yield`, `valor_mercado`, `receita_liquida`, `lucro_liquido`, `caixa`, `roe`, `margem_liquida`, `p_l`, `cagr_receita_5_anos`, `cagr_lucro_liquido_5_anos`, `altas_30_dias`, `altas_12_meses`, `roic`, `sem_prejuizo`, `divida_liquida_ebitda`, `earning_yield`

### `companyType` (filtros)

Ex.: `BRA:stock`, `BRA:etf`, `BRA:fii`, `USA:stock`

### `ratingType` (`rank_codes_by_rating`)

`blue`, `green`, `yellow`, `red`

### Chaves BFF (`POST /api/bff?key=`)

| key | Uso |
|-----|-----|
| `home-rankings` | Preview de ranking na home |
| `asset-image-tooltip` | Tooltip do ativo |

---

*Catálogo validado por Scrapling (XHR + probe REST + scan JS) em jun/2026.*
