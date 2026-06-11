import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { analiticaRankingTypeValues } from "../../analitica/ranking-types.js";

type InputSchema = Tool["inputSchema"];

export const emptyInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
};

export const createSsoLoginUrlInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    state: {
      type: "string",
      minLength: 1,
      description: "Optional OIDC state. If omitted, the server generates one.",
    },
    scope: {
      type: "string",
      minLength: 1,
      description: "Optional OIDC scope override.",
    },
    redirectUri: {
      type: "string",
      format: "uri",
      description: "Optional OIDC redirect_uri override.",
    },
  },
};

export const completeSsoLoginInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    callbackUrl: {
      type: "string",
      format: "uri",
      description:
        "Full callback URL after browser login, including code and state.",
    },
    code: {
      type: "string",
      minLength: 1,
      description: "OIDC authorization code, if callbackUrl is not provided.",
    },
    state: {
      type: "string",
      minLength: 1,
      description: "OIDC state to send with code.",
    },
    followRedirects: {
      type: "boolean",
      description: "Follow callback redirects while capturing cookies.",
    },
  },
};

export const ensureAuthInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    fresh: {
      type: "boolean",
      description:
        "Clear the saved browser profile before login. Use to switch accounts.",
    },
    forceBrowser: {
      type: "boolean",
      description:
        "Skip the API token check and go straight to browser-based renewal.",
    },
    interactive: {
      type: "boolean",
      description:
        "Open a visible browser when renewal is needed. Defaults to true.",
    },
  },
};

export const listTransactionsInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    page: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 1, maximum: 1000 },
    referenceMonth: {
      type: "string",
      pattern: "^\\d{4}-\\d{2}$",
      description: "Reference month in YYYY-MM format.",
    },
    sortBy: { type: "string", minLength: 1 },
    sortOrder: { type: "string", enum: ["asc", "desc"] },
    status: { type: "string", minLength: 1 },
    type: { type: "string", minLength: 1 },
    accountIds: {
      oneOf: [
        { type: "string", minLength: 1 },
        {
          type: "array",
          minItems: 1,
          items: { type: "string", minLength: 1 },
        },
      ],
    },
  },
};

export const getDashboardInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    date: {
      type: "string",
      pattern: "^\\d{2}-\\d{4}$",
      description: "Month in MM-YYYY format.",
    },
  },
};

export const getCashflowInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["startDate", "endDate"],
  properties: {
    startDate: {
      type: "string",
      pattern: "^\\d{2}/\\d{2}/\\d{4}$",
      description: "Start date in DD/MM/YYYY format.",
    },
    endDate: {
      type: "string",
      pattern: "^\\d{2}/\\d{2}/\\d{4}$",
      description: "End date in DD/MM/YYYY format.",
    },
  },
};

export const getMonthlyBudgetInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["date"],
  properties: {
    date: {
      type: "string",
      pattern: "^\\d{2}-\\d{4}$",
      description: "Month in MM-YYYY format.",
    },
  },
};

export const getAccountBillsInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["accountId"],
  properties: {
    accountId: { type: "string", minLength: 1 },
  },
};

export const analiticaListViewsInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      description: "Maximum number of recent asset views to return.",
    },
  },
};

export const analiticaMostViewedInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    companyType: {
      type: "string",
      description:
        "Optional Analitica companyType filter, e.g. BRA:stock, USA:stock, USA:reit, or BRA:fii. Omit it to ask for all types.",
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      description: "Maximum number of most-viewed assets to return.",
    },
  },
};

export const analiticaRankCodesByRatingInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ratingType"],
  properties: {
    ratingType: {
      type: "string",
      minLength: 1,
      description: "Analitica rating_type query value, e.g. blue.",
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      default: 5,
    },
    page: {
      type: "integer",
      minimum: 1,
      default: 1,
    },
    type: {
      type: "string",
      minLength: 1,
      default: "stock",
      description: "Analitica asset type query value, e.g. stock.",
    },
  },
};

export const analiticaHomeRankingInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["companyType", "country", "rankingType"],
  properties: {
    companyType: {
      type: "string",
      minLength: 1,
      description: "BFF companyType body value, e.g. stock.",
    },
    country: {
      type: "string",
      minLength: 1,
      description: "BFF country body value, e.g. BRA.",
    },
    rankingType: {
      type: "string",
      minLength: 1,
      description: "BFF rankingType body value, e.g. dividend_yield.",
    },
  },
};

export const analiticaAssetTooltipInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["code"],
  properties: {
    code: {
      type: "string",
      minLength: 1,
      pattern: "^[A-Za-z0-9._-]+$",
      description: "Asset code, e.g. SYNE3.",
    },
  },
};

