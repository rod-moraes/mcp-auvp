/**
 * Rotas observadas em comunidade.auvp.com.br (Invision Community / IPS Suite).
 * Validado com Scrapling (probe + XHR) em 2026-06-11.
 */
export interface ComunidadeApiRoute {
  method: "GET" | "POST";
  path: string;
  queryKeys?: string[];
  write?: boolean;
  description: string;
  note?: string;
}

export interface ComunidadePageRoute {
  path: string;
  description: string;
}

export const COMUNIDADE_BASE = "https://comunidade.auvp.com.br";

/** Rotas HTTP/AJAX usadas pelo MCP. */
export const COMUNIDADE_API_ROUTES: readonly ComunidadeApiRoute[] = [
  {
    method: "GET",
    path: "/search/",
    queryKeys: [
      "q",
      "search_and_or",
      "search_in",
      "sortby",
      "type",
      "nodes",
      "page",
    ],
    description:
      "Busca na comunidade; com header X-Requested-With retorna JSON (title, content HTML, filters).",
  },
  {
    method: "GET",
    path: "/notifications/",
    description: "Notificações do usuário; JSON com campo data (HTML).",
  },
  {
    method: "GET",
    path: "/index.php",
    queryKeys: [
      "app",
      "module",
      "controller",
      "do",
      "time",
      "limit",
      "orientation",
    ],
    description:
      "Widgets IPS (topContributors, mostSolved) via app=core&module=system&controller=ajax.",
  },
  {
    method: "GET",
    path: "/",
    queryKeys: ["forumId", "page"],
    description: "Listagem de tópicos de um fórum (?forumId=).",
    note: "Resposta HTML; parser em forum-topics.ts.",
  },
  {
    method: "GET",
    path: "/topic/:topicId-:slug/",
    description: "HTML do tópico com posts e comentários.",
    note: "Parser em topic.ts.",
  },
  {
    method: "GET",
    path: "/forum/:forumId-:slug/",
    description: "URL legada de fórum; AJAX retorna redirect para ?forumId=.",
    note: "Preferir ?forumId= para listagem.",
  },
  {
    method: "GET",
    path: "/forums/",
    description: "Índice de fóruns (HTML).",
    note: "Catálogo estático em forums.ts.",
  },
  {
    method: "GET",
    path: "/profile/:memberId-:slug/",
    description: "Perfil de membro (HTML).",
    note: "Sem tool dedicada; use busca ou widgets.",
  },
  {
    method: "GET",
    path: "/api/core/hello",
    description: "REST IPS (exige API key).",
    note: "Probe retorna NO_API_KEY sem chave de API.",
  },
  {
    method: "GET",
    path: "/api/forums/topics/:topicId",
    description: "REST IPS — tópico por id.",
    note: "Exige API key.",
  },
  {
    method: "GET",
    path: "/api/forums/forums/:forumId",
    description: "REST IPS — fórum por id.",
    note: "Exige API key.",
  },
  {
    method: "GET",
    path: "/api/core/members/me",
    description: "REST IPS — membro autenticado.",
    note: "Exige API key.",
  },
];

/** Rotas de página IPS úteis para disparar AJAX na descoberta. */
export const COMUNIDADE_PAGE_ROUTES: readonly ComunidadePageRoute[] = [
  { path: "/", description: "Home da comunidade." },
  { path: "/search/", description: "Interface de busca." },
  { path: "/forums/", description: "Índice de fóruns." },
  { path: "/?forumId=:forumId", description: "Listagem de tópicos." },
  { path: "/topic/:topicId-:slug/", description: "Tópico." },
  { path: "/forum/:forumId-:slug/", description: "Fórum (redirect)." },
  { path: "/profile/:memberId-:slug/", description: "Perfil de membro." },
  { path: "/notifications/", description: "Notificações." },
];

/** Valores observados do parâmetro type em /search/. */
export const COMUNIDADE_SEARCH_CONTENT_TYPES = [
  "forums_topic",
  "core_statuses_status",
  "calendar_event",
  "cms_pages_pageitem",
  "cms_records1",
] as const;

export const COMUNIDADE_LEADERBOARD_TIME_VALUES = [
  "week",
  "month",
  "year",
  "all",
] as const;

export function listComunidadeObservedRoutes(): {
  apiRoutes: string[];
  pageRoutes: string[];
  searchContentTypes: string[];
  leaderboardTimeValues: string[];
  writeOperations: string[];
} {
  return {
    apiRoutes: COMUNIDADE_API_ROUTES.map(
      (route) =>
        `${route.method} ${route.path}${route.queryKeys?.length ? `?${route.queryKeys.join("&")}` : ""}${route.note ? ` (${route.note})` : ""}`,
    ),
    pageRoutes: COMUNIDADE_PAGE_ROUTES.map((route) => route.path),
    searchContentTypes: [...COMUNIDADE_SEARCH_CONTENT_TYPES],
    leaderboardTimeValues: [...COMUNIDADE_LEADERBOARD_TIME_VALUES],
    writeOperations: COMUNIDADE_API_ROUTES.filter((route) => route.write).map(
      (route) => `${route.method} ${route.path}`,
    ),
  };
}
