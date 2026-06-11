#!/usr/bin/env python3
"""Carrega credenciais AUVP salvas pelo MCP em ~/.auvp-financas/."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Literal
from urllib.parse import unquote

AUVP_DIR = Path.home() / ".auvp-financas"
BROWSER_PROFILE_DIR = AUVP_DIR / "browser-profile"
STORAGE_STATE_FILE = AUVP_DIR / "storage-state.json"
TOKEN_FILE = AUVP_DIR / "access-token"
ANALITICA_COOKIE_FILE = AUVP_DIR / "analitica-cookie"
COMUNIDADE_COOKIE_FILE = AUVP_DIR / "comunidade-cookie"

COMUNIDADE_ORIGIN = "https://comunidade.auvp.com.br"
ANALITICA_ORIGIN = "https://analitica.auvp.com.br"
FINANCAS_ORIGIN = "https://financas.auvp.com.br"
FINANCAS_API = "https://financas-api.auvp.com.br"

Site = Literal["comunidade", "analitica", "financas", "financas_api"]


def _read_line(path: Path) -> str | None:
    if not path.exists():
        return None
    raw = path.read_text(encoding="utf-8").strip()
    if raw.startswith("\ufeff"):
        raw = raw[1:].strip()
    return raw or None


def load_bearer_token() -> str | None:
    inline = os.environ.get("AUVP_FINANCAS_ACCESS_TOKEN", "").strip()
    if inline:
        return inline
    return _read_line(TOKEN_FILE)


def load_analitica_cookie() -> str | None:
    inline = os.environ.get("AUVP_ANALITICA_COOKIE", "").strip()
    if inline:
        return inline
    return _read_line(ANALITICA_COOKIE_FILE)


def load_comunidade_cookie() -> str | None:
    inline = os.environ.get("AUVP_COMUNIDADE_COOKIE", "").strip()
    if inline:
        return inline
    return _read_line(COMUNIDADE_COOKIE_FILE)


def _cookie_names(cookie_header: str) -> set[str]:
    names: set[str] = set()
    for segment in cookie_header.split(";"):
        part = segment.strip()
        if "=" in part:
            names.add(part.split("=", 1)[0].strip())
    return names


def has_comunidade_session(cookie: str | None) -> bool:
    if not cookie:
        return False
    names = _cookie_names(cookie)
    return "ips4_member_id" in names and "ips4_login_key" in names


def has_analitica_session(cookie: str | None) -> bool:
    if not cookie:
        return False
    names = _cookie_names(cookie)
    return "kc-id-token" in names or "analitica-token" in names


def xsrf_header_from_cookie(cookie: str) -> dict[str, str]:
    pairs: dict[str, str] = {}
    for segment in cookie.split(";"):
        segment = segment.strip()
        if "=" not in segment:
            continue
        name, value = segment.split("=", 1)
        pairs[name.strip()] = value.strip()

    for name in ("XSRF-TOKEN", "xsrf-token", "X-XSRF-TOKEN", "csrf-token", "_csrf"):
        if name in pairs:
            try:
                return {"X-XSRF-TOKEN": unquote(pairs[name])}
            except Exception:
                return {"X-XSRF-TOKEN": pairs[name]}

    for name, value in pairs.items():
        lower = name.lower()
        if "xsrf" in lower or lower == "csrf":
            try:
                return {"X-XSRF-TOKEN": unquote(value)}
            except Exception:
                return {"X-XSRF-TOKEN": value}

    return {}


def headers_for_site(site: Site) -> dict[str, str]:
    if site == "comunidade":
        cookie = load_comunidade_cookie()
        if not cookie:
            raise RuntimeError(
                "Cookie da Comunidade ausente. Rode auvp_ensure_auth no MCP."
            )
        return {
            "Cookie": cookie,
            "Origin": COMUNIDADE_ORIGIN,
            "Referer": f"{COMUNIDADE_ORIGIN}/",
        }

    if site == "analitica":
        cookie = load_analitica_cookie()
        if not cookie:
            raise RuntimeError(
                "Cookie do Analítica ausente. Rode auvp_ensure_auth no MCP."
            )
        headers = {
            "Cookie": cookie,
            "Origin": ANALITICA_ORIGIN,
            "Referer": f"{ANALITICA_ORIGIN}/",
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
        }
        headers.update(xsrf_header_from_cookie(cookie))
        return headers

    if site == "financas":
        cookie = load_analitica_cookie()
        token = load_bearer_token()
        headers: dict[str, str] = {
            "Origin": FINANCAS_ORIGIN,
            "Referer": f"{FINANCAS_ORIGIN}/",
        }
        if cookie:
            headers["Cookie"] = cookie
            headers.update(xsrf_header_from_cookie(cookie))
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if not cookie and not token:
            raise RuntimeError(
                "Sessão Finanças ausente. Rode auvp_ensure_auth no MCP."
            )
        return headers

    if site == "financas_api":
        token = load_bearer_token()
        if not token:
            raise RuntimeError(
                "Bearer token ausente. Rode auvp_ensure_auth no MCP."
            )
        return {
            "Authorization": f"Bearer {token}",
            "Origin": FINANCAS_ORIGIN,
            "Referer": f"{FINANCAS_ORIGIN}/",
            "Accept": "application/json",
        }

    raise ValueError(f"Site desconhecido: {site}")


def auth_status() -> dict[str, object]:
    token = load_bearer_token()
    analitica = load_analitica_cookie()
    comunidade = load_comunidade_cookie()
    return {
        "auvp_dir": str(AUVP_DIR),
        "bearer_token": bool(token),
        "analitica_cookie": has_analitica_session(analitica),
        "comunidade_cookie": has_comunidade_session(comunidade),
        "files": {
            "access_token": TOKEN_FILE.exists(),
            "analitica_cookie": ANALITICA_COOKIE_FILE.exists(),
            "comunidade_cookie": COMUNIDADE_COOKIE_FILE.exists(),
        },
    }


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] != "status":
        print("Uso: python scripts/auvp_auth.py status", file=sys.stderr)
        return 1
    print(json.dumps(auth_status(), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