export const analiticaOnboardInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["scope"],
  properties: {
    scope: {
      type: "string",
      minLength: 1,
      description: "Onboard scope, e.g. rankings.",
    },
  },
};

export const analiticaUserInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["userId"],
  properties: {
    userId: {
      type: "string",
      minLength: 1,
      description: "Analitica user id.",
    },
  },
};

const analiticaCodeProperty = {
  type: "string" as const,
  minLength: 1,
  pattern: "^[A-Za-z0-9._-]+$",
  description: "Asset code, e.g. BBAS3 or AAPL.",
};

export const analiticaGetCodeInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["code"],
  properties: {
    code: analiticaCodeProperty,
  },
};

export const analiticaGetQuotesInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ticker"],
  properties: {
    ticker: analiticaCodeProperty,
    period: {
      type: "string",
      minLength: 1,
      description: "Quote period filter observed in the crawl, e.g. 1y.",
    },
  },
};

export const analiticaGetBalanceInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    codes: {
      oneOf: [
        { type: "string", minLength: 1 },
        {
          type: "array",
          minItems: 1,
          items: { type: "string", minLength: 1 },
        },
      ],
      description: "Asset code or comma-joinable list for balance queries.",
    },
    dres: { type: "string", minLength: 1 },
    formatted: {
      oneOf: [{ type: "boolean" }, { type: "string", minLength: 1 }],
    },
    frequency: { type: "string", minLength: 1 },
    indicators: { type: "string", minLength: 1 },
    period: { type: "string", minLength: 1 },
    from: { type: "string", minLength: 1 },
    to: { type: "string", minLength: 1 },
  },
};

export const analiticaGetDresInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    aggregate: {
      oneOf: [{ type: "boolean" }, { type: "string", minLength: 1 }],
    },
    asset: analiticaCodeProperty,
    dre: { type: "string", minLength: 1 },
    is_fund: {
      oneOf: [{ type: "boolean" }, { type: "string", minLength: 1 }],
    },
    period: { type: "string", minLength: 1 },
  },
};

export const analiticaGetDividendsInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    aggregate: {
      oneOf: [{ type: "boolean" }, { type: "string", minLength: 1 }],
    },
    code: analiticaCodeProperty,
    period: { type: "string", minLength: 1 },
  },
};

export const analiticaGetShareHoldersInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ticker"],
  properties: {
    ticker: analiticaCodeProperty,
  },
};

export const analiticaGetReviewsInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["code"],
  properties: {
    code: analiticaCodeProperty,
  },
};

export const analiticaGetDocumentsInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    code: analiticaCodeProperty,
    from: { type: "string", minLength: 1 },
    page: { type: "integer", minimum: 1 },
    to: { type: "string", minLength: 1 },
    type: { type: "string", minLength: 1 },
  },
};

export const analiticaGetAlertsInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["asset"],
  properties: {
    asset: analiticaCodeProperty,
  },
};

export const analiticaGetAssetsConfigInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    companyType: {
      type: "string",
      minLength: 1,
      description: "Analitica companyType query value.",
    },
    countryType: {
      type: "string",
      minLength: 1,
      description: "Analitica countryType query value.",
    },
  },
};

export const analiticaGetRankingInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["segment", "rankingType"],
  properties: {
    segment: {
      type: "string",
      enum: ["acoes", "stocks"],
      description:
        "Ranking segment. acoes maps to BRA/stock; stocks maps to USA/stock.",
    },
    rankingType: {
      type: "string",
      enum: [...analiticaRankingTypeValues],
      description:
        "Ranking slug from /rankings/{segment}/{rankingType}, e.g. dividend_yield, p_l, roe, roic, upside_graham.",
    },
    page: {
      type: "integer",
      minimum: 1,
      default: 1,
      description: "Ranking page number. Page 1 is the first page.",
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      default: 50,
      description:
        "Number of assets per page. Matches ?limit= on the Analitica URL; use pagination.total_pages to fetch more pages.",
    },
    includeViabilidade: {
      type: "boolean",
      default: false,
      description:
        "When true, enriches each row with viabilidade (rating slug: blue, green, yellow, red) via asset-image-tooltip.",
    },
    includeIndicators: {
      type: "boolean",
      default: false,
      description:
        "When true, keeps the full raw indicators map on each row. Default returns only the table columns shown on the ranking page.",
    },
  },
};

export const comunidadeGetTopicInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["url"],
  properties: {
    url: {
      type: "string",
      minLength: 1,
      description:
        "URL ou path do tópico, ex.: https://comunidade.auvp.com.br/topic/43093-empreender-agora-ou-esperar/ ou /topic/43093-.../",
    },
  },
};

