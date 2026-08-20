import type { QueryParams } from "../core/query.js";
import {
  analiticaAssetTooltipInputSchema,
  analiticaCreditPortfolioInputSchema,
  analiticaGetAlertsInputSchema,
  analiticaGetAssetsConfigInputSchema,
  analiticaGetBalanceInputSchema,
  analiticaGetCodeInputSchema,
  analiticaGetCodesDresInputSchema,
  analiticaGetColumnTemplatesInputSchema,
  analiticaGetCurrencyQuoteInputSchema,
  analiticaGetDividendsInputSchema,
  analiticaGetDocumentsInputSchema,
  analiticaGetDresInputSchema,
  analiticaGetFiiSummaryInputSchema,
  analiticaGetQuotesInputSchema,
  analiticaGetRankingInputSchema,
  analiticaGetRentabilityConfigInputSchema,
  analiticaGetRentabilityInputSchema,
  analiticaGetReviewsInputSchema,
  analiticaGetShareHoldersInputSchema,
  analiticaHomeRankingInputSchema,
  analiticaListNewsInputSchema,
  analiticaListVideosInputSchema,
  analiticaListViewsInputSchema,
  analiticaMostViewedInputSchema,
  analiticaOnboardInputSchema,
  analiticaPageRouteInputSchema,
  analiticaRankCodesByRatingInputSchema,
  analiticaUserInputSchema,
  emptyInputSchema,
} from "../mcp/schemas/json.js";
import {
  analiticaAssetTooltipSchema,
  analiticaCreditPortfolioSchema,
  analiticaGetAlertsSchema,
  analiticaGetAssetsConfigSchema,
  analiticaGetBalanceSchema,
  analiticaGetCodeSchema,
  analiticaGetCodesDresSchema,
  analiticaGetColumnTemplatesSchema,
  analiticaGetCurrencyQuoteSchema,
  analiticaGetDividendsSchema,
  analiticaGetDocumentsSchema,
  analiticaGetDresSchema,
  analiticaGetFiiSummarySchema,
  analiticaGetQuotesSchema,
  analiticaGetRankingSchema,
  analiticaGetRentabilityConfigSchema,
  analiticaGetRentabilitySchema,
  analiticaGetReviewsSchema,
  analiticaGetShareHoldersSchema,
  analiticaHomeRankingSchema,
  analiticaListNewsSchema,
  analiticaListVideosSchema,
  analiticaListViewsSchema,
  analiticaMostViewedSchema,
  analiticaOnboardSchema,
  analiticaPageRouteSchema,
  analiticaRankCodesByRatingSchema,
  analiticaUserSchema,
  emptyArgsSchema,
} from "../mcp/schemas/zod.js";
import { listAnaliticaObservedRoutes } from "./catalog.js";
import { fetchAnaliticaRanking } from "./ranking.js";
import {
  defineTool,
  jsonResult,
  type ToolDefinition,
} from "../mcp/tool-utils.js";

function definedAnaliticaQuery(
  params: Record<string, QueryParams[string]>,
): QueryParams {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}

