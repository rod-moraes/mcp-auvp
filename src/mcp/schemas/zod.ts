import { z } from "zod";
import { analiticaRankingTypeValues } from "../../analitica/ranking-types.js";

const brMonthSchema = z
  .string()
  .regex(/^\d{2}-\d{4}$/, "Expected MM-YYYY.");

const brDateSchema = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Expected DD/MM/YYYY.");

const referenceMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM.");

const sortOrderSchema = z.enum(["asc", "desc"]);

const numericIdSchema = z
  .union([z.number().int().positive(), z.string().regex(/^\d+$/)])
  .transform((value) => String(value));

const accountIdsSchema = z
  .union([
    z.string().min(1),
    z.array(z.string().min(1)).min(1),
  ])
  .optional();

const analiticaCodeSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9._-]+$/, "Expected an asset code like BBAS3 or AAPL.");

const analiticaPageRoutePathSchema = z
  .string()
  .regex(
    /^\/(?:acoes(?:\/(?:[A-Za-z0-9._-]+|agenda-de-dividendos|busca-avancada|comparar|previsao-de-dividendos))?|ativos\/[A-Za-z0-9._-]+|agenda-de-resultados|busca-avancada|calculadoras|etfs|fiiagros|fiis|indices|noticias|rankings(?:\/(?:acoes|stocks)(?:\/[a-z0-9_]+)?)?|reits|renda-fixa|simulador-de-rentabilidade|stocks)\/?$/,
    "Expected an Analitica page route observed in the HAR.",
  );

export const emptyArgsSchema = z.object({}).strict();

export const createSsoLoginUrlSchema = z
  .object({
    state: z.string().min(1).optional(),
    scope: z.string().min(1).optional(),
    redirectUri: z.string().url().optional(),
  })
  .strict();

