#!/usr/bin/env python3
"""Descobre endpoints AUVP (Finanças, Analítica, Comunidade) para o MCP."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlencode, urljoin, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))

from auvp_auth import (  # noqa: E402
    ANALITICA_ORIGIN,
    BROWSER_PROFILE_DIR,
    COMUNIDADE_ORIGIN,
    FINANCAS_API,
    FINANCAS_ORIGIN,
    headers_for_site,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "data" / "endpoint-discovery"

SITE_CONFIG: dict[str, dict[str, str]] = {
    "financas": {
        "base": FINANCAS_ORIGIN,
        "headers": "financas",
        "xhr_regex": r"financas-api\.auvp\.com\.br/",
        "host_filter": "financas-api.auvp.com.br",
    },
    "analitica": {
        "base": ANALITICA_ORIGIN,
        "headers": "analitica",
        "xhr_regex": r"analitica\.auvp\.com\.br/api/",
        "host_filter": "analitica.auvp.com.br",
    },
    "comunidade": {
        "base": COMUNIDADE_ORIGIN,
        "headers": "comunidade",
        "xhr_regex": r"comunidade\.auvp\.com\.br/",
        "host_filter": "comunidade.auvp.com.br",
    },
}

PROBE_SITES = {
    "financas_api": {"base": FINANCAS_API, "headers": "financas_api"},
    "analitica": {"base": ANALITICA_ORIGIN, "headers": "analitica"},
    "comunidade": {"base": COMUNIDADE_ORIGIN, "headers": "comunidade"},
}

FINANCAS_PAGE_ROUTES = [
    "/dashboard/home",
    "/dashboard/transactions",
    "/dashboard/budget",
    "/dashboard/general-accounts",
    "/dashboard/goals",
    "/dashboard/invoices",
    "/dashboard/tags",
    "/settings/profile",
    "/settings/categories",
    "/settings/types",
]

ANALITICA_PAGE_ROUTES = [
    "/",
    "/acoes",
    "/acoes/PETR4",
    "/acoes/agenda-de-dividendos",
    "/acoes/busca-avancada",
    "/acoes/comparar",
    "/acoes/previsao-de-dividendos",
    "/agenda-de-resultados",
    "/ativos/PETR4",
    "/busca-avancada",
    "/calculadoras",
    "/etfs",
    "/fiiagros",
    "/fiis",
    "/fiis/HGLG11",
    "/indices",
    "/noticias",
    "/rankings",
    "/rankings/acoes/dividend_yield",
    "/rankings/stocks/market_cap",
    "/reits",
    "/renda-fixa",
    "/simulador-de-rentabilidade",
    "/stocks",
    "/stocks/AAPL",
]

ANALITICA_PROBE_PATHS = [
    "/api/session",
    "/api/feature-flags/user",
    "/api/videos/in-live",
    "/api/auth/is-premium",
    "/api/auth/me",
    "/api/onboard/start",
    "/api/onboard",
    "/api/subscriptions",
    "/api/subscriptions/status",
    "/api/notifications",
    "/api/views",
    "/api/views/most-viewed",
    "/api/codes",
    "/api/codes/ranked-by-rating",
    "/api/favorites/list",
    "/api/assets-config",
    "/api/search",
    "/api/search/codes",
    "/api/indicators",
    "/api/indices",
    "/api/news",
    "/api/calendar",
    "/api/calendar/dividends",
    "/api/calendar/results",
    "/api/rankings",
    "/api/rankings/types",
    "/api/compare",
    "/api/simulator",
    "/api/fixed-income",
    "/api/segments",
    "/api/companies",
    "/api/companies/search",
    "/api/watchlist",
    "/api/watchlist/list",
    "/api/portfolio",
    "/api/portfolio/list",
    "/api/etf",
    "/api/etf/list",
    "/api/fii",
    "/api/fii/list",
    "/api/stock",
    "/api/stock/list",
    "/api/reit",
    "/api/reit/list",
    "/api/agenda",
    "/api/agenda/dividends",
    "/api/agenda/results",
    "/api/calculators",
    "/api/calculators/list",
    "/api/analysis",
    "/api/analysis/list",
    "/api/viability",
    "/api/viability/:ticker",
    "/api/ratings",
    "/api/ratings/:ticker",
    "/api/sectors",
    "/api/sectors/list",
    "/api/market",
    "/api/market/indices",
    "/api/market/summary",
    "/api/bff",
]

COMUNIDADE_PAGE_ROUTES = [
    "/",
    "/forums/",
    "/search/",
    "/?forumId=12",
    "/?forumId=61",
    "/forum/61-devs-projetos/",
    "/topic/43093-empreender-agora-ou-esperar/",
    "/profile/20109-eddy-paulini/",
]

COMUNIDADE_PROBE_PATHS = [
    ("/search/", "q=tesouro&type=forums_topic&sortby=relevancy"),
    ("/search/", "q=tesouro&type=forums_topic&page=2"),
    ("/notifications/", None),
    (
        "/index.php",
        "app=core&module=system&controller=ajax&do=topContributors&time=week&limit=5&orientation=vertical",
    ),
    (
        "/index.php",
        "app=core&module=system&controller=ajax&do=mostSolved&time=month&limit=5&orientation=vertical",
    ),
    ("/", "forumId=61"),
    ("/forums/", None),
    ("/api/core/hello", None),
]

FINANCAS_PROBE_PATHS = [
    "/users/profile",
    "/users",
    "/accounts",
    "/accounts/lastTransactions",
    "/transactions",
    "/transactions/export",
    "/dashboard",
    "/dashboard/cashflow",
    "/budgets",
    "/budgets/monthly",
    "/budgets/summary",
    "/categories",
    "/categories/tree",
    "/user-categories",
    "/tags",
    "/banks",
    "/bridge/status",
    "/auth/validate-token",
    "/auth/refresh-token",
]


def now_slug() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def write_report(name: str, payload: dict[str, Any]) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / f"{name}-{now_slug()}.json"
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def summarize_response(resp: Any) -> dict[str, Any]:
    url = str(getattr(resp, "url", ""))
    parsed = urlparse(url) if url else None
    entry: dict[str, Any] = {
        "status": getattr(resp, "status", None),
    }
    if parsed:
        entry["url"] = url
        entry["host"] = parsed.netloc
        entry["path"] = parsed.path
        entry["query"] = parse_qs(parsed.query)

    try:
        body = resp.json()
        if isinstance(body, dict):
            entry["responseKeys"] = list(body.keys())
            if "data" in body:
                data = body["data"]
                entry["dataType"] = (
                    "object" if isinstance(data, dict) else f"array[{len(data)}]"
                    if isinstance(data, list) else type(data).__name__
                )
            if "content" in body and isinstance(body["content"], str):
                entry["contentHtmlBytes"] = len(body["content"])
    except Exception:
        text = getattr(resp, "body", None) or getattr(resp, "html_content", None) or ""
        preview = str(text)[:300]
        if preview:
            entry["bodyPreview"] = preview
            entry["bodyBytes"] = len(str(text))
    return entry


def dynamic_fetch_kwargs(site: str) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "headers": headers_for_site(SITE_CONFIG[site]["headers"]),  # type: ignore[arg-type]
        "headless": True,
        "network_idle": True,
    }
    if site == "financas" and BROWSER_PROFILE_DIR.is_dir():
        kwargs["user_data_dir"] = str(BROWSER_PROFILE_DIR)
        kwargs["real_chrome"] = True
    return kwargs


def discover_page(site: str, path: str) -> Path:
    from scrapling.fetchers import DynamicFetcher

    cfg = SITE_CONFIG[site]
    url = urljoin(cfg["base"], path if path.startswith("/") else f"/{path}")

    page = DynamicFetcher.fetch(
        url,
        capture_xhr=cfg["xhr_regex"],
        **dynamic_fetch_kwargs(site),
    )

    endpoints: list[dict[str, Any]] = []
    seen: set[str] = set()
    host_filter = cfg["host_filter"]

    for resp in page.captured_xhr:
        summary = summarize_response(resp)
        resp_url = summary.get("url", "")
        if host_filter not in resp_url:
            continue
        key = f"{summary.get('status')} {summary.get('path')} {summary.get('query')}"
        if key in seen:
            continue
        seen.add(key)
        endpoints.append(summary)

    report = {
        "kind": "xhr_capture",
        "product": site,
        "pageUrl": url,
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "endpointCount": len(endpoints),
        "endpoints": endpoints,
    }
    out = write_report(f"{site}-xhr", report)
    print(out)
    return out


def probe_endpoint(
    site: str,
    method: str,
    path: str,
    query: str | None,
) -> Path:
    from scrapling.fetchers import Fetcher

    if site not in PROBE_SITES:
        raise ValueError(f"site deve ser um de: {', '.join(PROBE_SITES)}")

    cfg = PROBE_SITES[site]
    url = urljoin(cfg["base"], path if path.startswith("/") else f"/{path}")
    if query:
        params = parse_qs(query, keep_blank_values=True)
        flat = {k: v[0] if len(v) == 1 else v for k, v in params.items()}
        url = f"{url}?{urlencode(flat)}"

    headers = headers_for_site(cfg["headers"])  # type: ignore[arg-type]
    method_upper = method.upper()
    kwargs = {
        "headers": headers,
        "impersonate": "chrome",
        "stealthy_headers": True,
    }

    if method_upper == "GET":
        resp = Fetcher.get(url, **kwargs)
    elif method_upper == "POST":
        resp = Fetcher.post(url, json={}, **kwargs)
    elif method_upper == "PATCH":
        resp = Fetcher.patch(url, json={}, **kwargs)
    elif method_upper == "DELETE":
        resp = Fetcher.delete(url, **kwargs)
    else:
        raise ValueError(f"Método não suportado: {method}")

    summary = summarize_response(resp)
    summary["method"] = method_upper
    summary["requestUrl"] = url

    report = {
        "kind": "probe",
        "product": site,
        "probedAt": datetime.now(timezone.utc).isoformat(),
        "result": summary,
    }
    out = write_report(f"probe-{site}", report)
    print(out)
    return out


def discover_financas_all() -> Path:
    """XHR em todas as páginas SPA + probe dos endpoints REST conhecidos."""
    import re
    from urllib.parse import urljoin

    all_xhr: dict[str, dict[str, Any]] = {}
    host_filter = SITE_CONFIG["financas"]["host_filter"]

    for route in FINANCAS_PAGE_ROUTES:
        print(f"XHR {route}...", flush=True)
        try:
            out = discover_page("financas", route)
            report = json.loads(out.read_text(encoding="utf-8"))
            for entry in report.get("endpoints", []):
                path = entry.get("path", "")
                key = f"{entry.get('status')} {path}"
                if key not in all_xhr:
                    all_xhr[key] = {**entry, "fromPages": [route]}
                elif route not in all_xhr[key].get("fromPages", []):
                    all_xhr[key]["fromPages"].append(route)
        except Exception as exc:
            print(f"  erro em {route}: {exc}", flush=True)

    probes: list[dict[str, Any]] = []
    for path in FINANCAS_PROBE_PATHS:
        print(f"Probe {path}...", flush=True)
        try:
            out = probe_endpoint("financas_api", "GET", path, None)
            report = json.loads(out.read_text(encoding="utf-8"))
            probes.append(report.get("result", {}))
        except Exception as exc:
            probes.append({"path": path, "error": str(exc)})

    # JS bundles (paths embutidos no frontend)
    js_paths: set[str] = set()
    try:
        from scrapling.fetchers import Fetcher

        index = Fetcher.get(
            FINANCAS_ORIGIN + "/",
            headers=headers_for_site("financas"),
            impersonate="chrome",
        )
        html = index.html_content or index.body or ""
        if isinstance(html, bytes):
            html = html.decode("utf-8", errors="replace")
        script_urls = list(
            dict.fromkeys(re.findall(r'src="(/_next/static/[^"]+\.js)"', html))
        )[:40]
        for su in script_urls:
            full = urljoin(FINANCAS_ORIGIN, su)
            js = Fetcher.get(
                full,
                headers=headers_for_site("financas"),
                impersonate="chrome",
            )
            text = js.body or js.html_content or ""
            if isinstance(text, bytes):
                text = text.decode("utf-8", errors="replace")
            for match in re.finditer(
                r'["\'`](/[a-zA-Z][a-zA-Z0-9/_-]{1,80})["\'`]',
                text,
            ):
                candidate = match.group(1).split("?")[0]
                if any(
                    token in candidate.lower()
                    for token in (
                        "account",
                        "transaction",
                        "budget",
                        "categor",
                        "tag",
                        "bank",
                        "bill",
                        "bridge",
                        "pluggy",
                        "dashboard",
                        "user",
                    )
                ):
                    js_paths.add(candidate)
    except Exception as exc:
        print(f"JS scan erro: {exc}", flush=True)

    payload = {
        "kind": "financas_full_discovery",
        "product": "financas",
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "xhrEndpoints": list(all_xhr.values()),
        "jsBundlePaths": sorted(js_paths),
        "probes": probes,
    }
    out = write_report("financas-full", payload)
    print(out, flush=True)
    return out


def discover_analitica_all() -> Path:
    """XHR em páginas SPA + probe REST + scan JS bundles."""
    import re
    from urllib.parse import urljoin

    all_xhr: dict[str, dict[str, Any]] = {}
    host_filter = SITE_CONFIG["analitica"]["host_filter"]

    for route in ANALITICA_PAGE_ROUTES:
        print(f"XHR {route}...", flush=True)
        try:
            out = discover_page("analitica", route)
            report = json.loads(out.read_text(encoding="utf-8"))
            for entry in report.get("endpoints", []):
                path = entry.get("path", "")
                key = f"{entry.get('status')} {path}"
                if key not in all_xhr:
                    all_xhr[key] = {**entry, "fromPages": [route]}
                elif route not in all_xhr[key].get("fromPages", []):
                    all_xhr[key]["fromPages"].append(route)
        except Exception as exc:
            print(f"  erro em {route}: {exc}", flush=True)

    probes: list[dict[str, Any]] = []
    probe_queries: dict[str, str | None] = {
        "/api/onboard": "scope=rankings",
        "/api/views": "limit=5",
        "/api/views/most-viewed": "companyType=BRA:stock&limit=5",
        "/api/codes": "code=PETR4",
        "/api/codes/ranked-by-rating": "rating_type=blue&limit=5&page=1&type=stock",
        "/api/assets-config": "companyType=BRA:stock&countryType=BRA",
        "/api/search": "q=petr",
        "/api/search/codes": "q=petr",
        "/api/companies/search": "q=petr",
    }
    for path in ANALITICA_PROBE_PATHS:
        print(f"Probe {path}...", flush=True)
        try:
            query = probe_queries.get(path)
            out = probe_endpoint("analitica", "GET", path, query)
            report = json.loads(out.read_text(encoding="utf-8"))
            probes.append(report.get("result", {}))
        except Exception as exc:
            probes.append({"path": path, "error": str(exc)})

    js_paths: set[str] = set()
    try:
        from scrapling.fetchers import Fetcher

        index = Fetcher.get(
            ANALITICA_ORIGIN + "/",
            headers=headers_for_site("analitica"),
            impersonate="chrome",
        )
        html = index.html_content or index.body or ""
        if isinstance(html, bytes):
            html = html.decode("utf-8", errors="replace")
        script_urls = list(
            dict.fromkeys(re.findall(r'src="(/_next/static/[^"]+\.js)"', html))
        )[:60]
        for su in script_urls:
            full = urljoin(ANALITICA_ORIGIN, su)
            js = Fetcher.get(
                full,
                headers=headers_for_site("analitica"),
                impersonate="chrome",
            )
            text = js.body or js.html_content or ""
            if isinstance(text, bytes):
                text = text.decode("utf-8", errors="replace")
            for match in re.finditer(
                r'["\'`](/api/[a-zA-Z0-9][a-zA-Z0-9/_-]{1,80})["\'`]',
                text,
            ):
                candidate = match.group(1).split("?")[0]
                js_paths.add(candidate)
    except Exception as exc:
        print(f"JS scan erro: {exc}", flush=True)

    payload = {
        "kind": "analitica_full_discovery",
        "product": "analitica",
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "xhrEndpoints": list(all_xhr.values()),
        "jsBundlePaths": sorted(js_paths),
        "probes": probes,
    }
    out = write_report("analitica-full", payload)
    print(out, flush=True)
    return out


def discover_comunidade_all() -> Path:
    """XHR em páginas IPS + probe de endpoints AJAX/HTML."""
    all_xhr: dict[str, dict[str, Any]] = {}

    for route in COMUNIDADE_PAGE_ROUTES:
        print(f"XHR {route}...", flush=True)
        try:
            out = discover_page("comunidade", route)
            report = json.loads(out.read_text(encoding="utf-8"))
            for entry in report.get("endpoints", []):
                path = entry.get("path", "")
                key = f"{entry.get('status')} {path}"
                if key not in all_xhr:
                    all_xhr[key] = {**entry, "fromPages": [route]}
                elif route not in all_xhr[key].get("fromPages", []):
                    all_xhr[key]["fromPages"].append(route)
        except Exception as exc:
            print(f"  erro em {route}: {exc}", flush=True)

    probes: list[dict[str, Any]] = []
    for path, query in COMUNIDADE_PROBE_PATHS:
        label = f"{path}?{query}" if query else path
        print(f"Probe {label}...", flush=True)
        try:
            out = probe_endpoint("comunidade", "GET", path, query)
            report = json.loads(out.read_text(encoding="utf-8"))
            probes.append(report.get("result", {}))
        except Exception as exc:
            probes.append({"path": path, "query": query, "error": str(exc)})

    payload = {
        "kind": "comunidade_full_discovery",
        "product": "comunidade",
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "xhrEndpoints": list(all_xhr.values()),
        "probes": probes,
    }
    out = write_report("comunidade-full", payload)
    print(out, flush=True)
    return out


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Descobre endpoints AUVP (Finanças, Analítica, Comunidade) para o MCP."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    for site in ("financas", "analitica", "comunidade"):
        cmd = sub.add_parser(site, help=f"Captura XHR ao abrir página ({site})")
        cmd.add_argument("--path", default="/", help="Rota da página")

    probe = sub.add_parser("probe", help="Probe direto de endpoint")
    probe.add_argument(
        "--site",
        required=True,
        choices=tuple(PROBE_SITES.keys()),
    )
    probe.add_argument("--method", default="GET")
    probe.add_argument("--path", required=True)
    probe.add_argument("--query", help='ex. "q=tesouro&type=forums_topic"')

    sub.add_parser(
        "financas-all",
        help="XHR em todas as páginas Finanças + probe REST + scan JS",
    )
    sub.add_parser(
        "analitica-all",
        help="XHR em páginas Analítica + probe REST + scan JS",
    )
    sub.add_parser(
        "comunidade-all",
        help="XHR em páginas Comunidade IPS + probe AJAX/HTML",
    )

    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        if args.command in SITE_CONFIG:
            discover_page(args.command, args.path)
        elif args.command == "probe":
            probe_endpoint(args.site, args.method, args.path, args.query)
        elif args.command == "financas-all":
            discover_financas_all()
        elif args.command == "analitica-all":
            discover_analitica_all()
        elif args.command == "comunidade-all":
            discover_comunidade_all()
        else:
            return 1
    except Exception as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