export const comunidadeSearchInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["query"],
  properties: {
    query: {
      type: "string",
      minLength: 1,
      description: "Termo de busca na Comunidade AUVP.",
    },
    forums: {
      type: "array",
      items: {
        oneOf: [{ type: "integer", minimum: 1 }, { type: "string", minLength: 1 }],
      },
      description:
        "Filtro opcional por fóruns (id numérico ou slug, ex.: renda-fixa, criptomoedas).",
    },
    searchMode: {
      type: "string",
      enum: ["and", "or"],
      description:
        "and = todas as palavras; or = qualquer palavra. Padrão: and.",
    },
    searchIn: {
      type: "string",
      enum: ["all", "titles"],
      description:
        "all = título ou corpo; titles = somente título. Padrão: all.",
    },
    contentType: {
      type: "string",
      enum: [
        "forums_topic",
        "core_statuses_status",
        "calendar_event",
        "cms_pages_pageitem",
        "cms_records1",
        "all",
      ],
      description:
        "Tipo de conteúdo. Padrão: forums_topic. Use all para todas as publicações.",
    },
    sortBy: {
      type: "string",
      enum: ["relevancy", "newest"],
      description: "Ordenação dos resultados. Padrão: relevancy.",
    },
    page: {
      type: "integer",
      minimum: 1,
      description: "Página de resultados (paginação IPS). Padrão: 1.",
    },
  },
};

export const comunidadeListForumTopicsInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["forum"],
  properties: {
    forum: {
      oneOf: [{ type: "integer", minimum: 1 }, { type: "string", minLength: 1 }],
      description:
        "Id ou slug do fórum (ex.: 61, devs-projetos, renda-variavel). Use auvp_comunidade_list_forums.",
    },
    page: {
      type: "integer",
      minimum: 1,
      description: "Página da listagem. Padrão: 1.",
    },
  },
};

export const comunidadeLeaderboardInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    time: {
      type: "string",
      enum: ["week", "month", "year", "all"],
      description: "Janela de tempo do ranking. Padrão: week.",
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 20,
      description: "Quantidade de entradas. Padrão: 5.",
    },
  },
};

export const analiticaGetCurrencyQuoteInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    currency: {
      type: "string",
      minLength: 1,
      default: "USD",
      description: "Currency code, e.g. USD.",
    },
  },
};

export const analiticaListNewsInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["asset"],
  properties: {
    asset: analiticaCodeProperty,
    page: { type: "integer", minimum: 1, default: 1 },
  },
};

export const analiticaListVideosInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["asset"],
  properties: {
    asset: analiticaCodeProperty,
    page: { type: "integer", minimum: 1, default: 1 },
  },
};

export const analiticaGetRentabilityInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ticker"],
  properties: {
    ticker: analiticaCodeProperty,
    period: {
      type: "string",
      minLength: 1,
      default: "1y",
      description: "Rentability period, e.g. 1y, 5y.",
    },
  },
};

export const analiticaGetRentabilityConfigInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ticker"],
  properties: {
    ticker: analiticaCodeProperty,
  },
};

export const analiticaGetFiiSummaryInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ticker"],
  properties: {
    ticker: analiticaCodeProperty,
  },
};

export const analiticaGetCodesDresInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["from", "to", "key"],
  properties: {
    from: { type: "string", minLength: 1, description: "Start year, e.g. 2021." },
    to: { type: "string", minLength: 1, description: "End year, e.g. 2026." },
    key: {
      type: "string",
      minLength: 1,
      description: "DRE metric key, e.g. lucro_liquido.",
    },
  },
};

export const analiticaGetColumnTemplatesInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type"],
  properties: {
    type: {
      type: "string",
      minLength: 1,
      description: "Template type, e.g. balance-stock.",
    },
  },
};

export const analiticaPageRouteInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["path"],
  properties: {
    path: {
      type: "string",
      pattern:
        "^/(?:acoes(?:/(?:[A-Za-z0-9._-]+|agenda-de-dividendos|busca-avancada|comparar|previsao-de-dividendos))?|ativos/[A-Za-z0-9._-]+|agenda-de-resultados|busca-avancada|calculadoras|etfs|fiiagros|fiis|indices|noticias|rankings(?:/(?:acoes|stocks)(?:/[a-z0-9_]+)?)?|reits|renda-fixa|simulador-de-rentabilidade|stocks)/?$",
      description:
        "Analitica page route observed in the HAR, e.g. /acoes/BBAS3 or /rankings/stocks/upside_graham.",
    },
    rsc: {
      type: "string",
      minLength: 1,
      description:
        "Optional Next.js _rsc query token when requesting a React Server Component payload.",
    },
  },
};

const financasIdProperty = {
  oneOf: [
    { type: "integer", minimum: 1 },
    { type: "string", pattern: "^\\d+$" },
  ],
};