export const analiticaToolDefinitions: ToolDefinition[] = [
  defineTool(
    "auvp_analitica_list_observed_routes",
    "Lista rotas API e páginas observadas em analitica.auvp.com.br (catálogo do HAR + probes).",
    emptyInputSchema,
    async (_client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(listAnaliticaObservedRoutes());
    },
  ),
  defineTool(
    "auvp_analitica_get_session",
    "Get the current Analitica session id from /api/session.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/session"));
    },
  ),
  defineTool(
    "auvp_analitica_get_me",
    "Get the current Analitica user profile from /api/auth/me.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/auth/me"));
    },
  ),
  defineTool(
    "auvp_analitica_is_premium",
    "Get the Analitica premium flag from /api/auth/is-premium.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/auth/is-premium"));
    },
  ),
  defineTool(
    "auvp_analitica_get_feature_flags",
    "Get Analitica feature flags for the current user.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/feature-flags/user"));
    },
  ),
  defineTool(
    "auvp_analitica_get_live_video_status",
    "Get Analitica live-video status from /api/videos/in-live.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/videos/in-live"));
    },
  ),
  defineTool(
    "auvp_analitica_get_onboard_start",
    "Get Analitica onboard start status from /api/onboard/start.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/onboard/start"));
    },
  ),
  defineTool(
    "auvp_analitica_get_onboard",
    "Get Analitica onboard progress for a scope, such as rankings.",
    analiticaOnboardInputSchema,
    async (client, args) => {
      const parsed = analiticaOnboardSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/onboard", { scope: parsed.scope }),
      );
    },
  ),
  defineTool(
    "auvp_analitica_list_subscriptions",
    "List Analitica subscriptions for the current user.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/subscriptions"));
    },
  ),
  defineTool(
    "auvp_analitica_get_subscription_status",
    "Get the current Analitica subscription status.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/subscriptions/status"));
    },
  ),
  defineTool(
    "auvp_analitica_list_notifications",
    "List Analitica notifications for the current user.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/notifications"));
    },
  ),
  defineTool(
    "auvp_analitica_get_user",
    "Get an Analitica user by id.",
    analiticaUserInputSchema,
    async (client, args) => {
      const parsed = analiticaUserSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica(`/api/users/${parsed.userId}`));
    },
  ),
  defineTool(
    "auvp_analitica_get_last_answer_feedback",
    "Get the Analitica last-answer-feedback metadata for a user.",
    analiticaUserInputSchema,
    async (client, args) => {
      const parsed = analiticaUserSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica(
          `/api/users/${parsed.userId}/meta/last-answer-feedback`,
        ),
      );
    },
  ),
  defineTool(
    "auvp_analitica_list_views",
    "List recently viewed Analitica assets.",
    analiticaListViewsInputSchema,
    async (client, args) => {
      const parsed = analiticaListViewsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/views", parsed));
    },
  ),
  defineTool(
    "auvp_analitica_list_most_viewed",
    "List most-viewed Analitica assets, optionally filtered by companyType.",
    analiticaMostViewedInputSchema,
    async (client, args) => {
      const parsed = analiticaMostViewedSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/views/most-viewed", parsed),
      );
    },
  ),
  defineTool(
    "auvp_analitica_rank_codes_by_rating",
    "List Analitica asset codes ranked by a rating color/type.",
    analiticaRankCodesByRatingInputSchema,
    async (client, args) => {
      const parsed = analiticaRankCodesByRatingSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/codes/ranked-by-rating", {
          rating_type: parsed.ratingType,
          limit: parsed.limit,
          page: parsed.page,
          type: parsed.type,
        }),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_home_ranking",
    "Get the short Analitica home ranking preview (about 3 items) through POST /api/bff?key=home-rankings. For full paginated rankings, use auvp_analitica_get_ranking.",
    analiticaHomeRankingInputSchema,
    async (client, args) => {
      const parsed = analiticaHomeRankingSchema.parse(args ?? {});
      return jsonResult(
        await client.postAnalitica(
          "/api/bff",
          {
            companyType: parsed.companyType,
            country: parsed.country,
            rankingType: parsed.rankingType,
          },
          { key: "home-rankings" },
        ),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_ranking",
    "Get a paginated Analitica ranking from GET /rankings/{segment}/{rankingType}?page&limit (Next.js RSC payload). Each row includes columns matching the site table: cotacao, viabilidade (optional), ranking metric (varies by rankingType), p_l, p_vp, valor_mercado, roe, roa, media_hist_setor and media_atual_setor. Example: segment=acoes, rankingType=dividend_yield, page=1, limit=50. Set includeViabilidade=true to fetch the viability seal (blue/green/yellow/red). Defaults to page=1 and limit=50.",
    analiticaGetRankingInputSchema,
    async (client, args) => {
      const parsed = analiticaGetRankingSchema.parse(args ?? {});

      return jsonResult(
        await fetchAnaliticaRanking(client, {
          segment: parsed.segment,
          rankingType: parsed.rankingType,
          page: parsed.page,
          limit: parsed.limit,
          includeViabilidade: parsed.includeViabilidade,
          includeIndicators: parsed.includeIndicators,
        }),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_code",
    "Get Analitica asset metadata from GET /api/codes?code.",
    analiticaGetCodeInputSchema,
    async (client, args) => {
      const parsed = analiticaGetCodeSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/codes", { code: parsed.code }),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_quotes",
    "Get Analitica price quotes from GET /api/quotes/:ticker.",
    analiticaGetQuotesInputSchema,
    async (client, args) => {
      const parsed = analiticaGetQuotesSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica(
          `/api/quotes/${encodeURIComponent(parsed.ticker)}`,
          definedAnaliticaQuery({ period: parsed.period }),
        ),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_balance",
    "Get Analitica balance sheet data from GET /api/balance.",
    analiticaGetBalanceInputSchema,
    async (client, args) => {
      const parsed = analiticaGetBalanceSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica(
          "/api/balance",
          definedAnaliticaQuery({
            codes: parsed.codes,
            dres: parsed.dres,
            formatted: parsed.formatted,
            frequency: parsed.frequency,
            indicators: parsed.indicators,
            period: parsed.period,
            from: parsed.from,
            to: parsed.to,
          }),
        ),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_dres",
    "Get Analitica income statement (DRE) data from GET /api/dres.",
    analiticaGetDresInputSchema,
    async (client, args) => {
      const parsed = analiticaGetDresSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica(
          "/api/dres",
          definedAnaliticaQuery({
            aggregate: parsed.aggregate,
            asset: parsed.asset,
            dre: parsed.dre,
            is_fund: parsed.is_fund,
            period: parsed.period,
          }),
        ),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_dividends",
    "Get Analitica dividend history from GET /api/dividends.",
    analiticaGetDividendsInputSchema,
    async (client, args) => {
      const parsed = analiticaGetDividendsSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica(
          "/api/dividends",
          definedAnaliticaQuery({
            aggregate: parsed.aggregate,
            code: parsed.code,
            period: parsed.period,
          }),
        ),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_share_holders",
    "Get Analitica shareholder composition from GET /api/share-holders?ticker.",
    analiticaGetShareHoldersInputSchema,
    async (client, args) => {
      const parsed = analiticaGetShareHoldersSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/share-holders", {
          ticker: parsed.ticker,
        }),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_reviews",
    "Get Analitica asset reviews from GET /api/reviews?code.",
    analiticaGetReviewsInputSchema,
    async (client, args) => {
      const parsed = analiticaGetReviewsSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/reviews", { code: parsed.code }),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_documents",
    "Get Analitica asset documents from GET /api/documents.",
    analiticaGetDocumentsInputSchema,
    async (client, args) => {
      const parsed = analiticaGetDocumentsSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica(
          "/api/documents",
          definedAnaliticaQuery({
            code: parsed.code,
            from: parsed.from,
            page: parsed.page,
            to: parsed.to,
            type: parsed.type,
          }),
        ),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_alerts",
    "Get Analitica asset alerts from GET /api/alerts?asset.",
    analiticaGetAlertsInputSchema,
    async (client, args) => {
      const parsed = analiticaGetAlertsSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/alerts", { asset: parsed.asset }),
      );
    },
  ),
  defineTool(
    "auvp_analitica_list_favorites",
    "List Analitica favorites from GET /api/favorites/list.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/favorites/list"));
    },
  ),
  defineTool(
    "auvp_analitica_get_assets_config",
    "Get Analitica asset configuration from GET /api/assets-config.",
    analiticaGetAssetsConfigInputSchema,
    async (client, args) => {
      const parsed = analiticaGetAssetsConfigSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica(
          "/api/assets-config",
          definedAnaliticaQuery({
            companyType: parsed.companyType,
            countryType: parsed.countryType,
          }),
        ),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_asset_tooltip",
    "Get Analitica asset tooltip details through POST /api/bff?key=asset-image-tooltip.",
    analiticaAssetTooltipInputSchema,
    async (client, args) => {
      const parsed = analiticaAssetTooltipSchema.parse(args ?? {});
      return jsonResult(
        await client.postAnalitica(
          "/api/bff",
          { code: parsed.code },
          { key: "asset-image-tooltip" },
        ),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_credits",
    "Get Analitica view credits (assets and tools quotas) from GET /api/credits.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/credits"));
    },
  ),
  defineTool(
    "auvp_analitica_get_currency_quote",
    "Get Analitica currency quote from GET /api/currency-quote?currency.",
    analiticaGetCurrencyQuoteInputSchema,
    async (client, args) => {
      const parsed = analiticaGetCurrencyQuoteSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/currency-quote", {
          currency: parsed.currency,
        }),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_credit_portfolio",
    "Get credit-portfolio composition from GET /api/credit-portfolio by company id and report dimension.",
    analiticaCreditPortfolioInputSchema,
    async (client, args) => {
      const parsed = analiticaCreditPortfolioSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/credit-portfolio", {
          companyId: parsed.companyId,
          report: parsed.report,
          period: parsed.period,
          aggregate: parsed.aggregate,
        }),
      );
    },
  ),
  defineTool(
    "auvp_analitica_list_indices_quotes",
    "List Analitica indices with last quote from GET /api/index/list-with-last-quote.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/index/list-with-last-quote"),
      );
    },
  ),
  defineTool(
    "auvp_analitica_list_rates",
    "List Analitica benchmark rates (CDI, Selic, IPCA, IGP-M) from GET /api/rate/list-with-last-value.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/rate/list-with-last-value"),
      );
    },
  ),
  defineTool(
    "auvp_analitica_list_news",
    "List Analitica news for an asset from GET /api/news?asset&page.",
    analiticaListNewsInputSchema,
    async (client, args) => {
      const parsed = analiticaListNewsSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/news", {
          asset: parsed.asset,
          page: parsed.page,
        }),
      );
    },
  ),
  defineTool(
    "auvp_analitica_list_news_categories",
    "List Analitica news categories from GET /api/news/categories.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/news/categories"));
    },
  ),
  defineTool(
    "auvp_analitica_list_videos",
    "List Analitica videos/analyses for an asset from GET /api/videos?asset&page.",
    analiticaListVideosInputSchema,
    async (client, args) => {
      const parsed = analiticaListVideosSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/videos", {
          asset: parsed.asset,
          page: parsed.page,
        }),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_pay_wall",
    "Get Analitica paywall pages and limits from GET /api/pay-wall.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getAnalitica("/api/pay-wall"));
    },
  ),
  defineTool(
    "auvp_analitica_get_rentability",
    "Get Analitica rentability simulator data from GET /api/rentability/:ticker?period.",
    analiticaGetRentabilityInputSchema,
    async (client, args) => {
      const parsed = analiticaGetRentabilitySchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica(
          `/api/rentability/${encodeURIComponent(parsed.ticker)}`,
          { period: parsed.period },
        ),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_rentability_config",
    "Get Analitica rentability simulator config from GET /api/rentability/config/:ticker.",
    analiticaGetRentabilityConfigInputSchema,
    async (client, args) => {
      const parsed = analiticaGetRentabilityConfigSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica(
          `/api/rentability/config/${encodeURIComponent(parsed.ticker)}`,
        ),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_fii_summary",
    "Get Analitica FII summary metrics from GET /api/fii-summary/:ticker.",
    analiticaGetFiiSummaryInputSchema,
    async (client, args) => {
      const parsed = analiticaGetFiiSummarySchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica(
          `/api/fii-summary/${encodeURIComponent(parsed.ticker)}`,
        ),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_codes_dres",
    "Get comparative DRE series from GET /api/codes/dres?from&to&key (comparador).",
    analiticaGetCodesDresInputSchema,
    async (client, args) => {
      const parsed = analiticaGetCodesDresSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/codes/dres", {
          from: parsed.from,
          to: parsed.to,
          key: parsed.key,
        }),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_column_templates",
    "Get Analitica column templates from GET /api/column-templates?type.",
    analiticaGetColumnTemplatesInputSchema,
    async (client, args) => {
      const parsed = analiticaGetColumnTemplatesSchema.parse(args ?? {});
      return jsonResult(
        await client.getAnalitica("/api/column-templates", {
          type: parsed.type,
        }),
      );
    },
  ),
  defineTool(
    "auvp_analitica_get_page_route",
    "Fetch an Analitica page route observed in the HAR as raw HTML/RSC text.",
    analiticaPageRouteInputSchema,
    async (client, args) => {
      const parsed = analiticaPageRouteSchema.parse(args ?? {});
      return jsonResult({
        path: parsed.path,
        text: await client.getAnaliticaText(parsed.path, { _rsc: parsed.rsc }),
      });
    },
  ),
];