export const completeSsoLoginSchema = z
  .object({
    callbackUrl: z.string().url().optional(),
    code: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    followRedirects: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.callbackUrl || value.code, {
    message: "Either callbackUrl or code must be provided.",
  });

export const ensureAuthSchema = z
  .object({
    fresh: z.boolean().optional(),
    forceBrowser: z.boolean().optional(),
    interactive: z.boolean().optional(),
  })
  .strict();

export const listTransactionsSchema = z
  .object({
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(1000).optional(),
    referenceMonth: referenceMonthSchema.optional(),
    sortBy: z.string().min(1).optional(),
    sortOrder: sortOrderSchema.optional(),
    status: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    accountIds: accountIdsSchema,
  })
  .strict();

export const getDashboardSchema = z
  .object({
    date: brMonthSchema.optional(),
  })
  .strict();

export const getCashflowSchema = z
  .object({
    startDate: brDateSchema,
    endDate: brDateSchema,
  })
  .strict();

export const getMonthlyBudgetSchema = z
  .object({
    date: brMonthSchema,
  })
  .strict();

export const getAccountBillsSchema = z
  .object({
    accountId: z.string().min(1),
  })
  .strict();

export const analiticaListViewsSchema = z
  .object({
    limit: z.number().int().positive().max(100).optional(),
  })
  .strict();

export const analiticaMostViewedSchema = z
  .object({
    companyType: z.string().optional(),
    limit: z.number().int().positive().max(100).optional(),
  })
  .strict();

export const analiticaRankCodesByRatingSchema = z
  .object({
    ratingType: z.string().min(1),
    limit: z.number().int().positive().max(100).default(5),
    page: z.number().int().positive().default(1),
    type: z.string().min(1).default("stock"),
  })
  .strict();

export const analiticaHomeRankingSchema = z
  .object({
    companyType: z.string().min(1),
    country: z.string().min(1),
    rankingType: z.string().min(1),
  })
  .strict();

export const analiticaAssetTooltipSchema = z
  .object({
    code: analiticaCodeSchema,
  })
  .strict();

export const analiticaOnboardSchema = z
  .object({
    scope: z.string().min(1),
  })
  .strict();

export const analiticaUserSchema = z
  .object({
    userId: z.string().min(1),
  })
  .strict();

export const analiticaPageRouteSchema = z
  .object({
    path: analiticaPageRoutePathSchema,
    rsc: z.string().min(1).optional(),
  })
  .strict();

const analiticaCodesQuerySchema = z
  .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
  .optional();

const analiticaQueryBooleanSchema = z
  .union([z.boolean(), z.string().min(1)])
  .optional();

export const analiticaGetCodeSchema = z
  .object({
    code: analiticaCodeSchema,
  })
  .strict();

export const analiticaCreditPortfolioSchema = z
  .object({
    companyId: z.number().int().positive(),
    report: z.enum(["indexador", "region", "pf_pj"]),
    period: z.string().min(1).default("5Y"),
    aggregate: z.string().min(1).default("ANUAL"),
  })
  .strict();

export const analiticaGetQuotesSchema = z
  .object({
    ticker: analiticaCodeSchema,
    period: z.string().min(1).optional(),
  })
  .strict();

export const analiticaGetBalanceSchema = z
  .object({
    codes: analiticaCodesQuerySchema,
    dres: z.string().min(1).optional(),
    formatted: analiticaQueryBooleanSchema,
    frequency: z.string().min(1).optional(),
    indicators: z.string().min(1).optional(),
    period: z.string().min(1).optional(),
    from: z.string().min(1).optional(),
    to: z.string().min(1).optional(),
  })
  .strict();

export const analiticaGetDresSchema = z
  .object({
    aggregate: analiticaQueryBooleanSchema,
    asset: analiticaCodeSchema.optional(),
    dre: z.string().min(1).optional(),
    is_fund: analiticaQueryBooleanSchema,
    period: z.string().min(1).optional(),
  })
  .strict();

export const analiticaGetDividendsSchema = z
  .object({
    aggregate: analiticaQueryBooleanSchema,
    code: analiticaCodeSchema.optional(),
    period: z.string().min(1).optional(),
  })
  .strict();

export const analiticaGetShareHoldersSchema = z
  .object({
    ticker: analiticaCodeSchema,
  })
  .strict();

export const analiticaGetReviewsSchema = z
  .object({
    code: analiticaCodeSchema,
  })
  .strict();

export const analiticaGetDocumentsSchema = z
  .object({
    code: analiticaCodeSchema.optional(),
    from: z.string().min(1).optional(),
    page: z.number().int().positive().optional(),
    to: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
  })
  .strict();

export const analiticaGetAlertsSchema = z
  .object({
    asset: analiticaCodeSchema,
  })
  .strict();

export const analiticaGetAssetsConfigSchema = z
  .object({
    companyType: z.string().min(1).optional(),
    countryType: z.string().min(1).optional(),
  })
  .strict();

export const analiticaRankingSegmentSchema = z.enum(["acoes", "stocks"]);

export const analiticaRankingTypeSchema = z.enum(analiticaRankingTypeValues);

export const analiticaGetRankingSchema = z
  .object({
    segment: analiticaRankingSegmentSchema,
    rankingType: analiticaRankingTypeSchema,
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(50),
    includeViabilidade: z.boolean().default(false),
    includeIndicators: z.boolean().default(false),
  })
  .strict();

export const analiticaGetCurrencyQuoteSchema = z
  .object({
    currency: z.string().min(1).default("USD"),
  })
  .strict();

export const analiticaListNewsSchema = z
  .object({
    asset: analiticaCodeSchema,
    page: z.number().int().positive().default(1),
  })
  .strict();

export const analiticaListVideosSchema = z
  .object({
    asset: analiticaCodeSchema,
    page: z.number().int().positive().default(1),
  })
  .strict();

export const analiticaGetRentabilitySchema = z
  .object({
    ticker: analiticaCodeSchema,
    period: z.string().min(1).default("1y"),
  })
  .strict();

export const analiticaGetRentabilityConfigSchema = z
  .object({
    ticker: analiticaCodeSchema,
  })
  .strict();

export const analiticaGetFiiSummarySchema = z
  .object({
    ticker: analiticaCodeSchema,
  })
  .strict();

export const analiticaGetCodesDresSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    key: z.string().min(1),
  })
  .strict();

export const analiticaGetColumnTemplatesSchema = z
  .object({
    type: z.string().min(1),
  })
  .strict();

export type ListTransactionsArgs = z.infer<typeof listTransactionsSchema>;
export type CreateSsoLoginUrlArgs = z.infer<typeof createSsoLoginUrlSchema>;
export type CompleteSsoLoginArgs = z.infer<typeof completeSsoLoginSchema>;
export type EnsureAuthArgs = z.infer<typeof ensureAuthSchema>;
export type GetDashboardArgs = z.infer<typeof getDashboardSchema>;
export type GetCashflowArgs = z.infer<typeof getCashflowSchema>;
export type GetMonthlyBudgetArgs = z.infer<typeof getMonthlyBudgetSchema>;
export type GetAccountBillsArgs = z.infer<typeof getAccountBillsSchema>;
export type AnaliticaListViewsArgs = z.infer<
  typeof analiticaListViewsSchema
>;
export type AnaliticaMostViewedArgs = z.infer<
  typeof analiticaMostViewedSchema
>;
export type AnaliticaRankCodesByRatingArgs = z.infer<
  typeof analiticaRankCodesByRatingSchema
