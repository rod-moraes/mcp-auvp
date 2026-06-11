import { AuvpApiError } from "../core/errors.js";
import type { AuvpFinancasClient } from "../core/http-client.js";
import { callAuvpTool } from "../mcp/registry.js";
import type { ToolResult } from "../mcp/tool-utils.js";
import { financasToolDefinitions } from "./tools.js";

export interface FinancasToolScanResult {
  tool: string;
  ok: boolean;
  isError: boolean;
  httpCode?: number;
  error?: string;
  durationMs: number;
  skipped?: boolean;
  skipReason?: string;
  expectedFailure?: boolean;
  createdId?: string;
}

export interface FinancasScanContext {
  accountId?: string;
  creditAccountId?: string;
  transactionId?: string;
  tagId?: string;
  createdAccountId?: string;
  createdTagId?: string;
  createdTransactionId?: string;
}

export interface FinancasScanReport {
  scannedAt: string;
  hasToken: boolean;
  context: FinancasScanContext;
  results: FinancasToolScanResult[];
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

const SCAN_MARKER = "MCP_SCAN";

function currentMonthMmYyyy(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${month}-${now.getFullYear()}`;
}

function currentMonthYyyyMm(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function todayBrRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return {
    startDate: `01/${month}/${year}`,
    endDate: `${day}/${month}/${year}`,
  };
}

function manualTransactionDate(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}`;
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

function extractId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const id = record.id;
  if (typeof id === "number" || typeof id === "string") {
    return String(id);
  }

  if (record.data != null) {
    return extractId(record.data);
  }

  return undefined;
}

async function discoverContext(
  client: AuvpFinancasClient,
): Promise<FinancasScanContext> {
  const context: FinancasScanContext = {};

  const accountsResult = await callAuvpTool(client, "auvp_financas_list_accounts", {});
  const accountsPayload = parseToolPayload(accountsResult);
  const accounts =
    accountsPayload &&
    typeof accountsPayload === "object" &&
    Array.isArray((accountsPayload as { accounts?: unknown }).accounts)
      ? ((accountsPayload as { accounts: Array<Record<string, unknown>> }).accounts ??
        [])
      : [];

  for (const account of accounts) {
    const id = String(account.id ?? "");
    const subtype = String(account.subtype ?? "");
    const type = String(account.type ?? "");
    if (!context.creditAccountId && (subtype === "CREDIT_CARD" || type === "CREDIT")) {
      context.creditAccountId = id;
    }
    if (!context.accountId && subtype === "CHECKING_ACCOUNT") {
      context.accountId = id;
    }
  }

  if (!context.accountId && accounts[0]?.id != null) {
    context.accountId = String(accounts[0].id);
  }

  const transactionsResult = await callAuvpTool(
    client,
    "auvp_financas_list_transactions",
    { page: 1, limit: 1 },
  );
  const transactionsPayload = parseToolPayload(transactionsResult);
  const transactions =
    transactionsPayload &&
    typeof transactionsPayload === "object" &&
    Array.isArray((transactionsPayload as { transactions?: unknown }).transactions)
      ? ((transactionsPayload as { transactions: Array<Record<string, unknown>> })
          .transactions ?? [])
      : [];

  if (transactions[0]?.id != null) {
    context.transactionId = String(transactions[0].id);
  }

  const tagsResult = await callAuvpTool(client, "auvp_financas_list_tags", {});
  const tagsPayload = parseToolPayload(tagsResult);
  const tags =
    tagsPayload &&
    typeof tagsPayload === "object" &&
    Array.isArray((tagsPayload as { data?: unknown }).data)
      ? ((tagsPayload as { data: Array<Record<string, unknown>> }).data ?? [])
      : [];

  if (tags[0]?.id != null) {
    context.tagId = String(tags[0].id);
  }

  return context;
}

function buildReadProbes(context: FinancasScanContext): ScanProbe[] {
  const month = currentMonthMmYyyy();
  const cashflow = todayBrRange();

  return [
    { tool: "auvp_financas_list_observed_routes", args: {} },
    { tool: "auvp_financas_get_profile", args: {} },
    {
      tool: "auvp_financas_get_user",
      args: {},
      expectedFailure: true,
    },
    { tool: "auvp_financas_list_accounts", args: {} },
    { tool: "auvp_financas_list_account_last_transactions", args: {} },
    {
      tool: "auvp_financas_get_account",
      args: { accountId: context.accountId ?? "1" },
      skip: context.accountId ? undefined : "sem conta disponível",
    },
    { tool: "auvp_financas_list_transactions", args: { page: 1, limit: 5 } },
    {
      tool: "auvp_financas_export_transactions",
      args: { referenceMonth: currentMonthYyyyMm(), accountIds: context.accountId },
      skip: context.accountId ? undefined : "sem conta disponível",
      expectedFailure: true,
    },
    {
      tool: "auvp_financas_get_transaction",
      args: { transactionId: context.transactionId ?? "1" },
      skip: context.transactionId ? undefined : "sem transação disponível",
    },
    { tool: "auvp_financas_get_dashboard", args: { date: month } },
    { tool: "auvp_financas_get_cashflow", args: cashflow },
    { tool: "auvp_financas_list_budgets", args: {} },
    { tool: "auvp_financas_get_monthly_budget", args: { date: month } },
    {
      tool: "auvp_financas_get_budgets_summary",
      args: {},
      expectedFailure: true,
    },
    { tool: "auvp_financas_list_categories", args: {} },
    {
      tool: "auvp_financas_get_categories_tree",
      args: {},
      expectedFailure: true,
    },
    { tool: "auvp_financas_list_user_categories", args: {} },
    { tool: "auvp_financas_list_tags", args: {} },
    { tool: "auvp_financas_list_banks", args: {} },
    { tool: "auvp_financas_get_bridge_status", args: {} },
    { tool: "auvp_financas_create_pluggy_connect_token", args: {} },
    {
      tool: "auvp_financas_get_account_bills",
      args: { accountId: context.creditAccountId ?? context.accountId ?? "1" },
      skip:
        context.creditAccountId || context.accountId
          ? undefined
          : "sem conta disponível",
      expectedFailure: true,
    },
  ];
}

async function findManualAccountId(
  client: AuvpFinancasClient,
  marker: string,
): Promise<string | undefined> {
  const accountsResult = await callAuvpTool(client, "auvp_financas_list_accounts", {});
  const accountsPayload = parseToolPayload(accountsResult);
  const accounts =
    accountsPayload &&
    typeof accountsPayload === "object" &&
    Array.isArray((accountsPayload as { accounts?: unknown }).accounts)
      ? ((accountsPayload as { accounts: Array<Record<string, unknown>> }).accounts ??
        [])
      : [];

  const account = accounts.find(
    (entry) =>
      entry.source === "MANUAL" &&
      String(entry.name ?? "").includes(marker),
  );

  return account?.id != null ? String(account.id) : undefined;
}

async function runWriteCycle(
  client: AuvpFinancasClient,
  context: FinancasScanContext,
): Promise<{ results: FinancasToolScanResult[]; context: FinancasScanContext }> {
  const results: FinancasToolScanResult[] = [];
  const stamp = Date.now();
  const accountName = `${SCAN_MARKER} Account ${stamp}`;
  const tagName = `${SCAN_MARKER}_${stamp}`;
  const transactionDescription = `${SCAN_MARKER} transaction ${stamp}`;

  const createAccount = await runProbe(client, {
    tool: "auvp_financas_create_manual_account",
    args: {
      name: accountName,
      type: "BANK",
      subtype: "CHECKING_ACCOUNT",
      number: `scan-${stamp}`,
      balance: 1,
    },
  });
  results.push(createAccount);

  const createdAccountId =
    createAccount.createdId ??
    (await findManualAccountId(client, accountName));

  context.createdAccountId = createdAccountId;

  const createTag = await runProbe(client, {
    tool: "auvp_financas_create_tag",
    args: { name: tagName, color: "#ff00ff" },
  });
  results.push(createTag);
  context.createdTagId = createTag.createdId;

  if (!createdAccountId) {
    results.push({
      tool: "auvp_financas_create_manual_transaction",
      ok: false,
      isError: false,
      skipped: true,
      skipReason: "conta de scan não foi criada",
      durationMs: 0,
    });
    results.push({
      tool: "auvp_financas_delete_transaction",
      ok: false,
      isError: false,
      skipped: true,
      skipReason: "sem transação de scan",
      durationMs: 0,
    });
    if (context.createdTagId) {
      results.push(
        await runProbe(client, {
          tool: "auvp_financas_delete_tag",
          args: { tagId: context.createdTagId },
        }),
      );
    }
    results.push({
      tool: "auvp_financas_delete_account",
      ok: false,
      isError: false,
      skipped: true,
      skipReason: "sem conta de scan",
      durationMs: 0,
    });
    return { results, context };
  }

  const createTransaction = await runProbe(client, {
    tool: "auvp_financas_create_manual_transaction",
    args: {
      accountId: Number(createdAccountId),
      amount: 1,
      type: "DEBIT",
      description: transactionDescription,
      date: manualTransactionDate(),
      referenceMonth: new Date(`${currentMonthYyyyMm()}-01T00:00:00.000Z`),
      tagIds: context.createdTagId ? [Number(context.createdTagId)] : [],
      ignore: false,
      isRecurrent: false,
    },
  });
  results.push(createTransaction);
  context.createdTransactionId = createTransaction.createdId;

  if (context.createdTagId) {
    results.push(
      await runProbe(client, {
        tool: "auvp_financas_update_tag",
        args: {
          tagId: context.createdTagId,
          body: { name: `${tagName}_UPDATED` },
        },
      }),
    );
  }

  if (context.createdTransactionId && context.createdTagId) {
    results.push(
      await runProbe(client, {
        tool: "auvp_financas_update_transaction",
        args: {
          transactionId: context.createdTransactionId,
          tagIds: [Number(context.createdTagId)],
        },
      }),
    );
  }

  if (context.createdTransactionId) {
    results.push(
      await runProbe(client, {
        tool: "auvp_financas_delete_transaction",
        args: { transactionId: context.createdTransactionId },
      }),
    );
  } else {
    results.push({
      tool: "auvp_financas_delete_transaction",
      ok: false,
      isError: false,
      skipped: true,
      skipReason: "transação de scan não foi criada",
      durationMs: 0,
    });
  }

  if (context.createdTagId) {
    results.push(
      await runProbe(client, {
        tool: "auvp_financas_delete_tag",
        args: { tagId: context.createdTagId },
      }),
    );
  }

  results.push(
    await runProbe(client, {
      tool: "auvp_financas_delete_account",
      args: { accountId: createdAccountId },
    }),
  );

  return { results, context };
}

function buildProbes(context: FinancasScanContext): ScanProbe[] {
  const definedTools = new Set(financasToolDefinitions.map((tool) => tool.name));
  return buildReadProbes(context).filter((probe) => definedTools.has(probe.tool));
}

async function runProbe(
  client: AuvpFinancasClient,
  probe: ScanProbe,
): Promise<FinancasToolScanResult> {
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
  const createdId = !result.isError ? extractId(payload) : undefined;
  const expectedFailure =
    probe.expectedFailure === true ||
    (probe.tool === "auvp_financas_get_account_bills" && httpCode === 404);

  return {
    tool: probe.tool,
    ok: !result.isError || expectedFailure,
    isError: Boolean(result.isError),
    httpCode,
    error: errorText,
    durationMs,
    expectedFailure,
    createdId,
  };
}

export async function scanFinancasTools(
  client: AuvpFinancasClient,
): Promise<FinancasScanReport> {
  const context = await discoverContext(client);
  const results: FinancasToolScanResult[] = [];

  for (const probe of buildProbes(context)) {
    try {
      results.push(await runProbe(client, probe));
    } catch (error) {
      results.push({
        tool: probe.tool,
        ok: false,
        isError: true,
        httpCode: error instanceof AuvpApiError ? error.status : undefined,
        error: error instanceof Error ? error.message : String(error),
        durationMs: 0,
      });
    }
  }

  try {
    const writeCycle = await runWriteCycle(client, context);
    results.push(...writeCycle.results);
    Object.assign(context, writeCycle.context);
  } catch (error) {
    results.push({
      tool: "auvp_financas_write_cycle",
      ok: false,
      isError: true,
      httpCode: error instanceof AuvpApiError ? error.status : undefined,
      error: error instanceof Error ? error.message : String(error),
      durationMs: 0,
    });
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
    context,
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
