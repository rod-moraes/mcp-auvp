# Dicionário do Mercado

Módulo independente `dicionario`, somente leitura. A página está na Comunidade, mas os dados vêm de `https://worker.auvp.com.br/dictionary`.

## Tools

- `auvp_dicionario_list_observed_routes`
- `auvp_dicionario_search_terms`
- `auvp_dicionario_get_term`

As respostas contêm apenas ID do termo, conceito, definição em texto, categoria, validação e datas. E-mail, foto e demais metadados pessoais dos autores são descartados.

```bash
npm run scan:dicionario
.venv-scrapling/bin/python scripts/discover_endpoints.py dicionario-all
```

