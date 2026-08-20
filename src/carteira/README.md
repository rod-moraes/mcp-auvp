# Carteira / Diagrama do Cerrado

Módulo `carteira` do MCP AUVP. Usa o frontend `https://ferramentas.auvp.com.br/carteira` e a API `https://ferramentas-backend.auvp.com.br`.

## Autenticação

`auvp_ensure_auth` visita a Carteira com o perfil persistente e salva somente o bearer da aplicação em `~/.auvp-financas/carteira-token`. Um token válido é reutilizado entre chats; o navegador visível só abre depois de falhar a validação e a renovação silenciosa.

## Tools

- Leitura: catálogo de rotas, portfólio sanitizado, ativos, metas, perguntas, classificação, sugestões de ativos e mapa de ratings por país.
- Cálculo: sugestão de distribuição para um novo aporte.
- Escrita: criar/editar/remover ativos, registrar aporte/venda, atualizar respostas e metas, e gerenciar perguntas do Diagrama.

As tools mutáveis começam com `ESCRITA` na descrição. O scan padrão é somente leitura:

```bash
npm run scan:carteira
```

## Descoberta

```bash
.venv-scrapling/bin/python scripts/discover_endpoints.py carteira-all
```

Os relatórios registram apenas contratos, status e shapes; tokens e respostas do portfólio não são persistidos.

