import {
  createCategoryInputSchema,
  createManualAccountInputSchema,
  createManualTransactionInputSchema,
  createTagInputSchema,
  emptyInputSchema,
  financasCategoryIdInputSchema,
  financasJsonBodyInputSchema,
  financasAccountIdInputSchema,
  financasCreatePluggyTokenInputSchema,
  financasTagIdInputSchema,
  financasTransactionIdInputSchema,
  financasUpdateTransactionInputSchema,
  getAccountBillsInputSchema,
  getCashflowInputSchema,
  getDashboardInputSchema,
  getMonthlyBudgetInputSchema,
  listTransactionsInputSchema,
} from "../mcp/schemas/json.js";
import { listFinancasObservedRoutes } from "./catalog.js";
import {
  createCategorySchema,
  createManualAccountSchema,
  createManualTransactionSchema,
  createTagSchema,
  emptyArgsSchema,
  financasAccountIdSchema,
  financasCategoryIdSchema,
  financasJsonBodySchema,
  financasCreatePluggyTokenSchema,
  financasTagIdSchema,
  financasTransactionIdSchema,
  financasUpdateAccountSchema,
  financasUpdateBudgetSchema,
  financasUpdateTagSchema,
  financasUpdateTransactionSchema,
  getAccountBillsSchema,
  getCashflowSchema,
  getDashboardSchema,
  getMonthlyBudgetSchema,
  listTransactionsSchema,
} from "../mcp/schemas/zod.js";
import type { QueryParams } from "../core/query.js";
import {
  defineTool,
  jsonResult,
  type ToolDefinition,
} from "../mcp/tool-utils.js";

