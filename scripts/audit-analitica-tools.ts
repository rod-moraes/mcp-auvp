#!/usr/bin/env tsx
/**
 * Auditoria completa das tools Analítica: resposta, shape e filtros.
 * Usa o mesmo registry do MCP (callAuvpTool).
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { syncAnaliticaCookieFromDisk } from "../src/analitica/cookies.js";
import { analiticaToolDefinitions } from "../src/analitica/tools.js";
import { AuvpFinancasClient } from "../src/core/http-client.js";
import { callAuvpTool } from "../src/mcp/registry.js";
import type { ToolResult } from "../src/mcp/tool-utils.js";
import { syncBearerTokenFromDisk } from "../src/auth/storage.js";

const ANALITICA_TEST_LIMIT = 20;

interface AuditCase {
  label: string;
  tool: string;
  args: Record<string, unknown>;
  validate: (payload: unknown) => string | null;
}

interface AuditResult {
  tool: string;
  label: string;
  ok: boolean;
  durationMs: number;
  error?: string;
  validationError?: string;
  sample?: unknown;
}

function parsePayload(result: ToolResult): unknown {
  const first = result.content[0];
  if (first?.type !== "text") return undefined;
  try {
    return JSON.parse(first.text) as unknown;
  } catch {
    return first.text;
  }
}

function hasKeys(obj: unknown, keys: string[]): boolean {
  if (!obj || typeof obj !== "object") return false;
  const record = obj as Record<string, unknown>;
  return keys.every((k) => k in record);
}

function nonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function extractUserId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const r = payload as Record<string, unknown>;
  const id = r.id ?? r.userId;
  if (typeof id === "string" || typeof id === "number") return String(id);
  if (r.me != null) return extractUserId(r.me);
  if (r.data != null) return extractUserId(r.data);
  return undefined;
}

function extractCode(payload: unknown): string | undefined {
  if (!payload) return undefined;
  if (Array.isArray(payload)) {
    for (const e of payload) {
      const c = extractCode(e);
      if (c) return c;
    }
    return undefined;
  }
  if (typeof payload !== "object") return undefined;
  const r = payload as Record<string, unknown>;
  const code = r.code ?? r.ticker ?? r.symbol;
  if (typeof code === "string" && code.trim()) return code.trim().toUpperCase();
  for (const v of Object.values(r)) {
    const nested = extractCode(v);
    if (nested) return nested;
  }
  return undefined;
}

async function discoverContext(client: AuvpFinancasClient): Promise<{
  userId?: string;
  code: string;
  fiiCode: string;
}> {
  const me = parsePayload(await callAuvpTool(client, "auvp_analitica_get_me", {}));
  const userId = extractUserId(me);
  const most = parsePayload(
    await callAuvpTool(client, "auvp_analitica_list_most_viewed", {
      companyType: "BRA:stock",
      limit: ANALITICA_TEST_LIMIT,
    }),
  );
  const code = extractCode(most) ?? "PETR4";
  return { userId, code, fiiCode: "HGLG11" };
}

function buildCases(ctx: {
  userId?: string;
  code: string;
  fiiCode: string;
}): AuditCase[] {
  const { userId, code, fiiCode } = ctx;
  const pagePath = `/acoes/${code}`;

  const cases: AuditCase[] = [
    {
      label: "catálogo",
      tool: "auvp_analitica_list_observed_routes",
      args: {},
      validate: (p) =>
        hasKeys(p, ["apiRoutes", "pageRoutes"]) ? null : "faltam apiRoutes/pageRoutes",
    },
    {
      label: "sessão",
      tool: "auvp_analitica_get_session",
      args: {},
      validate: (p) => (hasKeys(p, ["id"]) ? null : "falta id"),
    },
    {
      label: "perfil",
      tool: "auvp_analitica_get_me",
      args: {},
      validate: (p) =>
        extractUserId(p) ? null : "userId não encontrado em get_me",
    },
    {
      label: "premium",
      tool: "auvp_analitica_is_premium",
      args: {},
      validate: (p) =>
        hasKeys(p, ["isPremium"]) ? null : "falta isPremium",
    },
    {
      label: "feature flags",
      tool: "auvp_analitica_get_feature_flags",
      args: {},
      validate: (p) =>
        hasKeys(p, ["enabledFlags"]) ? null : "falta enabledFlags",
    },
    {
      label: "live video",
      tool: "auvp_analitica_get_live_video_status",
      args: {},
      validate: (p) =>
        hasKeys(p, ["inLive"]) ? null : "falta inLive",
    },
    {
      label: "onboard start",
      tool: "auvp_analitica_get_onboard_start",
      args: {},
      validate: (p) =>
        hasKeys(p, ["status"]) ? null : "falta status",
    },
    {
      label: "onboard scope=rankings",
      tool: "auvp_analitica_get_onboard",
      args: { scope: "rankings" },
      validate: (p) =>
        hasKeys(p, ["onboardStep"]) ? null : "falta onboardStep",
    },
    {
      label: "onboard scope=asset_page (filtro)",
      tool: "auvp_analitica_get_onboard",
      args: { scope: "asset_page" },
      validate: (p) =>
        hasKeys(p, ["onboardStep"]) ? null : "falta onboardStep",
    },
    {
      label: "subscriptions",
      tool: "auvp_analitica_list_subscriptions",
      args: {},
      validate: (p) =>
        hasKeys(p, ["subscriptions"]) ? null : "falta subscriptions",
    },
    {
      label: "subscription status",
      tool: "auvp_analitica_get_subscription_status",
      args: {},
      validate: (p) =>
        hasKeys(p, ["subscription"]) || hasKeys(p, ["error"])
          ? null
          : "falta subscription ou error",
    },
    {
      label: "notifications",
      tool: "auvp_analitica_list_notifications",
      args: {},
      validate: (p) =>
        hasKeys(p, ["notifications"]) ? null : "falta notifications",
    },
    ...(userId
      ? ([
          {
            label: "user by id",
            tool: "auvp_analitica_get_user",
            args: { userId },
            validate: (p: unknown) =>
              extractUserId(p) === userId ? null : "userId diverge",
          },
          {
            label: "last answer feedback",
            tool: "auvp_analitica_get_last_answer_feedback",
            args: { userId },
            validate: () => null,
          },
        ] as AuditCase[])
      : []),
    {
      label: `views limit=${ANALITICA_TEST_LIMIT}`,
      tool: "auvp_analitica_list_views",
      args: { limit: ANALITICA_TEST_LIMIT },
      validate: (p) =>
        Array.isArray(p) && p.length <= ANALITICA_TEST_LIMIT
          ? null
          : `esperado até ${ANALITICA_TEST_LIMIT} itens`,
    },
    {
      label: `most-viewed BRA:stock limit=${ANALITICA_TEST_LIMIT}`,
      tool: "auvp_analitica_list_most_viewed",
      args: { companyType: "BRA:stock", limit: ANALITICA_TEST_LIMIT },
      validate: (p) =>
        nonEmptyArray(p) || (p && typeof p === "object")
          ? null
          : "resposta vazia",
    },
    {
      label: "rank codes blue",
      tool: "auvp_analitica_rank_codes_by_rating",
      args: {
        ratingType: "blue",
        limit: ANALITICA_TEST_LIMIT,
        page: 1,
        type: "stock",
      },
      validate: (p) =>
        hasKeys(p, ["data"]) ? null : "falta data",
    },
    {
      label: "rank codes green (filtro)",
      tool: "auvp_analitica_rank_codes_by_rating",
      args: {
        ratingType: "green",
        limit: ANALITICA_TEST_LIMIT,
        page: 1,
        type: "stock",
      },
      validate: (p) =>
        hasKeys(p, ["data"]) ? null : "falta data",
    },
    {
      label: "home ranking",
      tool: "auvp_analitica_get_home_ranking",
      args: {
        companyType: "stock",
        country: "BRA",
        rankingType: "dividend_yield",
      },
      validate: (p) =>
        hasKeys(p, ["data"]) ? null : "falta data",
    },
    {
      label: `ranking page 1 limit ${ANALITICA_TEST_LIMIT}`,
      tool: "auvp_analitica_get_ranking",
      args: {
        segment: "acoes",
        rankingType: "dividend_yield",
        page: 1,
        limit: ANALITICA_TEST_LIMIT,
      },
      validate: (p) => {
        if (!p || typeof p !== "object") return "payload inválido";
        const r = p as Record<string, unknown>;
        if (!nonEmptyArray(r.data)) return "data vazio";
        if (!hasKeys(r, ["pagination"])) return "falta pagination";
        return null;
      },
    },
    {
      label: `ranking page 2 limit ${ANALITICA_TEST_LIMIT}`,
      tool: "auvp_analitica_get_ranking",
      args: {
        segment: "acoes",
        rankingType: "dividend_yield",
        page: 2,
        limit: ANALITICA_TEST_LIMIT,
      },
      validate: (p) => {
        if (!p || typeof p !== "object") return "payload inválido";
        const r = p as Record<string, unknown>;
        return nonEmptyArray(r.data) ? null : "data vazio na página 2";
      },
    },
    {
      label: `code ${code}`,
      tool: "auvp_analitica_get_code",
      args: { code },
      validate: (p) =>
        hasKeys(p, ["symbol", "name"]) ? null : "falta symbol/name",
    },
    {
      label: "quotes period=1y",
      tool: "auvp_analitica_get_quotes",
      args: { ticker: code, period: "1y" },
      validate: (p) => (p != null ? null : "quotes vazio"),
    },
    {
      label: "quotes period=1m (filtro)",
      tool: "auvp_analitica_get_quotes",
      args: { ticker: code, period: "1m" },
      validate: (p) => (p != null ? null : "quotes vazio"),
    },
    {
      label: "balance ativo_total",
      tool: "auvp_analitica_get_balance",
      args: { codes: code, indicators: "ativo_total", frequency: "annual" },
      validate: (p) => (p != null ? null : "balance vazio"),
    },
    {
      label: "dres receita_liquida",
      tool: "auvp_analitica_get_dres",
      args: { asset: code, dre: "receita_liquida", period: "5Y" },
      validate: (p) => (p != null ? null : "dres vazio"),
    },
    {
      label: "dividends period=5",
      tool: "auvp_analitica_get_dividends",
      args: { aggregate: true, code, period: "5" },
      validate: (p) =>
        hasKeys(p, ["data", "dividends"]) ? null : "falta data/dividends",
    },
    {
      label: "share-holders",
      tool: "auvp_analitica_get_share_holders",
      args: { ticker: code },
      validate: (p) => (p != null ? null : "share-holders vazio"),
    },
    {
      label: "reviews",
      tool: "auvp_analitica_get_reviews",
      args: { code },
      validate: () => null,
    },
    {
      label: "documents page=1 (pode ser [])",
      tool: "auvp_analitica_get_documents",
      args: { code, page: 1 },
      validate: (p) =>
        Array.isArray(p) || hasKeys(p, ["data", "total"])
          ? null
          : "formato inesperado",
    },
    {
      label: "documents com from/to (filtro)",
      tool: "auvp_analitica_get_documents",
      args: {
        code: "PETR4",
        page: 1,
        from: "2025-06-01",
        to: "2026-06-11",
      },
      validate: (p) =>
        Array.isArray(p) || hasKeys(p, ["data", "total"])
          ? null
          : "formato inesperado",
    },
    {
      label: "alerts",
      tool: "auvp_analitica_get_alerts",
      args: { asset: code },
      validate: () => null,
    },
    {
      label: "favorites",
      tool: "auvp_analitica_list_favorites",
      args: {},
      validate: () => null,
    },
    {
      label: "assets-config BRA:stock",
      tool: "auvp_analitica_get_assets_config",
      args: { companyType: "BRA:stock", countryType: "BRA" },
      validate: (p) => (p != null ? null : "assets-config vazio"),
    },
    {
      label: "asset tooltip",
      tool: "auvp_analitica_get_asset_tooltip",
      args: { code },
      validate: (p) => (p != null ? null : "tooltip vazio"),
    },
    {
      label: "credits",
      tool: "auvp_analitica_get_credits",
      args: {},
      validate: (p) =>
        hasKeys(p, ["assets", "tools"]) ? null : "falta assets/tools",
    },
    {
      label: "currency USD",
      tool: "auvp_analitica_get_currency_quote",
      args: { currency: "USD" },
      validate: (p) =>
        hasKeys(p, ["quote"]) ? null : "falta quote",
    },
    {
      label: "currency EUR (filtro)",
      tool: "auvp_analitica_get_currency_quote",
      args: { currency: "EUR" },
      validate: (p) =>
        hasKeys(p, ["quote"]) ? null : "falta quote",
    },
    {
      label: "indices quotes",
      tool: "auvp_analitica_list_indices_quotes",
      args: {},
      validate: (p) =>
        nonEmptyArray(p) ? null : "lista de índices vazia",
    },
    {
      label: "rates CDI/Selic",
      tool: "auvp_analitica_list_rates",
      args: {},
      validate: (p) =>
        hasKeys(p, ["cdi", "selic"]) ? null : "falta cdi/selic",
    },
    {
      label: "news page 1",
      tool: "auvp_analitica_list_news",
      args: { asset: code, page: 1 },
      validate: (p) =>
        hasKeys(p, ["data", "total"]) ? null : "falta data/total",
    },
    {
      label: "news categories",
      tool: "auvp_analitica_list_news_categories",
      args: {},
      validate: (p) => (p != null ? null : "categories vazio"),
    },
    {
      label: "videos page 1",
      tool: "auvp_analitica_list_videos",
      args: { asset: code, page: 1 },
      validate: (p) =>
        hasKeys(p, ["videos", "count"]) ? null : "falta videos/count",
    },
    {
      label: "pay-wall",
      tool: "auvp_analitica_get_pay_wall",
      args: {},
      validate: (p) =>
        hasKeys(p, ["pages"]) ? null : "falta pages",
    },
    {
      label: "rentability 1y",
      tool: "auvp_analitica_get_rentability",
      args: { ticker: code, period: "1y" },
      validate: (p) =>
        hasKeys(p, ["rentability", "evolution"]) ? null : "falta rentability",
    },
    {
      label: "rentability config",
      tool: "auvp_analitica_get_rentability_config",
      args: { ticker: code },
      validate: (p) =>
        hasKeys(p, ["min_year"]) ? null : "falta min_year",
    },
    {
      label: `fii-summary ${fiiCode}`,
      tool: "auvp_analitica_get_fii_summary",
      args: { ticker: fiiCode },
      validate: (p) =>
        hasKeys(p, ["items"]) ? null : "falta items",
    },
    {
      label: "codes/dres comparador",
      tool: "auvp_analitica_get_codes_dres",
      args: { from: "2021", to: "2026", key: "lucro_liquido" },
      validate: (p) => (p != null ? null : "codes/dres vazio"),
    },
    {
      label: "column-templates balance-stock",
      tool: "auvp_analitica_get_column_templates",
      args: { type: "balance-stock" },
      validate: (p) =>
        hasKeys(p, ["templates"]) ? null : "falta templates",
    },
    {
      label: `page route ${pagePath}`,
      tool: "auvp_analitica_get_page_route",
      args: { path: pagePath },
      validate: (p) => {
        if (!hasKeys(p, ["path", "text"])) return "falta path/text";
        const text = (p as Record<string, unknown>).text;
        return typeof text === "string" && text.length > 100
          ? null
          : "HTML/RSC muito curto";
      },
    },
  ];

  const defined = new Set(analiticaToolDefinitions.map((t) => t.name));
  return cases.filter((c) => defined.has(c.tool));
}

async function runCase(
  client: AuvpFinancasClient,
  testCase: AuditCase,
): Promise<AuditResult> {
  const started = Date.now();
  try {
    const result = await callAuvpTool(client, testCase.tool, testCase.args);
    const durationMs = Date.now() - started;
    if (result.isError) {
      const err =
        result.content[0]?.type === "text"
          ? result.content[0].text
          : "erro MCP";
      return {
        tool: testCase.tool,
        label: testCase.label,
        ok: false,
        durationMs,
        error: err,
      };
    }
    const payload = parsePayload(result);
    const validationError = testCase.validate(payload);
    const sample =
      payload && typeof payload === "object"
        ? JSON.stringify(payload).slice(0, 200)
        : String(payload).slice(0, 200);
    return {
      tool: testCase.tool,
      label: testCase.label,
      ok: !validationError,
      durationMs,
      validationError: validationError ?? undefined,
      sample,
    };
  } catch (error) {
    return {
      tool: testCase.tool,
      label: testCase.label,
      ok: false,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  const client = new AuvpFinancasClient();
  syncBearerTokenFromDisk(client);
  syncAnaliticaCookieFromDisk(client);

  if (!client.getBearerToken() || !client.getAnaliticaCookieHeader()) {
    console.error("Auth incompleta. Execute auvp_ensure_auth.");
    process.exit(1);
  }

  const ctx = await discoverContext(client);
  const cases = buildCases(ctx);
  const results: AuditResult[] = [];

  console.log(
    `Auditoria Analítica — ${cases.length} casos (code=${ctx.code}, userId=${ctx.userId ?? "n/a"})\n`,
  );

  for (const testCase of cases) {
    const result = await runCase(client, testCase);
    results.push(result);
    const status = result.ok ? "OK" : "FALHA";
    const detail = result.error ?? result.validationError ?? "";
    console.log(
      `[${status}] ${testCase.tool} — ${testCase.label} (${result.durationMs}ms)${detail ? ` — ${detail}` : ""}`,
    );
  }

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok);
  const report = {
    auditedAt: new Date().toISOString(),
    context: ctx,
    summary: { total: results.length, ok, fail: fail.length },
    results,
  };

  const out = resolve("data/analitica-tools-audit.json");
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\nRelatório: ${out}`);
  console.log(`Resumo: ${ok}/${results.length} ok`);

  if (fail.length > 0) {
    console.log("\nFalhas:");
    for (const f of fail) {
      console.log(`- ${f.tool} (${f.label}): ${f.error ?? f.validationError}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
