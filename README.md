# MCP AUVP

Servidor MCP local para consultar os produtos AUVP via chat (Cursor, Claude Desktop, etc.).

**Repositório:** [github.com/rod-moraes/mcp-auvp](https://github.com/rod-moraes/mcp-auvp)

| Produto | Base | Documentação |
|---------|------|--------------|
| **Finanças** | `https://financas-api.auvp.com.br` | **[src/financas/README.md](src/financas/README.md)** — 32 tools (contas, transações, dashboard, orçamento) |
| **Analítica** | `https://analitica.auvp.com.br` | **[src/analitica/README.md](src/analitica/README.md)** — 44 tools (rankings, fundamentos, mercado, comparador) |
| **Comunidade** | `https://comunidade.auvp.com.br` | **[src/comunidade/README.md](src/comunidade/README.md)** — 8 tools (busca, fóruns, tópicos, notificações, rankings) |

O servidor usa transporte `stdio` e pode ser instalado direto do GitHub com `npx`, sem clonar o repositório.

---

## Instalação (repositório público no GitHub)

### Pré-requisitos

- **Node.js** ≥ 20.18 ([nodejs.org](https://nodejs.org/))
- Conta AUVP (login SSO em `sso.auvp.com.br`)
- **Cursor** (ou outro cliente MCP compatível com `stdio`)

### Passo 1 — Configurar o MCP no Cursor

Crie ou edite `~/.cursor/mcp.json` (global) ou `.cursor/mcp.json` (só neste projeto).

Substitua `SEU_USUARIO` pelo seu usuário local (caminhos em `env`):

```json
{
  "mcpServers": {
    "auvp-financas": {
      "command": "npx",
      "args": ["-y", "github:rod-moraes/mcp-auvp"],
      "env": {
        "AUVP_FINANCAS_ACCESS_TOKEN_FILE": "/Users/SEU_USUARIO/.auvp-financas/access-token",
        "AUVP_ANALITICA_COOKIE_FILE": "/Users/SEU_USUARIO/.auvp-financas/analitica-cookie",
        "AUVP_COMUNIDADE_COOKIE_FILE": "/Users/SEU_USUARIO/.auvp-financas/comunidade-cookie"
      }
    }
  }
}
```

> No **Linux**, troque `/Users/SEU_USUARIO` por `/home/SEU_USUARIO`. No **Windows**, use barras normais, ex.: `C:/Users/SEU_USUARIO/.auvp-financas/access-token`.

Exemplo pronto: [.cursor/mcp.json.example](.cursor/mcp.json.example).

**Repositório privado?** Use token no URL:

```json
"args": ["-y", "git+https://TOKEN@github.com/rod-moraes/mcp-auvp.git"]
```

**Fixar versão** (evita pegar `main` automaticamente):

```json
"args": ["-y", "github:rod-moraes/mcp-auvp#main"]
```

### Passo 2 — Reiniciar o MCP no Cursor

Abra **Settings → MCP → Restart** (ou reinicie o Cursor).

Na primeira execução o `npx` baixa o repositório, roda `npm install` e compila automaticamente (`prepare`). Não é preciso clonar nem rodar `npm run build` manualmente.

### Passo 3 — Autenticar

No chat do Cursor, peça ao agente:

> Chame `auvp_ensure_auth` para logar na AUVP.

O MCP:

1. Reutiliza o token salvo se ainda for válido.
2. Tenta renovar em silêncio com o perfil do navegador salvo.
3. Só abre o Chrome visível se o login ainda for necessário.

Na primeira vez (ou sessão expirada), o navegador abre para você logar no SSO. Depois disso, a renovação costuma ser automática.

### Passo 4 — Chromium do Playwright (só na primeira vez)

Se o login falhar por falta do navegador embutido, rode **uma vez** no terminal:

```bash
npx -y --package=github:rod-moraes/mcp-auvp -c "playwright install chromium"
```

Se você clonou o repositório:

```bash
cd mcp-auvp
npm run playwright:install
```

### Passo 5 — Testar

No chat, peça algo como:

- Finanças: *"Liste minhas contas com `auvp_financas_list_accounts`"*
- Analítica: *"Busque o ranking de dividend yield com `auvp_analitica_get_ranking`"*
- Comunidade: *"Leia o tópico X com `auvp_comunidade_get_topic`"*

Confirme o status com `auvp_get_auth_status`.

---

## O que fica salvo no disco

| Arquivo | Conteúdo |
|---------|----------|
| `~/.auvp-financas/access-token` | Bearer token da API Finanças |
| `~/.auvp-financas/analitica-cookie` | Cookie de sessão do Analítica |
| `~/.auvp-financas/comunidade-cookie` | Cookie de sessão IPS da Comunidade |
| `~/.auvp-financas/browser-profile/` | Perfil Playwright (sessão SSO no navegador) |
| `~/.auvp-financas/storage-state.json` | Backup extra de cookies |

**Não salvamos senha em texto** — só o que o navegador guarda no perfil. Para trocar de conta ou limpar a sessão: `auvp_ensure_auth` com `fresh: true`.

O MCP recarrega token e cookie do disco automaticamente; reiniciar o servidor só é necessário se ele estiver parado.

### Login ao iniciar o MCP

Ao ativar/reiniciar o MCP, ele verifica a autenticação automaticamente (token válido → renovação silenciosa → Chrome visível se precisar). Para desativar:

```bash
export AUVP_FINANCAS_AUTO_LOGIN_ON_START=0
```

---

## Desenvolvimento (clone local)

Para contribuir ou rodar sem `npx` do GitHub:

```bash
git clone https://github.com/rod-moraes/mcp-auvp.git
cd mcp-auvp
npm install          # já dispara o build (prepare)
npm run playwright:install   # primeira vez, para login
npm test
```

Configuração MCP apontando para o clone:

```json
{
  "mcpServers": {
    "auvp-financas": {
      "command": "npx",
      "args": ["-y", "mcp-auvp-financas"],
      "cwd": "/caminho/para/mcp-auvp",
      "env": {
        "AUVP_FINANCAS_ACCESS_TOKEN_FILE": "/Users/SEU_USUARIO/.auvp-financas/access-token",
        "AUVP_ANALITICA_COOKIE_FILE": "/Users/SEU_USUARIO/.auvp-financas/analitica-cookie",
        "AUVP_COMUNIDADE_COOKIE_FILE": "/Users/SEU_USUARIO/.auvp-financas/comunidade-cookie"
      }
    }
  }
}
```

Modo desenvolvimento sem compilar:

```bash
npm run dev
```

---

## Variáveis de ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `AUVP_FINANCAS_API_BASE_URL` | `https://financas-api.auvp.com.br` | API Finanças |
| `AUVP_FINANCAS_ORIGIN` | `https://financas.auvp.com.br` | Origin/referer Finanças |
| `AUVP_ANALITICA_BASE_URL` | `https://analitica.auvp.com.br` | API Analítica |
| `AUVP_ANALITICA_ORIGIN` | `https://analitica.auvp.com.br` | Origin/referer Analítica |
| `AUVP_FINANCAS_TIMEOUT_MS` | `30000` | Timeout por request (ms) |
| `AUVP_FINANCAS_ACCESS_TOKEN_FILE` | `~/.auvp-financas/access-token` | Arquivo do bearer token |
| `AUVP_FINANCAS_ACCESS_TOKEN` | — | Token inline (alternativa ao arquivo) |
| `AUVP_ANALITICA_COOKIE_FILE` | `~/.auvp-financas/analitica-cookie` | Cookie do Analítica |
| `AUVP_ANALITICA_COOKIE` | — | Cookie inline (alternativa ao arquivo) |
| `AUVP_COMUNIDADE_COOKIE_FILE` | `~/.auvp-financas/comunidade-cookie` | Cookie IPS da Comunidade |
| `AUVP_COMUNIDADE_COOKIE` | — | Cookie inline (alternativa ao arquivo) |
| `AUVP_FINANCAS_BROWSER_PROFILE_DIR` | `~/.auvp-financas/browser-profile` | Perfil Playwright |
| `AUVP_FINANCAS_STORAGE_STATE_FILE` | `~/.auvp-financas/storage-state.json` | Backup de sessão |
| `AUVP_FINANCAS_LOGIN_FRESH` | — | `1` força login do zero |
| `AUVP_FINANCAS_AUTO_LOGIN_ON_START` | `1` | `0` desativa login automático ao iniciar |
| `AUVP_FINANCAS_EXTRA_HEADERS` | — | JSON com headers extras |

SSO (opcional):

| Variável | Default |
|----------|---------|
| `AUVP_FINANCAS_SSO_BASE_URL` | `https://sso.auvp.com.br` |
| `AUVP_FINANCAS_SSO_REALM` | `AUVP` |
| `AUVP_FINANCAS_SSO_CLIENT_ID` | `financas` |
| `AUVP_FINANCAS_SSO_REDIRECT_URI` | `https://financas-api.auvp.com.br/auth/auvp/callback` |
| `AUVP_FINANCAS_SSO_SCOPE` | `email profile openid` |

---

## Ferramentas

### Auth (transversal)

| Tool | Uso |
|------|-----|
| `auvp_ensure_auth` | Login/renovação automática (recomendado) |
| `auvp_get_auth_status` | Verifica bearer, cookies Analítica/Comunidade e sessão |
| `auvp_create_sso_login_url` | URL de login SSO (fluxo manual) |
| `auvp_complete_sso_login` | Conclui login com `callbackUrl` |

### Finanças — `auvp_financas_*`

Documentação: **[src/financas/README.md](src/financas/README.md)**

Leitura e escrita de contas, transações, dashboard, orçamento, categorias, tags e Pluggy. Varredura ao vivo: `npm run scan:financas`.

### Analítica — `auvp_analitica_*`

Documentação: **[src/analitica/README.md](src/analitica/README.md)**

Sessão, rankings, fundamentos por ativo, mercado, notícias e simulador. Somente leitura. Varredura: `npm run scan:analitica`; auditoria: `npm run audit:analitica`.

### Comunidade — `auvp_comunidade_*`

Documentação: **[src/comunidade/README.md](src/comunidade/README.md)**

Busca, listagem de fóruns/tópicos, leitura de posts e comentários, notificações e rankings IPS. Somente leitura. Varredura: `npm run scan:comunidade`.

---

## Fluxo SSO manual (alternativa)

Prefira `auvp_ensure_auth`, que abre o navegador e salva o token sozinho.

1. Chame `auvp_create_sso_login_url` (URL com `state` válido da API).
2. Abra a URL no navegador e conclua o login.
3. Se o redirect for rápido demais: DevTools → Network → **Preserve log** → filtre `callback` → copie a URL.
4. Chame `auvp_complete_sso_login` com `callbackUrl` na mesma sessão do MCP.
5. O bearer token é salvo em disco automaticamente.

Não gere a URL de login manualmente: a API valida o `state` que ela criou.

---

## Verificação

```bash
npm test
npm run build
npm run scan:financas    # requer auth
npm run scan:analitica   # requer auth (bearer + cookie)
npm run scan:comunidade  # requer cookie IPS
```

---

## Origem do catálogo

Contrato inicial extraído de HARs e probes Scrapling nos três produtos. Novas rotas podem ser descobertas com o skill [auvp-scrapling](.cursor/skills/auvp-scrapling/SKILL.md) — ver READMEs de cada módulo:

- [Finanças](src/financas/README.md)
- [Analítica](src/analitica/README.md)
- [Comunidade](src/comunidade/README.md)
