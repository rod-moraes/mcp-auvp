export interface DicionarioRoute {
  method: "GET";
  path: string;
  queryKeys?: readonly string[];
  description: string;
}

export const DICIONARIO_API_ROUTES: readonly DicionarioRoute[] = [
  {
    method: "GET",
    path: "/dictionary",
    queryKeys: ["page", "search", "categories", "letter", "pending", "author"],
    description: "Pesquisa paginada de termos do Dicionário do Mercado.",
  },
  {
    method: "GET",
    path: "/dictionary/:termId",
    description: "Detalhe de um termo.",
  },
] as const;

export function listDicionarioObservedRoutes(): {
  apiBase: string;
  page: string;
  routes: readonly DicionarioRoute[];
} {
  return {
    apiBase: "https://worker.auvp.com.br",
    page: "https://comunidade.auvp.com.br/dicion%C3%A1rio/",
    routes: DICIONARIO_API_ROUTES,
  };
}
