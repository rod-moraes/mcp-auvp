import { AuvpApiError } from "../core/errors.js";
import type { AuvpFinancasClient } from "../core/http-client.js";
import { callAuvpTool } from "../mcp/registry.js";
import type { ToolResult } from "../mcp/tool-utils.js";
import { analiticaToolDefinitions } from "./tools.js";
import { sanitizeReportError } from "../core/report-sanitizer.js";

const DEFAULT_SAMPLE_CODE = "BBAS3";
const ANALITICA_TEST_LIMIT = 20;

export interface AnaliticaToolScanResult {
  tool: string;
  ok: boolean;
  isError: boolean;
  httpCode?: number;
  error?: string;
  durationMs: number;
  skipped?: boolean;
  skipReason?: string;
  expectedFailure?: boolean;
}

export interface AnaliticaScanContext {
  userId?: string;
  sampleCode: string;
}

export interface AnaliticaScanReport {
  scannedAt: string;
  hasToken: boolean;
  hasAnaliticaCookie: boolean;
  context: { hasUserId: boolean; sampleCode: string };
  results: AnaliticaToolScanResult[];
  summary: {
    total: number;
    ok: number;
    error: number;
    expectedError: number;
    skipped: number;
  };
}

interface ScanProbe {
  tool: string;
  args: Record<string, unknown>;
  skip?: string;
  expectedFailure?: boolean;
}

function parseHttpCode(error?: string, payload?: unknown): number | undefined {
  if (error) {
    const match = error.match(/HTTP (\d{3})/);
    if (match) {
      return Number(match[1]);
    }
  }

  if (payload && typeof payload === "object" && payload !== null) {
    const status = (payload as { status?: unknown }).status;
    if (typeof status === "number") {
      return status;
    }
    const statusCode = (payload as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === "number") {
      return statusCode;
    }
  }

  return undefined;
}

function parseToolPayload(result: ToolResult): unknown | undefined {
  const first = result.content[0];
  if (first?.type !== "text") {
    return undefined;
  }

  try {
    return JSON.parse(first.text) as unknown;
  } catch {
    return first.text;
  }
}

function extractUserId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const id = record.id ?? record.userId ?? record.user_id;
  if (typeof id === "number" || typeof id === "string") {
    return String(id);
  }

  if (record.me != null) {
    return extractUserId(record.me);
  }

  if (record.data != null) {
    return extractUserId(record.data);
  }

  return undefined;
}