export const financasAccountIdInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["accountId"],
  properties: {
    accountId: { type: "string", minLength: 1, description: "Account id." },
  },
};

export const financasTransactionIdInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["transactionId"],
  properties: {
    transactionId: {
      ...financasIdProperty,
      description: "Transaction id.",
    },
  },
};

export const financasCategoryIdInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["categoryId"],
  properties: {
    categoryId: {
      ...financasIdProperty,
      description: "Category id.",
    },
  },
};

export const financasTagIdInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["tagId"],
  properties: {
    tagId: {
      ...financasIdProperty,
      description: "Tag id.",
    },
  },
};

export const financasBudgetIdInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["budgetId"],
  properties: {
    budgetId: {
      ...financasIdProperty,
      description: "Budget id.",
    },
  },
};

const financasAccountTypeProperty = {
  type: "string",
  enum: ["BANK", "CREDIT", "bank", "credit"],
  description: "Tipo da conta: BANK ou CREDIT.",
};

const financasBankSubtypeProperty = {
  type: "string",
  enum: ["CHECKING_ACCOUNT", "SAVINGS_ACCOUNT"],
  description: "Subtipo para contas BANK.",
};

export const createManualAccountInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "type", "subtype", "number", "balance"],
  properties: {
    name: { type: "string", minLength: 1, description: "Nome exibido da conta." },
    type: financasAccountTypeProperty,
    subtype: {
      oneOf: [
        financasBankSubtypeProperty,
        { type: "string", enum: ["CREDIT_CARD"], description: "Subtipo para CREDIT." },
      ],
    },
    number: { type: "string", minLength: 1, description: "Número da conta ou cartão." },
    balance: {
      type: "number",
      description: "Saldo inicial numérico (não string).",
    },
    bankCode: {
      type: "integer",
      description: "Código do banco (opcional, contas BANK).",
    },
    creditData: {
      type: "object",
      additionalProperties: false,
      properties: {
        brand: { type: "string", minLength: 1, description: "Bandeira do cartão." },
      },
      description: "Dados do cartão quando type=CREDIT.",
    },
  },
};

export const createManualTransactionInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["accountId", "amount", "type", "description", "date"],
  properties: {
    accountId: {
      oneOf: [
        { type: "integer", minimum: 1 },
        { type: "string", pattern: "^\\d+$" },
      ],
      description: "ID da conta (campo accountId, não user_account_id).",
    },
    amount: { type: "number", description: "Valor da transação." },
    type: { type: "string", enum: ["DEBIT", "CREDIT", "debit", "credit"] },
    description: { type: "string", minLength: 1 },
    date: {
      type: "string",
      minLength: 1,
      description: "Data no formato dd-MM-yyyy HH:mm observado no frontend.",
    },
    budgetId: financasIdProperty,
    categoryId: financasIdProperty,
    userCategoryId: {
      oneOf: [{ type: "integer", minimum: 1 }, { type: "string", pattern: "^\\d+$" }, { type: "null" }],
    },
    referenceMonth: {
      type: "string",
      format: "date-time",
      description: "Mês de referência ISO (opcional).",
    },
    tagIds: {
      type: "array",
      items: { type: "integer", minimum: 1 },
    },
    ignore: { type: "boolean" },
    observations: { type: "string" },
    isRecurrent: { type: "boolean" },
    recurrenceInDays: { type: "integer", minimum: 1 },
  },
};

export const createCategoryInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["description"],
  properties: {
    description: {
      type: "string",
      minLength: 1,
      description:
        "Descrição da categoria. POST /categories é catálogo Pluggy; pode exigir permissão admin.",
    },
  },
};

export const createTagInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "color"],
  properties: {
    name: { type: "string", minLength: 1 },
    color: {
      type: "string",
      pattern: "^#[0-9A-Fa-f]{6}$",
      description: "Cor em hexadecimal, ex.: #ff00ff.",
    },
  },
};

export const financasJsonBodyInputSchema: InputSchema = {
  type: "object",
  additionalProperties: true,
  required: ["body"],
  properties: {
    body: {
      type: "object",
      additionalProperties: true,
      description: "JSON body sent to the Finanças API.",
    },
  },
};

export const financasUpdateTransactionInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["transactionId"],
  properties: {
    transactionId: financasIdProperty,
    body: {
      type: "object",
      additionalProperties: true,
      description:
        "Partial transaction payload. For tags only, send { tagIds: [1, 2] }.",
    },
    tagIds: {
      type: "array",
      items: { type: "integer", minimum: 1 },
      description: "Shortcut for { body: { tagIds: [...] } }.",
    },
  },
};

export const financasCreatePluggyTokenInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    body: {
      type: "object",
      additionalProperties: true,
      description: "Optional Pluggy connect-token payload.",
    },
  },
};
