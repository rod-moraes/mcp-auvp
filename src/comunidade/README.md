# AUVP Comunidade — MCP

Módulo MCP para o fórum [AUVP Comunidade](https://comunidade.auvp.com.br/) — plataforma Invision Community (IPS Suite) com fóruns de renda variável, renda fixa, devs, agro e área exclusiva de alunos.

| Item | Valor |
|------|-------|
| **Base** | `https://comunidade.auvp.com.br` |
| **Auth** | Cookie de sessão IPS (`ips4_member_id`, `ips4_login_key`) |
| **Cookie em disco** | `~/.auvp-financas/comunidade-cookie` |
| **Contrato** | Busca/notificações em JSON; tópicos e fóruns em HTML parseado pelo MCP |
| **Tools** | **8**, somente leitura |

O cookie é capturado automaticamente no mesmo login do `auvp_ensure_auth` (junto com bearer e cookie do Analítica). Detalhes no [README principal](../../README.md).

---

## Estrutura do módulo

| Arquivo | Função |
|---------|--------|
| `catalog.ts` | Catálogo de rotas AJAX/HTML e páginas IPS |
| `tools.ts` | Definições das 8 tools `auvp_comunidade_*` |
| `scan-tools.ts` | Varredura ao vivo das tools (somente leitura) |
| `forums.ts` | Catálogo estático de fóruns (ids e slugs) |
| `search.ts` | Busca via `GET /search/` (JSON → resultados estruturados) |
| `topic.ts` | Leitura de tópico com posts e comentários |
| `forum-topics.ts` | Listagem de tópicos por `?forumId=` |
| `notifications.ts` | Notificações do usuário |
| `widgets.ts` | Rankings IPS (`topContributors`, `mostSolved`) |
| `html-utils.ts` | Helpers de parse HTML |
| `cookies.ts` | Persistência do cookie IPS |

Schemas Zod/JSON compartilhados: `src/mcp/schemas/`.

---

## Tools MCP

Prefixo: `auvp_comunidade_` (omitido nas tabelas). Liste tudo em runtime com `auvp_comunidade_list_observed_routes`.
Módulo **somente leitura**: nenhuma tool publica, comenta ou altera conteúdo no fórum.

### Catálogo e fóruns

| Tool | Endpoint |
|------|----------|
| `list_observed_routes` | — (retorna catálogo local) |
| `list_forums` | — (25 fóruns com id, slug e hierarquia) |

Use `list_forums` para obter ids/slugs antes de filtrar buscas ou listar tópicos.

### Busca e conteúdo

| Tool | Endpoint |
|------|----------|
| `search` | `GET /search/` — header `X-Requested-With` → JSON |
| `list_forum_topics` | `GET /?forumId=&page=` — HTML parseado |
| `get_topic` | `GET /topic/:id-:slug/` — HTML parseado |

**`search`** — parâmetros:

| Parâmetro | Valores | Padrão |
|-----------|---------|--------|
| `query` | termo (obrigatório) | — |
| `forums` | ids ou slugs (`renda-fixa`, `12`, …) | todos |
| `searchMode` | `and`, `or` | `and` |
| `searchIn` | `all`, `titles` | `all` |
| `contentType` | `forums_topic`, `core_statuses_status`, `calendar_event`, `cms_pages_pageitem`, `cms_records1`, `all` | `forums_topic` |
| `sortBy` | `relevancy`, `newest` | `relevancy` |
| `page` | inteiro ≥ 1 | `1` |

Resposta: `total`, `results[]` com `title`, `url`, `author`, `forum`, `excerpt`, `replies`, etc.

**`list_forum_topics`** — `forum` (id ou slug) e `page` opcional.

**`get_topic`** — `url` ou path do tópico (ex. `/topic/44024-tesouro-ipca-832/`). Resposta: `title`, `posts[]` com `author`, `content`, `isOriginalPost`, `rank`, `isTimeAuvp`, etc.

### Notificações e rankings

| Tool | Endpoint |
|------|----------|
| `list_notifications` | `GET /notifications/` |
| `get_top_contributors` | `GET /index.php?app=core&module=system&controller=ajax&do=topContributors` |
| `get_most_solved` | `GET /index.php?app=core&module=system&controller=ajax&do=mostSolved` |

Widgets aceitam `time`: `week`, `month`, `year`, `all` (padrão `week`) e `limit` 1–20 (padrão `5`).

---

## Rotas no catálogo sem tool dedicada

| Rota | Nota |
|------|------|
| `GET /api/core/hello` | REST IPS — exige API key (`NO_API_KEY`) |
| `GET /api/forums/topics/:topicId` | REST IPS — exige API key |
| `GET /api/forums/forums/:forumId` | REST IPS — exige API key |
| `GET /api/core/members/me` | REST IPS — exige API key |
| `GET /profile/:memberId-:slug/` | HTML de perfil — sem parser dedicado |
| `GET /forum/:id-:slug/` | URL legada; AJAX redireciona para `?forumId=` |

---

## Páginas IPS (frontend)

Rotas em `COMUNIDADE_PAGE_ROUTES` — navegação e captura XHR:

`/`, `/search/`, `/forums/`, `/?forumId=:forumId`, `/topic/:topicId-:slug/`, `/forum/:forumId-:slug/`, `/profile/:memberId-:slug/`, `/notifications/`

Fóruns principais (ver `forums.ts`): Comunidade AUVP, Renda Variável, Renda Fixa, Dev's, AUVP Agro, Exclusivo para alunos, etc.

---

## Comportamentos conhecidos

| Tool / campo | Observação |
|--------------|------------|
| `get_topic` | Conteúdo dos posts pode incluir ruído de widgets de reação IPS no final do texto |
| `list_forum_topics` | Parser filtra `ipsDataItem` da página; pode retornar menos tópicos que o site exibe (sidebar/nav) |
| `list_notifications` | Retorna `[]` quando não há notificações pendentes na sessão |
| `search` | Requer cookie IPS válido; sem sessão a busca falha ou retorna vazio |
| `/api/*` | Disponível no IPS, mas inútil sem chave de API |

---

## Descoberta de novas rotas

Skill e scripts: [auvp-scrapling](../../.cursor/skills/auvp-scrapling/SKILL.md).

```bash
source .venv-scrapling/bin/activate

# Varredura completa: XHR em páginas IPS + probe AJAX/HTML
python scripts/discover_endpoints.py comunidade-all

# Uma página
python scripts/discover_endpoints.py comunidade --path /search/

# Probe pontual
python scripts/discover_endpoints.py probe --site comunidade --path /search/ --query "q=tesouro&type=forums_topic"
```

Relatórios em `data/endpoint-discovery/`. Endpoints AJAX exigem header `X-Requested-With: XMLHttpRequest` (o MCP envia automaticamente em `getComunidade` / `getComunidadeAjaxText`).

Fluxo para adicionar rota:

1. Entrada em `catalog.ts`
2. Tool em `tools.ts` + schema em `src/mcp/schemas/`
3. Probe em `scan-tools.ts`
4. `npm run scan:comunidade && npm test`

---

## Validação

```bash
npm run scan:comunidade    # relatório em data/comunidade-tools-report.json (8 tools)
npm test                   # inclui parsers em test/comunidade*.test.ts
```

Requer cookie IPS em `~/.auvp-financas/comunidade-cookie` (`auvp_ensure_auth`).

---

## Referência rápida

### Exemplo de fluxo no chat

1. `auvp_comunidade_search` com `query: "tesouro"` e `contentType: "forums_topic"`
2. `auvp_comunidade_get_topic` com a `url` de um resultado
3. Opcional: `auvp_comunidade_list_forum_topics` com `forum: "renda-variavel"`

### Variáveis de ambiente

| Variável | Default |
|----------|---------|
| `AUVP_COMUNIDADE_COOKIE_FILE` | `~/.auvp-financas/comunidade-cookie` |
| `AUVP_COMUNIDADE_COOKIE` | cookie inline (alternativa ao arquivo) |

---

*Catálogo validado por Scrapling (probe + XHR) em jun/2026.*