export const financasToolDefinitions: ToolDefinition[] = [
  defineTool(
    "auvp_financas_list_observed_routes",
    "Lista rotas API e páginas observadas em financas.auvp.com.br (catálogo validado por probe HTTP).",
    emptyInputSchema,
    async (_client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(listFinancasObservedRoutes());
    },
  ),
  defineTool(
    "auvp_financas_get_profile",
    "GET /users/profile — perfil do usuário logado no AUVP Finanças.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.get("/users/profile"));
    },
  ),
  defineTool(
    "auvp_financas_get_user",
    "GET /users — dados do usuário. Pode retornar 403 em planos sem permissão.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.get("/users"));
    },
  ),
  defineTool(
    "auvp_financas_list_accounts",
    "GET /accounts — contas, resumo e faturas mensais.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.get("/accounts"));
    },
  ),
  defineTool(
    "auvp_financas_list_account_last_transactions",
    "GET /accounts/lastTransactions — últimas transações por conta.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.get("/accounts/lastTransactions"));
    },
  ),
  defineTool(
    "auvp_financas_get_account",
    "GET /accounts/:accountId — detalhe de uma conta.",
    financasAccountIdInputSchema,
    async (client, args) => {
      const parsed = financasAccountIdSchema.parse(args ?? {});
      return jsonResult(await client.get(`/accounts/${parsed.accountId}`));
    },
  ),
  defineTool(
    "auvp_financas_create_manual_account",
    "POST /accounts/manual — cria conta manual. Campos: name, type (BANK|CREDIT), subtype (CHECKING_ACCOUNT|SAVINGS_ACCOUNT|CREDIT_CARD), number, balance (número).",
    createManualAccountInputSchema,
    async (client, args) => {
      const parsed = createManualAccountSchema.parse(args ?? {});
      return jsonResult(await client.post("/accounts/manual", parsed));
    },
  ),
  defineTool(
    "auvp_financas_update_account",
    "PATCH /accounts/:accountId — atualiza conta.",
    {
      type: "object",
      additionalProperties: false,
      required: ["accountId", "body"],
      properties: {
        accountId: { type: "string", minLength: 1 },
        body: { type: "object", additionalProperties: true },
      },
    },
    async (client, args) => {
      const parsed = financasUpdateAccountSchema.parse(args ?? {});
      return jsonResult(
        await client.patch(`/accounts/${parsed.accountId}`, parsed.body),
      );
    },
  ),
  defineTool(
    "auvp_financas_delete_account",
    "DELETE /accounts/:accountId — remove conta.",
    financasAccountIdInputSchema,
    async (client, args) => {
      const parsed = financasAccountIdSchema.parse(args ?? {});
      return jsonResult(await client.delete(`/accounts/${parsed.accountId}`));
    },
  ),
  defineTool(
    "auvp_financas_list_transactions",
    "GET /transactions — lista transações com filtros opcionais.",
    listTransactionsInputSchema,
    async (client, args) => {
      const parsed = listTransactionsSchema.parse(args ?? {});
      const query: QueryParams = { ...parsed };
      return jsonResult(await client.get("/transactions", query));
    },
  ),
  defineTool(
    "auvp_financas_export_transactions",
    "GET /transactions/export — exporta transações com os mesmos filtros de list_transactions (referenceMonth em YYYY-MM). Pode retornar 400 se faltar filtro obrigatório.",
    listTransactionsInputSchema,
    async (client, args) => {
      const parsed = listTransactionsSchema.parse(args ?? {});
      const query: QueryParams = { ...parsed };
      return jsonResult(await client.get("/transactions/export", query));
    },
  ),
  defineTool(
    "auvp_financas_get_transaction",
    "GET /transactions/:transactionId — detalhe de uma transação.",
    financasTransactionIdInputSchema,
    async (client, args) => {
      const parsed = financasTransactionIdSchema.parse(args ?? {});
      return jsonResult(
        await client.get(`/transactions/${parsed.transactionId}`),
      );
    },
  ),
  defineTool(
    "auvp_financas_create_manual_transaction",
    "POST /transactions/manual — cria transação manual. Use accountId (não user_account_id), date em dd-MM-yyyy HH:mm.",
    createManualTransactionInputSchema,
    async (client, args) => {
      const parsed = createManualTransactionSchema.parse(args ?? {});
      return jsonResult(await client.post("/transactions/manual", parsed));
    },
  ),
  defineTool(
    "auvp_financas_update_transaction",
    "PATCH /transactions/:transactionId — atualiza transação. Use tagIds: [1,2] ou body parcial.",
    financasUpdateTransactionInputSchema,
    async (client, args) => {
      const parsed = financasUpdateTransactionSchema.parse(args ?? {});
      const body = parsed.body ?? { tagIds: parsed.tagIds ?? [] };
      return jsonResult(
        await client.patch(`/transactions/${parsed.transactionId}`, body),
      );
    },
  ),
  defineTool(
    "auvp_financas_delete_transaction",
    "DELETE /transactions/:transactionId — remove transação.",
    financasTransactionIdInputSchema,
    async (client, args) => {
      const parsed = financasTransactionIdSchema.parse(args ?? {});
      return jsonResult(
        await client.delete(`/transactions/${parsed.transactionId}`),
      );
    },
  ),
  defineTool(
    "auvp_financas_get_dashboard",
    "GET /dashboard — dashboard do mês (date em MM-YYYY).",
    getDashboardInputSchema,
    async (client, args) => {
      const parsed = getDashboardSchema.parse(args ?? {});
      return jsonResult(await client.get("/dashboard", parsed));
    },
  ),
  defineTool(
    "auvp_financas_get_cashflow",
    "GET /dashboard/cashflow — fluxo de caixa (startDate/endDate em DD/MM/YYYY).",
    getCashflowInputSchema,
    async (client, args) => {
      const parsed = getCashflowSchema.parse(args ?? {});
      return jsonResult(await client.get("/dashboard/cashflow", parsed));
    },
  ),
  defineTool(
    "auvp_financas_list_budgets",
    "GET /budgets — metas e categorias de orçamento.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.get("/budgets"));
    },
  ),
  defineTool(
    "auvp_financas_get_monthly_budget",
    "GET /budgets/monthly — orçamento mensal (date em MM-YYYY).",
    getMonthlyBudgetInputSchema,
    async (client, args) => {
      const parsed = getMonthlyBudgetSchema.parse(args ?? {});
      return jsonResult(await client.get("/budgets/monthly", parsed));
    },
  ),
  defineTool(
    "auvp_financas_get_budgets_summary",
    "GET /budgets/summary — resumo de orçamentos. Pode retornar 403 em planos sem permissão.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.get("/budgets/summary"));
    },
  ),
  defineTool(
    "auvp_financas_create_budget",
    "POST /budgets — cria meta de orçamento. Envie body conforme o frontend.",
    financasJsonBodyInputSchema,
    async (client, args) => {
      const parsed = financasJsonBodySchema.parse(args ?? {});
      return jsonResult(await client.post("/budgets", parsed.body));
    },
  ),
  defineTool(
    "auvp_financas_update_budget",
    "PATCH /budgets/:budgetId — atualiza meta de orçamento.",
    {
      type: "object",
      additionalProperties: false,
      required: ["budgetId", "body"],
      properties: {
        budgetId: {
          oneOf: [
            { type: "integer", minimum: 1 },
            { type: "string", pattern: "^\\d+$" },
          ],
        },
        body: { type: "object", additionalProperties: true },
      },
    },
    async (client, args) => {
      const parsed = financasUpdateBudgetSchema.parse(args ?? {});
      return jsonResult(
        await client.patch(`/budgets/${parsed.budgetId}`, parsed.body),
      );
    },
  ),
  defineTool(
    "auvp_financas_list_categories",
    "GET /categories — categorias de transação (catálogo Pluggy).",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.get("/categories"));
    },
  ),
  defineTool(
    "auvp_financas_get_categories_tree",
    "GET /categories/tree — árvore de categorias. Pode retornar 403 em planos sem permissão.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.get("/categories/tree"));
    },
  ),
  defineTool(
    "auvp_financas_list_user_categories",
    "GET /user-categories — categorias personalizadas do usuário.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.get("/user-categories"));
    },
  ),
  defineTool(
    "auvp_financas_create_category",
    "POST /categories — cria categoria no catálogo Pluggy (uso administrativo; pode retornar 403/500).",
    createCategoryInputSchema,
    async (client, args) => {
      const parsed = createCategorySchema.parse(args ?? {});
      return jsonResult(await client.post("/categories", parsed));
    },
  ),
  defineTool(
    "auvp_financas_delete_category",
    "DELETE /categories/:categoryId — remove categoria do catálogo.",
    financasCategoryIdInputSchema,
    async (client, args) => {
      const parsed = financasCategoryIdSchema.parse(args ?? {});
      return jsonResult(await client.delete(`/categories/${parsed.categoryId}`));
    },
  ),
  defineTool(
    "auvp_financas_list_tags",
    "GET /tags — tags de transação.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.get("/tags"));
    },
  ),
  defineTool(
    "auvp_financas_create_tag",
    "POST /tags — cria tag.",
    createTagInputSchema,
    async (client, args) => {
      const parsed = createTagSchema.parse(args ?? {});
      return jsonResult(await client.post("/tags", parsed));
    },
  ),
  defineTool(
    "auvp_financas_update_tag",
    "PATCH /tags/:tagId — atualiza tag.",
    {
      type: "object",
      additionalProperties: false,
      required: ["tagId", "body"],
      properties: {
        tagId: {
          oneOf: [
            { type: "integer", minimum: 1 },
            { type: "string", pattern: "^\\d+$" },
          ],
        },
        body: { type: "object", additionalProperties: true },
      },
    },
    async (client, args) => {
      const parsed = financasUpdateTagSchema.parse(args ?? {});
      return jsonResult(await client.patch(`/tags/${parsed.tagId}`, parsed.body));
    },
  ),
  defineTool(
    "auvp_financas_delete_tag",
    "DELETE /tags/:tagId — remove tag.",
    financasTagIdInputSchema,
    async (client, args) => {
      const parsed = financasTagIdSchema.parse(args ?? {});
      return jsonResult(await client.delete(`/tags/${parsed.tagId}`));
    },
  ),
  defineTool(
    "auvp_financas_list_banks",
    "GET /banks — bancos e conectores Pluggy.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.get("/banks"));
    },
  ),
  defineTool(
    "auvp_financas_get_account_bills",
    "GET /bills/account/:accountId — faturas de cartão de crédito. Retorna 404 se a conta não for cartão ou não houver faturas sincronizadas.",
    getAccountBillsInputSchema,
    async (client, args) => {
      const parsed = getAccountBillsSchema.parse(args ?? {});
      return jsonResult(
        await client.get(`/bills/account/${parsed.accountId}`),
      );
    },
  ),
  defineTool(
    "auvp_financas_get_bridge_status",
    "GET /bridge/status — status da sincronização bancária.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.get("/bridge/status"));
    },
  ),
  defineTool(
    "auvp_financas_create_pluggy_connect_token",
    "POST /pluggy/connect-token — token para conectar banco via Pluggy.",
    financasCreatePluggyTokenInputSchema,
    async (client, args) => {
      const parsed = financasCreatePluggyTokenSchema.parse(args ?? {});
      return jsonResult(
        await client.post("/pluggy/connect-token", parsed.body ?? {}),
      );
    },
  ),
];
