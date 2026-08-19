#!/usr/bin/env python3
"""CLI auxiliar para probe pontual de endpoints/páginas AUVP.

Preferir scripts/discover_endpoints.py para descoberta de rotas do MCP.
Este script serve para inspecionar uma URL específica durante engenharia reversa.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

# Permite importar auvp_auth ao rodar como script
sys.path.insert(0, str(Path(__file__).resolve().parent))

from auvp_auth import (  # noqa: E402
    ANALITICA_ORIGIN,
    COMUNIDADE_ORIGIN,
    CARTEIRA_API,
    DICIONARIO_API,
    FINANCAS_API,
    FINANCAS_ORIGIN,
    headers_for_site,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "data" / "scrapes"


def strip_html(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value)).strip()


def decode_entities(value: str) -> str:
    return (
        value.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#039;", "'")
        .replace("&apos;", "'")
    )


def normalize_topic_url(url_or_path: str) -> str:
    trimmed = url_or_path.strip()
    parsed = (
        urlparse(trimmed)
        if "://" in trimmed
        else urlparse(urljoin(COMUNIDADE_ORIGIN, trimmed))
    )
    if parsed.netloc and parsed.netloc != urlparse(COMUNIDADE_ORIGIN).netloc:
        raise ValueError(f"URL deve ser de {COMUNIDADE_ORIGIN}")
    path = parsed.path if parsed.path.endswith("/") else f"{parsed.path}/"
    if not re.match(r"^/topic/\d+", path, re.I):
        raise ValueError("Informe URL de tópico, ex.: /topic/43093-slug/")
    return urljoin(COMUNIDADE_ORIGIN, path)


def parse_topic(page: Any, topic_url: str) -> dict[str, Any]:
    title = (
        page.css('meta[property="og:title"]::attr(content)').get()
        or page.css("h1::text").get()
        or "Tópico sem título"
    )
    forum_link = page.css('a[href*="/forum/"]')
    forum_name = forum_link.css("::text").get() if forum_link else None
    forum_href = forum_link.css("::attr(href)").get() if forum_link else None

    posts: list[dict[str, Any]] = []
    for article in page.css("article[id^='elComment_']"):
        comment_id = article.attrib.get("id", "").replace("elComment_", "")
        author = article.css(".cAuthorPane_author a::text").get()
        author_url = article.css(".cAuthorPane_author a::attr(href)").get()
        group = article.css('li[data-role="group"]::text').get()
        date = article.css("time::attr(datetime)").get()
        date_label = article.css("time::text").get()
        content_node = article.css('[data-role="commentContent"]')
        if not content_node:
            content_node = article.css(".ipsType_richText")
        content_html = content_node.get() if content_node else ""
        content = decode_entities(strip_html(content_html or ""))

        posts.append(
            {
                "id": int(comment_id) if comment_id.isdigit() else comment_id,
                "author": decode_entities(strip_html(author or "Desconhecido")),
                "authorUrl": author_url,
                "group": decode_entities(strip_html(group)) if group else None,
                "isTimeAuvp": bool(
                    group
                    and group.strip().lower().startswith("time auvp")
                ),
                "isModerator": bool(
                    article.css(".cAuthorPane_badge--moderator")
                    or "moderador" in (article.get_all_text() or "").lower()
                ),
                "date": date,
                "dateLabel": decode_entities(strip_html(date_label))
                if date_label
                else None,
                "content": content,
                "isOriginalPost": len(posts) == 0,
                "url": f"{topic_url.rstrip('/')}/?do=findComment&comment={comment_id}",
            }
        )

    return {
        "title": decode_entities(strip_html(title)),
        "url": topic_url,
        "forum": decode_entities(strip_html(forum_name)) if forum_name else None,
        "forumUrl": urljoin(COMUNIDADE_ORIGIN, forum_href) if forum_href else None,
        "replyCount": max(len(posts) - 1, 0),
        "posts": posts,
    }


def resolve_page_url(site: str, path: str) -> str:
    base = {
        "analitica": ANALITICA_ORIGIN,
        "financas": FINANCAS_ORIGIN,
    }[site]
    trimmed = path.strip()
    if trimmed.startswith("http"):
        return trimmed
    if not trimmed.startswith("/"):
        trimmed = f"/{trimmed}"
    return urljoin(base, trimmed)


def resolve_api_url(path: str) -> str:
    trimmed = path.strip()
    if trimmed.startswith("http"):
        return trimmed
    if not trimmed.startswith("/"):
        trimmed = f"/{trimmed}"
    return urljoin(FINANCAS_API, trimmed)


def default_output_path(site: str, ext: str) -> Path:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR / f"{site}-{ts}.{ext}"


def write_output(path: Path, content: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


def scrape_comunidade_topic(url: str, output: Path | None) -> Path:
    from scrapling.fetchers import Fetcher

    topic_url = normalize_topic_url(url)
    page = Fetcher.get(
        topic_url,
        headers=headers_for_site("comunidade"),
        impersonate="chrome",
        stealthy_headers=True,
    )
    data = parse_topic(page, topic_url)
    out = output or default_output_path("comunidade-topic", "json")
    write_output(out, json.dumps(data, indent=2, ensure_ascii=False))
    return out


def scrape_page(site: str, path: str, fmt: str, output: Path | None) -> Path:
    from scrapling.fetchers import DynamicFetcher

    url = resolve_page_url(site, path)
    page = DynamicFetcher.fetch(
        url,
        headers=headers_for_site(site),  # type: ignore[arg-type]
        headless=True,
        network_idle=True,
    )
    ext = fmt
    out = output or default_output_path(site, ext)
    if fmt == "json":
        payload = {
            "url": url,
            "title": page.css("title::text").get(),
            "text": page.get_all_text(),
        }
        write_output(out, json.dumps(payload, indent=2, ensure_ascii=False))
    elif fmt == "md":
        try:
            from markdownify import markdownify

            html = page.html_content or ""
            write_output(out, markdownify(html))
        except Exception:
            write_output(out, page.get_all_text() or "")
    else:
        write_output(out, page.html_content or "")
    return out


def scrape_financas_api(path: str, output: Path | None) -> Path:
    from scrapling.fetchers import Fetcher

    url = resolve_api_url(path)
    page = Fetcher.get(
        url,
        headers=headers_for_site("financas_api"),
        impersonate="chrome",
        stealthy_headers=True,
    )
    out = output or default_output_path("financas-api", "json")
    try:
        payload = page.json()
        write_output(out, json.dumps(payload, indent=2, ensure_ascii=False))
    except Exception:
        write_output(out, page.body or "")
    return out


def scrape_api_contract(site: str, path: str, output: Path | None) -> Path:
    """Registra apenas status e shape; nunca persiste o corpo autenticado."""
    from scrapling.fetchers import Fetcher

    base = {"carteira": CARTEIRA_API, "dicionario": DICIONARIO_API}[site]
    url = urljoin(base, path if path.startswith("/") else f"/{path}")
    page = Fetcher.get(
        url,
        headers=headers_for_site(site),  # type: ignore[arg-type]
        impersonate="chrome",
        stealthy_headers=True,
    )
    payload: dict[str, Any] = {
        "site": site,
        "method": "GET",
        "url": url,
        "status": page.status,
        "capturedAt": datetime.now(timezone.utc).isoformat(),
    }
    try:
        body = page.json()
        if isinstance(body, dict):
            payload["responseKeys"] = sorted(body.keys())
            for key, value in body.items():
                if isinstance(value, list):
                    payload.setdefault("arrays", {})[key] = {
                        "length": len(value),
                        "itemKeys": sorted(value[0].keys())
                        if value and isinstance(value[0], dict)
                        else [],
                    }
        elif isinstance(body, list):
            payload["responseType"] = "array"
            payload["length"] = len(body)
            payload["itemKeys"] = (
                sorted(body[0].keys()) if body and isinstance(body[0], dict) else []
            )
    except Exception:
        payload["bodyBytes"] = len(page.body or page.html_content or "")
    out = output or default_output_path(f"{site}-contract", "json")
    write_output(out, json.dumps(payload, indent=2, ensure_ascii=False))
    return out


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Raspagem AUVP com Scrapling")
    sub = parser.add_subparsers(dest="command", required=True)

    comunidade = sub.add_parser("comunidade", help="Comunidade AUVP")
    comunidade_sub = comunidade.add_subparsers(dest="action", required=True)
    topic = comunidade_sub.add_parser("topic", help="Extrair tópico")
    topic.add_argument("url", help="URL ou path do tópico")
    topic.add_argument("-o", "--output", type=Path)

    analitica = sub.add_parser("analitica", help="Analítica AUVP")
    analitica_sub = analitica.add_subparsers(dest="action", required=True)
    analitica_page = analitica_sub.add_parser("page", help="Página HTML/SPA")
    analitica_page.add_argument("path", nargs="?", default="/")
    analitica_page.add_argument(
        "--format", choices=("md", "html", "json"), default="md"
    )
    analitica_page.add_argument("-o", "--output", type=Path)

    financas = sub.add_parser("financas", help="Finanças AUVP")
    financas_sub = financas.add_subparsers(dest="action", required=True)
    financas_page = financas_sub.add_parser("page", help="UI Finanças")
    financas_page.add_argument("path", nargs="?", default="/")
    financas_page.add_argument(
        "--format", choices=("md", "html", "json"), default="md"
    )
    financas_page.add_argument("-o", "--output", type=Path)
    financas_api = financas_sub.add_parser("api", help="API JSON")
    financas_api.add_argument("path", help="Path da API, ex.: /users/profile")
    financas_api.add_argument("-o", "--output", type=Path)

    for site in ("carteira", "dicionario"):
        product = sub.add_parser(site, help=f"Contrato GET sanitizado ({site})")
        product.add_argument("path", help="Path da API")
        product.add_argument("-o", "--output", type=Path)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        if args.command == "comunidade" and args.action == "topic":
            out = scrape_comunidade_topic(args.url, args.output)
        elif args.command == "analitica" and args.action == "page":
            out = scrape_page("analitica", args.path, args.format, args.output)
        elif args.command == "financas" and args.action == "page":
            out = scrape_page("financas", args.path, args.format, args.output)
        elif args.command == "financas" and args.action == "api":
            out = scrape_financas_api(args.path, args.output)
        elif args.command in {"carteira", "dicionario"}:
            out = scrape_api_contract(args.command, args.path, args.output)
        else:
            parser.error("Comando não suportado")
            return 1
    except Exception as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        return 1

    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
