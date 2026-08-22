# AUVP Dicionário do Mercado — MCP

Módulo MCP para o [Dicionário do Mercado](https://comunidade.auvp.com.br/dicion%C3%A1rio/). A página fica na Comunidade, mas os dados vêm de um worker separado — e **público**.

| Item       | Valor                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| **API**    | `https://worker.auvp.com.br`                                           |
| **Página** | `https://comunidade.auvp.com.br/dicionário/`                           |
| **Auth**   | Nenhuma (endpoint público; o MCP envia apenas `referer` da Comunidade) |
| **Tools**  | **3**, somente leitura                                                 |

Por não exigir credenciais, este é o único módulo que funciona antes de qualquer login.

---

## Estrutura do módulo

| Arquivo         | Função                                                            |
| --------------- | ----------------------------------------------------------------- |
| `catalog.ts`    | Contratos de leitura observados                                   |
| `tools.ts`      | Definições das 3 tools `auvp_dicionario_*`                        |
| `schemas.ts`    | Schemas Zod + JSON Schema do módulo                               |
| `normalize.ts`  | Sanitização das respostas (remove metadados pessoais dos autores) |
| `scan-tools.ts` | Varredura ao vivo (somente leitura)                               |

---

## Tools MCP

Prefixo: `auvp_dicionario_` (omitido na tabela).

| Tool                   | Endpoint                  | Parâmetros / notas                                                                                   |
| ---------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `list_observed_routes` | —                         | Catálogo local (API base, página e rotas)                                                            |
| `search_terms`         | `GET /dictionary`         | `query` (texto), `page` (default 1), `category`, `letter` (≤2 caracteres), `author` (bool). Paginado |
| `get_term`             | `GET /dictionary/:termId` | `termId` — conceito, definição, categoria, validação e datas                                         |

---

## Privacidade das respostas

Ambas as tools passam pelo sanitizador de `normalize.ts`. A resposta entregue ao agente contém **apenas**: id do termo, conceito, definição em texto, categoria, status de validação e datas. E-mail, foto e demais metadados pessoais dos autores são descartados antes de sair do MCP.

---

## Validação

```bash
npm run scan:dicionario   # público; somente leitura
npm test                  # inclui test/dicionario.test.ts
```

Descoberta de novas rotas:

```bash
.venv-scrapling/bin/python scripts/discover_endpoints.py dicionario-all
```