>;
export type AnaliticaHomeRankingArgs = z.infer<
  typeof analiticaHomeRankingSchema
>;
export type AnaliticaAssetTooltipArgs = z.infer<
  typeof analiticaAssetTooltipSchema
>;
export type AnaliticaOnboardArgs = z.infer<typeof analiticaOnboardSchema>;
export type AnaliticaUserArgs = z.infer<typeof analiticaUserSchema>;
export type AnaliticaPageRouteArgs = z.infer<
  typeof analiticaPageRouteSchema
>;
export type AnaliticaGetCodeArgs = z.infer<typeof analiticaGetCodeSchema>;
export type AnaliticaGetQuotesArgs = z.infer<typeof analiticaGetQuotesSchema>;
export type AnaliticaGetBalanceArgs = z.infer<typeof analiticaGetBalanceSchema>;
export type AnaliticaGetDresArgs = z.infer<typeof analiticaGetDresSchema>;
export type AnaliticaGetDividendsArgs = z.infer<
  typeof analiticaGetDividendsSchema
>;
export type AnaliticaGetShareHoldersArgs = z.infer<
  typeof analiticaGetShareHoldersSchema
>;
export type AnaliticaGetReviewsArgs = z.infer<
  typeof analiticaGetReviewsSchema
>;
export type AnaliticaGetDocumentsArgs = z.infer<
  typeof analiticaGetDocumentsSchema
>;
export type AnaliticaGetAlertsArgs = z.infer<typeof analiticaGetAlertsSchema>;
export type AnaliticaGetAssetsConfigArgs = z.infer<
  typeof analiticaGetAssetsConfigSchema
>;
export type AnaliticaGetRankingArgs = z.infer<
  typeof analiticaGetRankingSchema
>;
export type AnaliticaGetCurrencyQuoteArgs = z.infer<
  typeof analiticaGetCurrencyQuoteSchema
>;
export type AnaliticaListNewsArgs = z.infer<typeof analiticaListNewsSchema>;
export type AnaliticaListVideosArgs = z.infer<typeof analiticaListVideosSchema>;
export type AnaliticaGetRentabilityArgs = z.infer<
  typeof analiticaGetRentabilitySchema
>;
export type AnaliticaGetRentabilityConfigArgs = z.infer<
  typeof analiticaGetRentabilityConfigSchema
>;
export type AnaliticaGetFiiSummaryArgs = z.infer<
  typeof analiticaGetFiiSummarySchema
>;
export type AnaliticaGetCodesDresArgs = z.infer<
  typeof analiticaGetCodesDresSchema
>;
export type AnaliticaGetColumnTemplatesArgs = z.infer<
  typeof analiticaGetColumnTemplatesSchema
>;

const comunidadeForumRefSchema = z.union([
  z.number().int().positive(),
  z.string().min(1),
]);

export const comunidadeSearchSchema = z
  .object({
    query: z.string().min(1),
    forums: z.array(comunidadeForumRefSchema).optional(),
    searchMode: z.enum(["and", "or"]).optional(),
    searchIn: z.enum(["all", "titles"]).optional(),
    contentType: z
      .enum([
        "forums_topic",
        "core_statuses_status",
        "calendar_event",
        "cms_pages_pageitem",
        "cms_records1",
        "all",
      ])
      .optional(),
    sortBy: z.enum(["relevancy", "newest"]).optional(),
    page: z.number().int().positive().optional(),
  })
  .strict();

export type ComunidadeSearchArgs = z.infer<typeof comunidadeSearchSchema>;

export const comunidadeGetTopicSchema = z
  .object({
    url: z.string().min(1),
  })
  .strict();

export type ComunidadeGetTopicArgs = z.infer<typeof comunidadeGetTopicSchema>;

export const comunidadeListForumTopicsSchema = z
  .object({
    forum: comunidadeForumRefSchema,
    page: z.number().int().positive().optional(),
  })
  .strict();

export type ComunidadeListForumTopicsArgs = z.infer<
  typeof comunidadeListForumTopicsSchema
>;

export const comunidadeLeaderboardSchema = z
  .object({
    time: z.enum(["week", "month", "year", "all"]).optional(),
    limit: z.number().int().positive().max(20).optional(),
  })
  .strict();

export type ComunidadeLeaderboardArgs = z.infer<
  typeof comunidadeLeaderboardSchema
>;

const financasIdSchema = z
  .union([z.number().int().positive(), z.string().regex(/^\d+$/)])
  .transform((value) => String(value));

export const financasAccountIdSchema = z
  .object({
    accountId: z.string().min(1),
  })
  .strict();

