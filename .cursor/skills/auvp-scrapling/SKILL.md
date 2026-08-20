---
name: auvp-scrapling
description: >-
  Descobre e documenta endpoints HTTP dos cinco módulos AUVP (Finanças, Analítica,
  Comunidade, Carteira e Dicionário) usando Scrapling, para implementar tools no MCP mcp-auvp. Instalação
  deve seguir https://scrapling.readthedocs.io/en/latest/index.html#installation
  (scrapling[all] + scrapling install). Use ao mapear rotas, descobrir APIs ou
  expandir catálogos MCP. NÃO é para extrair conteúdo de páginas.
---

# AUVP Scrapling — descoberta de endpoints para o MCP

**Objetivo:** para **Finanças**, **Analítica**, **Comunidade**, **Carteira** e **Dicionário**, descobrir quais endpoints existem, como são chamados e o que retornam — para criar/atualizar tools MCP.

**Não é:** raspagem de conteúdo editorial ou dados pessoais do usuário.

Stack: [Scrapling](https://github.com/D4Vinci/Scrapling) + sessão `~/.auvp-financas/`.

## Setup — instalação Scrapling (obrigatório)

**SEMPRE** siga a instalação oficial antes de usar fetchers, spiders ou CLI:

**[scrapling.readthedocs.io — Installation](https://scrapling.readthedocs.io/en/latest/index.html#installation)**

Não improvise versões, extras ou comandos. Se `import scrapling.fetchers` falhar, a instalação está incompleta (ver aviso da doc: `pip install scrapling` sozinho **não** inclui fetchers).

### Requisitos (doc oficial)

- Python **3.10+**
- Para este projeto: extras **`scrapling[all]`** (fetchers + shell + MCP) — ver [Optional Dependencies](https://scrapling.readthedocs.io/en/latest/index.html#optional-dependencies)

### Procedimento neste repositório

```bash
cd /caminho/para/mcp-auvp

# 1. venv (Python 3.10+)
python3 -m venv .venv-scrapling
source .venv-scrapling/bin/activate

# 2. Instalar com extras — NÃO usar só `pip install scrapling`
pip install -r scripts/scrapling-requirements.txt
# equivalente doc: pip install "scrapling[all]"

# 3. Obrigatório após extras: browsers e deps de sistema (doc oficial)
scrapling install
# reinstalar se necessário: scrapling install --force

# 4. Verificar fetchers
python -c "from scrapling.fetchers import Fetcher, DynamicFetcher; print('ok')"
```

Se `scrapling` não estiver no `$PATH`, use o binário do venv: `.venv-scrapling/bin/scrapling install`.

### Alternativa Docker (doc oficial)

Somente para CLI/extract, sem código Python — ver [Docker](https://scrapling.readthedocs.io/en/latest/index.html#docker):

```bash
docker pull pyd4vinci/scrapling
# ou: docker pull ghcr.io/d4vinci/scrapling:latest
```

Para descoberta de endpoints AUVP com `capture_xhr` e probes autenticados, prefira o **venv local** acima.

### Auth AUVP (após Scrapling ok)

`auvp_ensure_auth` (MCP) · `python scripts/auvp_auth.py status`

Doc geral Scrapling: [readthedocs.io/en/latest](https://scrapling.readthedocs.io/en/latest/index.html)

---

## Lógica unificada (os 5 módulos seguem o mesmo fluxo)

Cada produto AUVP tem **a mesma estrutura de descoberta**:

| Etapa | O que fazer | Artefato |
|-------|-------------|----------|
| 1. Catálogo | Listar rotas já conhecidas | `src/{produto}/catalog.ts` |
| 2. Coleta | HAR, `capture_xhr`, bundles JS | `data/endpoint-discovery/` |
| 3. Probe | Chamar endpoint e registrar status/shape | script ou Scrapling |
| 4. Tool MCP | Implementar wrapper tipado | `src/{produto}/tools.ts` |
| 5. Scan | Validar tools ao vivo | `npm run scan:{produto}` |

```
Progresso (repetir por produto):
- [ ] 1. Escopo: qual feature/tela nova?
- [ ] 2. Auth ok para esse produto?
- [ ] 3. Listar catálogo atual (tool list_observed_routes)
- [ ] 4. Coletar candidatos (HAR / capture_xhr / probe)
- [ ] 5. Atualizar src/{produto}/catalog.ts
- [ ] 6. Criar tool + schema Zod
- [ ] 7. npm run scan:{produto} && npm test
```

---

## Finanças

| Item | Valor |
|------|-------|
| API | `https://financas-api.auvp.com.br` |
| Frontend (dispara XHR) | `https://financas.auvp.com.br` |
| Auth | Bearer (`~/.auvp-financas/access-token`) |
| Catálogo | `src/financas/catalog.ts` |
| Tool catálogo | `auvp_financas_list_observed_routes` |
| Scan | `npm run scan:financas` |

**Como descobrir:** probe REST direto com bearer; navegar SPA com `capture_xhr=r"financas-api\.auvp\.com\.br/"`; HAR `financas.auvp.com.br.har`.

**Contrato:** `{ status, message, data }` · normalizar IDs → `:accountId`, `:transactionId`.

```bash
python scripts/discover_endpoints.py financas --path /dashboard/transactions
python scripts/discover_endpoints.py probe --site financas_api --path /budgets
```

---

## Analítica

| Item | Valor |
|------|-------|
| API | `https://analitica.auvp.com.br/api/*` |
| Frontend (dispara XHR) | `https://analitica.auvp.com.br` |
| Auth | Cookie + `X-XSRF-TOKEN` (`~/.auvp-financas/analitica-cookie`) |
| Catálogo | `src/analitica/catalog.ts` |
| Tool catálogo | `auvp_analitica_list_observed_routes` |
| Scan | `npm run scan:analitica` |

**Como descobrir:** `DynamicFetcher` + `capture_xhr=r"analitica\.auvp\.com\.br/api/"` em cada tela (`/acoes/:ticker`, `/rankings/...`); probe `GET /api/...`; HAR `analitica.auvp.com.br.har`.

**Contrato:** JSON REST; rotas RSC em `/rankings/:segment/:rankingType` retornam HTML/RSC.

```bash
python scripts/discover_endpoints.py analitica-all
python scripts/discover_endpoints.py analitica --path /acoes/PETR4
python scripts/discover_endpoints.py probe --site analitica --path /api/codes --query "code=PETR4"
```

---

## Comunidade

| Item | Valor |
|------|-------|
| API/AJAX | `https://comunidade.auvp.com.br` (IPS Suite) |
| Frontend | mesmo host |
| Auth | Cookie IPS (`ips4_member_id`, `ips4_login_key`) |
| Catálogo | `src/comunidade/catalog.ts` |
| Tool catálogo | `auvp_comunidade_list_observed_routes` |
| Scan | `npm run scan:comunidade` |

**Como descobrir:** probe `GET /search/` (JSON com HTML embutido); `capture_xhr` ao navegar fóruns/tópicos; inspecionar `type`, `nodes`, paginação na busca IPS.

**Contrato:** `/search/` → `{ title, content, filters }`; tópicos → HTML (`/topic/:id-:slug/`).

```bash
python scripts/discover_endpoints.py comunidade-all
python scripts/discover_endpoints.py comunidade --path /search/
python scripts/discover_endpoints.py probe --site comunidade --path /search/ --query "q=tesouro&type=forums_topic"
```

## Carteira e Dicionário

- Carteira: frontend `ferramentas.auvp.com.br/carteira`, API `ferramentas-backend.auvp.com.br`, bearer em `~/.auvp-financas/carteira-token`.
- Dicionário: página na Comunidade, API pública `worker.auvp.com.br/dictionary`, sempre com Origin/Referer da Comunidade.

```bash
python scripts/discover_endpoints.py carteira-all
python scripts/discover_endpoints.py dicionario-all
python scripts/discover_endpoints.py all
```

O comando `all` e os scans padrão são somente leitura. Não persistir corpos, tokens, cookies, e-mails ou conteúdo financeiro/editorial.

---

## Coleta com Scrapling (comum aos 3)

### XHR ao navegar SPA

```python
from scripts.auvp_auth import headers_for_site
from scrapling.fetchers import DynamicFetcher

# Padrão regex por produto (NÃO usar glob):
# financas:  r"financas-api\.auvp\.com\.br/"
# analitica: r"analitica\.auvp\.com\.br/api/"
# comunidade: r"comunidade\.auvp\.com\.br/"

page = DynamicFetcher.fetch(
    "https://analitica.auvp.com.br/acoes/PETR4",
    headers=headers_for_site("analitica"),
    headless=True,
    network_idle=True,
    capture_xhr=r"analitica\.auvp\.com\.br/api/",
)
for resp in page.captured_xhr:
    print(resp.status, resp.url)
```

### Probe REST direto

```python
from scrapling.fetchers import Fetcher
from scripts.auvp_auth import headers_for_site

resp = Fetcher.get(
    "https://financas-api.auvp.com.br/accounts",
    headers=headers_for_site("financas_api"),
    impersonate="chrome",
)
```

### CLI unificada

```bash
# Captura XHR ao abrir página
python scripts/discover_endpoints.py {financas|analitica|comunidade} --path /rota

# Probe de endpoint candidato
python scripts/discover_endpoints.py probe --site {financas_api|analitica|comunidade} \
  --method GET --path /caminho [--query "k=v"]
```

Saída: `data/endpoint-discovery/{produto}-*.json`

---

## HAR (fonte histórica)

| Produto | HAR de referência |
|---------|-------------------|
| Finanças | `financas.auvp.com.br.har` |
| Analítica | `analitica.auvp.com.br.har` |
| Comunidade | capturar ao explorar busca/fóruns |

Fluxo: DevTools → Preserve log → navegar feature → exportar HAR → extrair hosts AUVP → normalizar paths → `catalog.ts` → probe → scan.

---

## Entregável por rota descoberta

```json
{
  "product": "analitica",
  "method": "GET",
  "path": "/api/quotes/:ticker",
  "queryKeys": ["period"],
  "auth": "analitica-cookie + X-XSRF-TOKEN",
  "statusProbe": 200,
  "responseShape": "{ ... }",
  "mcpTool": "auvp_analitica_get_quotes",
  "discoveredFrom": "/acoes/:ticker"
}
```

| Artefato | Caminho |
|----------|---------|
| Catálogo | `src/financas/catalog.ts` · `src/analitica/catalog.ts` · `src/comunidade/catalog.ts` |
| Tools | `src/{produto}/tools.ts` |
| Schemas | `src/mcp/schemas/zod.ts` + `json.ts` |
| Scan | `src/{produto}/scan-tools.ts` |
| Relatório | `data/{produto}-tools-report.json` |

---

## Validação

```bash
npm run scan:financas
npm run scan:analitica
npm run scan:comunidade
npm test
```

## Anti-padrões

- **Não** instalar Scrapling fora da [doc oficial de instalação](https://scrapling.readthedocs.io/en/latest/index.html#installation) — sem `scrapling[fetchers]`/`[all]` + `scrapling install`, fetchers falham.
- Não extrair conteúdo (posts, cotações, transações) — só mapear **contratos de endpoint**.
- Não commitar HAR, tokens ou PII em `data/`.
- Não usar `capture_xhr` com glob — é **regex**.
- Escrita (`POST`/`PATCH`/`DELETE`): só com probe controlado (scan Finanças usa marker `MCP_SCAN`).

## Recursos

- [Instalação Scrapling (oficial)](https://scrapling.readthedocs.io/en/latest/index.html#installation) — **fonte obrigatória** para setup
- [Optional Dependencies](https://scrapling.readthedocs.io/en/latest/index.html#optional-dependencies)
- [sites.md](sites.md) — detalhes por produto AUVP
- [examples/discover_xhr.py](examples/discover_xhr.py)
- [scripts/discover_endpoints.py](scripts/discover_endpoints.py)
- [scripts/auvp_auth.py](scripts/auvp_auth.py)
- [scripts/scrapling-requirements.txt](../../scripts/scrapling-requirements.txt) — pin `scrapling[all]` do projeto
