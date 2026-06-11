/**
 * Rotas observadas em analitica.auvp.com.br.
 * Validado com Scrapling (XHR + probe REST + scan JS) em 2026-06-11.
 */
export interface AnaliticaApiRoute {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  queryKeys?: string[];
  write?: boolean;
  description: string;
  note?: string;
}

export interface AnaliticaPageRoute {
  path: string;
  description: string;
}

export const ANALITICA_BASE = "https://analitica.auvp.com.br";

export const ANALITICA_API_ROUTES: readonly AnaliticaApiRoute[] = [
  { method: "GET", path: "/api/session", description: "Sessão atual." },
  { method: "GET", path: "/api/feature-flags/user", description: "Feature flags do usuário." },
  { method: "GET", path: "/api/videos/in-live", description: "Status de vídeo ao vivo." },
  { method: "GET", path: "/api/auth/is-premium", description: "Verifica plano premium." },
  { method: "GET", path: "/api/auth/me", description: "Usuário autenticado." },
  { method: "GET", path: "/api/onboard/start", description: "Início do onboarding." },
  { method: "GET", path: "/api/onboard", queryKeys: ["scope"], description: "Estado do onboarding." },
  { method: "GET", path: "/api/subscriptions", description: "Assinaturas." },
  { method: "GET", path: "/api/subscriptions/status", description: "Status da assinatura." },
  { method: "GET", path: "/api/notifications", description: "Notificações." },
  { method: "GET", path: "/api/users/:userId", description: "Perfil de usuário." },
  { method: "GET", path: "/api/users/:userId/meta/last-answer-feedback", description: "Último feedback de resposta." },
  { method: "GET", path: "/api/views", queryKeys: ["limit"], description: "Visualizações recentes." },
  { method: "GET", path: "/api/views/most-viewed", queryKeys: ["companyType", "limit"], description: "Mais visualizados." },
  { method: "GET", path: "/api/codes", queryKeys: ["code"], description: "Dados de um ativo." },
  {
    method: "GET",
    path: "/api/codes/dres",
    queryKeys: ["from", "to", "key"],
    description: "Série DRE comparativa (usado no comparador).",
  },
  { method: "GET", path: "/api/codes/ranked-by-rating", queryKeys: ["rating_type", "limit", "page", "type"], description: "Ranking por rating." },
  { method: "GET", path: "/api/credits", description: "Créditos de visualização (assets, tools)." },
  { method: "GET", path: "/api/currency-quote", queryKeys: ["currency"], description: "Cotação de moeda (ex. USD)." },
  {
    method: "GET",
    path: "/api/column-templates",
    queryKeys: ["type"],
    description: "Templates de colunas (balanço, DRE, etc.).",
  },
  { method: "GET", path: "/api/quotes/:ticker", queryKeys: ["period"], description: "Cotações." },
  { method: "GET", path: "/api/balance", queryKeys: ["codes", "dres", "formatted", "frequency", "indicators", "period", "from", "to"], description: "Balanço." },
  { method: "GET", path: "/api/dres", queryKeys: ["aggregate", "asset", "dre", "is_fund", "period"], description: "DREs." },
  { method: "GET", path: "/api/dividends", queryKeys: ["aggregate", "code", "period"], description: "Dividendos." },
  { method: "GET", path: "/api/share-holders", queryKeys: ["ticker"], description: "Composição acionária." },
  { method: "GET", path: "/api/reviews", queryKeys: ["code"], description: "Reviews." },
  { method: "GET", path: "/api/documents", queryKeys: ["code", "from", "page", "to", "type"], description: "Documentos." },
  { method: "GET", path: "/api/alerts", queryKeys: ["asset"], description: "Alertas." },
  { method: "GET", path: "/api/favorites/list", description: "Favoritos." },
  { method: "GET", path: "/api/assets-config", queryKeys: ["companyType", "countryType"], description: "Config de ativos." },
  {
    method: "GET",
    path: "/api/fii-summary/:ticker",
    description: "Resumo de FII (métricas da página do fundo).",
  },
  { method: "GET", path: "/api/index/list-with-last-quote", description: "Índices com última cotação." },
  { method: "GET", path: "/api/news", queryKeys: ["asset", "page"], description: "Notícias por ativo." },
  { method: "GET", path: "/api/news/categories", description: "Categorias de notícias." },
  { method: "GET", path: "/api/pay-wall", description: "Páginas e limites do paywall." },
  { method: "GET", path: "/api/rate/list-with-last-value", description: "Taxas CDI, Selic, IPCA, IGP-M." },
  {
    method: "GET",
    path: "/api/rentability/:ticker",
    queryKeys: ["period"],
    description: "Simulador de rentabilidade do ativo.",
  },
  {
    method: "GET",
    path: "/api/rentability/config/:ticker",
    description: "Config do simulador (ex. min_year).",
  },
  { method: "GET", path: "/api/videos", queryKeys: ["asset", "page"], description: "Vídeos/análises por ativo." },
  {
    method: "GET",
    path: "/api/search",
    queryKeys: ["q"],
    description: "Busca de ativos.",
    note: "Requer parâmetros específicos; probe com q= retorna 400.",
  },
  {
    method: "GET",
    path: "/api/indicators",
    description: "Indicadores agregados.",
    note: "Existe na API; parâmetros exatos a confirmar na busca avançada.",
  },
  {
    method: "GET",
    path: "/api/segments",
    description: "Segmentos de mercado.",
    note: "Probe sem params retorna 400.",
  },
  {
    method: "GET",
    path: "/api/sectors",
    description: "Setores de mercado.",
    note: "Probe sem params retorna 400.",
  },
  { method: "POST", path: "/api/bff", queryKeys: ["key"], write: true, description: "BFF agregador (home-rankings, asset-image-tooltip)." },
  { method: "GET", path: "/rankings/:segment/:rankingType", queryKeys: ["page", "limit"], description: "Payload RSC de ranking.", note: "Resposta HTML/RSC, não JSON puro." },
];

