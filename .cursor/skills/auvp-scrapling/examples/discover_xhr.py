#!/usr/bin/env python3
"""Exemplo: capturar endpoints XHR ao navegar uma página SPA AUVP."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "scripts"))

from auvp_auth import headers_for_site
from scrapling.fetchers import DynamicFetcher

PAGE = sys.argv[1] if len(sys.argv) > 1 else "https://analitica.auvp.com.br/"
HOST_RE = (
    r"analitica\.auvp\.com\.br/api/"
    if "analitica" in PAGE
    else r"financas-api\.auvp\.com\.br/"
)
SITE = "analitica" if "analitica" in PAGE else "financas"

page = DynamicFetcher.fetch(
    PAGE,
    headers=headers_for_site(SITE),
    headless=True,
    network_idle=True,
    capture_xhr=HOST_RE,
)

endpoints = []
seen: set[str] = set()
for resp in page.captured_xhr:
    url = str(resp.url)
    if url in seen:
        continue
    seen.add(url)
    entry = {"status": resp.status, "url": url}
    try:
        body = resp.json()
        if isinstance(body, dict):
            entry["keys"] = list(body.keys())
    except Exception:
        pass
    endpoints.append(entry)

out = Path("data/endpoint-discovery/xhr-example.json")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(endpoints, indent=2), encoding="utf-8")
print(f"{len(endpoints)} endpoints → {out}")