export const financasTransactionIdSchema = z
  .object({
    transactionId: financasIdSchema,
  })
  .strict();

export const financasCategoryIdSchema = z
  .object({
    categoryId: financasIdSchema,
  })
  .strict();

export const financasTagIdSchema = z
  .object({
    tagId: financasIdSchema,
  })
  .strict();

export const financasBudgetIdSchema = z
  .object({
    budgetId: financasIdSchema,
  })
  .strict();

const financasAccountTypeSchema = z.enum(["BANK", "CREDIT", "bank", "credit"]);

const financasTransactionTypeSchema = z.enum([
  "DEBIT",
  "CREDIT",
  "debit",
  "credit",
]);

export const createManualAccountSchema = z
  .object({
    name: z.string().min(1),
    type: financasAccountTypeSchema,
    subtype: z.string().min(1),
    number: z.string().min(1),
    balance: z.number(),
    bankCode: z.number().int().optional(),
    creditData: z
      .object({
        brand: z.string().min(1),
      })
      .strict()
      .optional(),
  })
  .strict()
  .transform((value) => ({
    name: value.name,
    type: value.type.toUpperCase() as "BANK" | "CREDIT",
    subtype:
      value.type.toUpperCase() === "CREDIT" ? "CREDIT_CARD" : value.subtype,
    number: value.number,
    balance: value.balance,
    ...(value.bankCode != null ? { bankCode: value.bankCode } : {}),
    ...(value.creditData ? { creditData: value.creditData } : {}),
  }));

export const createManualTransactionSchema = z
  .object({
    accountId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
    amount: z.number(),
    type: financasTransactionTypeSchema,
    description: z.string().min(1),
    date: z.string().min(1),
    budgetId: z
      .union([z.number().int().positive(), z.string().regex(/^\d+$/)])
      .optional(),
    categoryId: z
      .union([z.number().int().positive(), z.string().regex(/^\d+$/)])
      .optional(),
    userCategoryId: z
      .union([
        z.number().int().positive(),
        z.string().regex(/^\d+$/),
        z.null(),
      ])
      .optional(),
    referenceMonth: z.union([z.string().datetime(), z.date()]).optional(),
    tagIds: z.array(z.number().int().positive()).optional(),
    ignore: z.boolean().optional(),
    observations: z.string().optional(),
    isRecurrent: z.boolean().optional(),
    recurrenceInDays: z.number().int().positive().optional(),
  })
  .strict()
  .transform((value) => ({
    accountId: Number(value.accountId),
    amount: value.amount,
    type: value.type.toUpperCase() as "DEBIT" | "CREDIT",
    description: value.description,
    date: value.date,
    ...(value.budgetId != null ? { budgetId: Number(value.budgetId) } : {}),
    ...(value.categoryId != null ? { categoryId: Number(value.categoryId) } : {}),
    ...(value.userCategoryId !== undefined
      ? {
          userCategoryId:
            value.userCategoryId == null
              ? null
              : Number(value.userCategoryId),
        }
      : {}),
    ...(value.referenceMonth != null
      ? {
          referenceMonth:
            value.referenceMonth instanceof Date
              ? value.referenceMonth
              : new Date(value.referenceMonth),
        }
      : {}),
    tagIds: value.tagIds ?? [],
    ignore: value.ignore ?? false,
    ...(value.observations != null ? { observations: value.observations } : {}),
    isRecurrent: value.isRecurrent ?? false,
    ...(value.recurrenceInDays != null
      ? { recurrenceInDays: value.recurrenceInDays }
      : {}),
  }));

export const createCategorySchema = z
  .object({
    description: z.string().min(1),
  })
  .strict();

export const createTagSchema = z
  .object({
    name: z.string().min(1),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  })
  .strict();

export const financasJsonBodySchema = z
  .object({
    body: z.record(z.unknown()),
  })
  .strict();

export const financasUpdateTransactionSchema = z
  .object({
    transactionId: financasIdSchema,
    body: z.record(z.unknown()).optional(),
    tagIds: z.array(z.number().int().positive()).optional(),
  })
  .strict()
  .refine((value) => value.body || value.tagIds, {
    message: "Provide body and/or tagIds.",
  });

export const financasCreatePluggyTokenSchema = z
  .object({
    body: z.record(z.unknown()).optional(),
  })
  .strict();

export const financasUpdateAccountSchema = financasAccountIdSchema
  .extend({ body: z.record(z.unknown()) })
  .strict();

export const financasUpdateBudgetSchema = financasBudgetIdSchema
  .extend({ body: z.record(z.unknown()) })
  .strict();

export const financasUpdateTagSchema = financasTagIdSchema
  .extend({ body: z.record(z.unknown()) })
  .strict();
