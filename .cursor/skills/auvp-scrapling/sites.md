# Sites AUVP — descoberta de endpoints (MCP)

Mesma lógica para **Finanças**, **Analítica**, **Comunidade**, **Carteira** e **Dicionário**: mapear rotas HTTP, não extrair conteúdo.

## Visão comparativa

| | Finanças | Analítica | Comunidade |
|---|----------|-----------|------------|
| **Base API** | `financas-api.auvp.com.br` | `analitica.auvp.com.br/api/*` | `comunidade.auvp.com.br` |
| **Frontend** | `financas.auvp.com.br` | `analitica.auvp.com.br` | mesmo host |
| **Auth** | Bearer | Cookie + XSRF | Cookie IPS |
| **Catálogo** | `src/financas/catalog.ts` | `src/analitica/catalog.ts` | `src/comunidade/catalog.ts` |
| **list_observed_routes** | `auvp_financas_*` | `auvp_analitica_*` | `auvp_comunidade_*` |
| **Scan** | `scan:financas` | `scan:analitica` | `scan:comunidade` |
| **capture_xhr regex** | `financas-api\.auvp\.com\.br/` | `analitica\.auvp\.com\.br/api/` | `comunidade\.auvp\.com\.br/` |
| **HAR ref.** | `financas.auvp.com.br.har` | `analitica.auvp.com.br.har` | capturar na exploração |

SSO compartilhado: `https://sso.auvp.com.br` · credenciais em `~/.auvp-financas/`.

---

## Finanças

### API REST (`financas-api.auvp.com.br`)

- **Auth:** `Authorization: Bearer <token>`
- **Contrato:** `{ status, message, data }`
- **Catálogo:** `FINANCAS_API_ROUTES`, `FINANCAS_PAGE_ROUTES`
- **Descoberta:** probe GET com bearer; `capture_xhr` ao navegar `financas.auvp.com.br`
- **Normalização:** `/accounts/123` → `/accounts/:accountId`

Rotas principais: `/users/profile`, `/accounts`, `/transactions`, `/dashboard`, `/budgets`, `/tags`, `/pluggy/connect-token`.

### Páginas SPA (disparam XHR)

`/dashboard/home`, `/dashboard/transactions`, `/settings/profile`, etc. — ver `FINANCAS_PAGE_ROUTES`.

---

## Analítica

### REST (`/api/*`)

- **Auth:** cookie `analitica-cookie` + header `X-XSRF-TOKEN`
- **Catálogo:** `ANALITICA_API_ROUTES`, `ANALITICA_PAGE_ROUTES`
- **Descoberta:** `capture_xhr` em cada tela; probe direto em `/api/...`

Rotas principais: `/api/session`, `/api/auth/me`, `/api/codes`, `/api/quotes/:ticker`, `/api/bff?key=...`.

### Páginas SPA (disparam XHR)

`/acoes/:ticker`, `/rankings/acoes/:rankingType`, `/fiis`, etc.

### Rotas RSC

`GET /rankings/:segment/:rankingType` — resposta HTML/RSC, tool `auvp_analitica_get_page_route`.

---

## Comunidade

### HTTP/AJAX (IPS Suite)

- **Auth:** cookie `comunidade-cookie` (`ips4_member_id`, `ips4_login_key`)
- **Catálogo:** `COMUNIDADE_API_ROUTES`, `COMUNIDADE_PAGE_ROUTES`
- **Descoberta:** probe `/search/`; `capture_xhr` em fóruns/tópicos; Network ao filtrar busca

| Rota | Método | Contrato |
|------|--------|----------|
| `/search/` | GET | JSON `{ title, content, filters }` |
| `/topic/:id-:slug/` | GET | HTML (parser em `topic.ts`) |
| `/forum/:id-:slug/` | GET | HTML (candidato a tool) |

**Query `/search/`:** `q`, `search_and_or`, `search_in`, `sortby`, `type`, `nodes`.

**Valores `type`:** `forums_topic`, `core_statuses_status`, `calendar_event`, `cms_pages_pageitem`, `cms_records1`.

### Páginas (disparam AJAX IPS)

`/`, `/search/`, `/forum/:id-:slug/`, `/discover/`, `/profile/:id-:slug/`.

---

## Padrão ao adicionar rota (qualquer produto)

1. Entrada tipada em `src/{produto}/catalog.ts`
2. Tool em `src/{produto}/tools.ts`
3. Schema em `src/mcp/schemas/`
4. Probe em `src/{produto}/scan-tools.ts`
5. Validar: `npm run scan:{produto}`

## Scrapling — instalação (obrigatória)

Seguir **[Installation](https://scrapling.readthedocs.io/en/latest/index.html#installation)**:

1. Python 3.10+
2. `pip install "scrapling[all]"` (ou `scripts/scrapling-requirements.txt`)
3. `scrapling install` — browsers e deps de sistema

`pip install scrapling` sem extras → `ModuleNotFoundError` em `scrapling.fetchers`.

## Fetchers Scrapling

| Tarefa | Fetcher |
|--------|---------|
| Probe REST/JSON | `Fetcher` |
| Disparar XHR (SPA/IPS) | `DynamicFetcher` + `capture_xhr` |
| SSO expirado | `StealthyFetcher` |