function extractSampleCode(payload: unknown): string | undefined {
  if (!payload) {
    return undefined;
  }

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const code = extractSampleCode(entry);
      if (code) {
        return code;
      }
    }
    return undefined;
  }

  if (typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const code = record.code ?? record.ticker;
  if (typeof code === "string" && code.trim()) {
    return code.trim().toUpperCase();
  }

  for (const value of Object.values(record)) {
    const nested = extractSampleCode(value);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

async function discoverContext(
  client: AuvpFinancasClient,
): Promise<AnaliticaScanContext> {
  const context: AnaliticaScanContext = {
    sampleCode: DEFAULT_SAMPLE_CODE,
  };

  const meResult = await callAuvpTool(client, "auvp_analitica_get_me", {});
  const mePayload = parseToolPayload(meResult);
  const userId = extractUserId(mePayload);
  if (userId) {
    context.userId = userId;
  }

  const mostViewedResult = await callAuvpTool(
    client,
    "auvp_analitica_list_most_viewed",
    { companyType: "BRA:stock", limit: ANALITICA_TEST_LIMIT },
  );
  const mostViewedPayload = parseToolPayload(mostViewedResult);
  const sampleCode = extractSampleCode(mostViewedPayload);
  if (sampleCode) {
    context.sampleCode = sampleCode;
  }

  return context;
}

function buildProbes(context: AnaliticaScanContext): ScanProbe[] {
  const code = context.sampleCode;
  const pagePath = `/acoes/${code}`;

  const probes: ScanProbe[] = [
    { tool: "auvp_analitica_list_observed_routes", args: {} },
    { tool: "auvp_analitica_get_session", args: {} },
    { tool: "auvp_analitica_get_me", args: {} },
    { tool: "auvp_analitica_is_premium", args: {} },
    { tool: "auvp_analitica_get_feature_flags", args: {} },
    { tool: "auvp_analitica_get_live_video_status", args: {} },
    { tool: "auvp_analitica_get_onboard_start", args: {} },
    { tool: "auvp_analitica_get_onboard", args: { scope: "rankings" } },
    { tool: "auvp_analitica_list_subscriptions", args: {} },
    { tool: "auvp_analitica_get_subscription_status", args: {} },
    { tool: "auvp_analitica_list_notifications", args: {} },
    {
      tool: "auvp_analitica_get_user",
      args: { userId: context.userId ?? "" },
      skip: context.userId ? undefined : "userId indisponível em get_me",
    },
    {
      tool: "auvp_analitica_get_last_answer_feedback",
      args: { userId: context.userId ?? "" },
      skip: context.userId ? undefined : "userId indisponível em get_me",
    },
    { tool: "auvp_analitica_list_views", args: { limit: ANALITICA_TEST_LIMIT } },
    {
      tool: "auvp_analitica_list_most_viewed",
      args: { companyType: "BRA:stock", limit: ANALITICA_TEST_LIMIT },
    },
    {
      tool: "auvp_analitica_rank_codes_by_rating",
      args: {
        ratingType: "blue",
        limit: ANALITICA_TEST_LIMIT,
        page: 1,
        type: "stock",
      },
    },
    {
      tool: "auvp_analitica_get_ranking",
      args: {
        segment: "acoes",
        rankingType: "dividend_yield",
        page: 1,
        limit: ANALITICA_TEST_LIMIT,
      },
    },
    { tool: "auvp_analitica_get_code", args: { code } },
    { tool: "auvp_analitica_get_quotes", args: { ticker: code, period: "1y" } },
    {
      tool: "auvp_analitica_get_balance",
      args: { codes: code, indicators: "ativo_total", frequency: "annual" },
    },
    {
      tool: "auvp_analitica_get_dres",
      args: { asset: code, dre: "receita_liquida" },
    },
    {
      tool: "auvp_analitica_get_dividends",
      args: { aggregate: true, code, period: "5" },
    },
    { tool: "auvp_analitica_get_share_holders", args: { ticker: code } },
    { tool: "auvp_analitica_get_reviews", args: { code } },
    {
      tool: "auvp_analitica_get_documents",
      args: {
        code,
        page: 1,
        from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        to: new Date().toISOString().slice(0, 10),
      },
    },
    { tool: "auvp_analitica_get_alerts", args: { asset: code } },
    { tool: "auvp_analitica_list_favorites", args: {} },
    {
      tool: "auvp_analitica_get_assets_config",
      args: { companyType: "BRA:stock", countryType: "BRA" },
    },
    { tool: "auvp_analitica_get_credits", args: {} },
    { tool: "auvp_analitica_get_currency_quote", args: { currency: "USD" } },
    {
      tool: "auvp_analitica_get_credit_portfolio",
      args: { companyId: 340, report: "indexador", period: "5Y", aggregate: "ANUAL" },
    },
    { tool: "auvp_analitica_list_indices_quotes", args: {} },
    { tool: "auvp_analitica_list_rates", args: {} },
    { tool: "auvp_analitica_list_news", args: { asset: code, page: 1 } },
    { tool: "auvp_analitica_list_news_categories", args: {} },
    { tool: "auvp_analitica_list_videos", args: { asset: code, page: 1 } },
    { tool: "auvp_analitica_get_pay_wall", args: {} },
    {
      tool: "auvp_analitica_get_rentability",
      args: { ticker: code, period: "1y" },
    },
    { tool: "auvp_analitica_get_rentability_config", args: { ticker: code } },
    { tool: "auvp_analitica_get_fii_summary", args: { ticker: "HGLG11" } },
    {
      tool: "auvp_analitica_get_codes_dres",
      args: { from: "2021", to: "2026", key: "lucro_liquido" },
    },
    {
      tool: "auvp_analitica_get_column_templates",
      args: { type: "balance-stock" },
    },
    { tool: "auvp_analitica_get_page_route", args: { path: pagePath } },
  ];

  const definedTools = new Set(
    analiticaToolDefinitions.map((tool) => tool.name),
  );

  return probes.filter((probe) => definedTools.has(probe.tool));
}

async function runProbe(
  client: AuvpFinancasClient,
  probe: ScanProbe,
): Promise<AnaliticaToolScanResult> {
  if (probe.skip) {
    return {
      tool: probe.tool,
      ok: false,
      isError: false,
      skipped: true,
      skipReason: probe.skip,
      durationMs: 0,
    };
  }

  const startedAt = Date.now();
  const result = await callAuvpTool(client, probe.tool, probe.args);
  const durationMs = Date.now() - startedAt;
  const payload = parseToolPayload(result);
  const errorText =
    result.isError && result.content[0]?.type === "text"
      ? result.content[0].text
      : undefined;
  const httpCode = parseHttpCode(errorText, payload);
  const expectedFailure = probe.expectedFailure === true;

  return {
    tool: probe.tool,
    ok: !result.isError || expectedFailure,
    isError: Boolean(result.isError),
    httpCode,
    error: sanitizeReportError(errorText),
    durationMs,
    expectedFailure,
  };
}

export async function scanAnaliticaTools(
  client: AuvpFinancasClient,
): Promise<AnaliticaScanReport> {
  const context = await discoverContext(client);
  const results: AnaliticaToolScanResult[] = [];

  for (const probe of buildProbes(context)) {
    try {
      results.push(await runProbe(client, probe));
    } catch (error) {
      results.push({
        tool: probe.tool,
        ok: false,
        isError: true,
        httpCode: error instanceof AuvpApiError ? error.status : undefined,
        error: sanitizeReportError(error instanceof Error ? error.message : String(error)),
        durationMs: 0,
      });
    }
  }

  const skipped = results.filter((result) => result.skipped).length;
  const expectedError = results.filter((result) => result.expectedFailure).length;
  const ok = results.filter((result) => result.ok).length;
  const error = results.filter(
    (result) => result.isError && !result.skipped && !result.expectedFailure,
  ).length;

  return {
    scannedAt: new Date().toISOString(),
    hasToken: Boolean(client.getBearerToken()),
    hasAnaliticaCookie: Boolean(client.getAnaliticaCookieHeader()),
    context: { hasUserId: Boolean(context.userId), sampleCode: context.sampleCode },
    results,
    summary: {
      total: results.length,
      ok,
      error,
      expectedError,
      skipped,
    },
  };
}