export const ANALITICA_PAGE_ROUTES: readonly AnaliticaPageRoute[] = [
  { path: "/acoes", description: "Lista de ações." },
  { path: "/acoes/:ticker", description: "Página de ação." },
  { path: "/acoes/agenda-de-dividendos", description: "Agenda de dividendos." },
  { path: "/acoes/busca-avancada", description: "Busca avançada." },
  { path: "/acoes/comparar", description: "Comparador." },
  { path: "/acoes/previsao-de-dividendos", description: "Previsão de dividendos." },
  { path: "/agenda-de-resultados", description: "Agenda de resultados." },
  { path: "/ativos/:ticker", description: "Ativo genérico." },
  { path: "/busca-avancada", description: "Busca avançada global." },
  { path: "/calculadoras", description: "Calculadoras." },
  { path: "/etfs", description: "ETFs." },
  { path: "/fiiagros", description: "FII Agros." },
  { path: "/fiis", description: "FIIs." },
  { path: "/indices", description: "Índices." },
  { path: "/noticias", description: "Notícias." },
  { path: "/rankings", description: "Rankings." },
  { path: "/rankings/acoes", description: "Rankings de ações." },
  { path: "/rankings/acoes/:rankingType", description: "Ranking específico BR." },
  { path: "/rankings/stocks", description: "Rankings US stocks." },
  { path: "/rankings/stocks/:rankingType", description: "Ranking específico US." },
  { path: "/reits", description: "REITs." },
  { path: "/renda-fixa", description: "Renda fixa." },
  { path: "/simulador-de-rentabilidade", description: "Simulador." },
  { path: "/stocks", description: "Stocks US." },
  { path: "/fiis/:ticker", description: "Página de FII." },
  { path: "/stocks/:ticker", description: "Página de stock US." },
];

export function listAnaliticaObservedRoutes(): {
  apiRoutes: string[];
  pageRoutes: string[];
  writeOperations: string[];
} {
  return {
    apiRoutes: ANALITICA_API_ROUTES.map(
      (route) =>
        `${route.method} ${route.path}${route.queryKeys?.length ? `?${route.queryKeys.join("&")}` : ""}${route.note ? ` (${route.note})` : ""}`,
    ),
    pageRoutes: ANALITICA_PAGE_ROUTES.map((route) => route.path),
    writeOperations: ANALITICA_API_ROUTES.filter((route) => route.write).map(
      (route) => `${route.method} ${route.path}`,
    ),
  };
}
