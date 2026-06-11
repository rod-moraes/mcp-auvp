/**
 * Rotas observadas em financas.auvp.com.br / financas-api.auvp.com.br.
 * Validadas via scan de bundles JS + probe HTTP + XHR Scrapling (2026-06-11).
 */
export interface FinancasApiRoute {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  queryKeys?: string[];
  write?: boolean;
  description: string;
  /** Observação de probe ao vivo (status, permissão, etc.). */
  note?: string;
}

export interface FinancasPageRoute {
  path: string;
  description: string;
}

export const FINANCAS_API_BASE = "https://financas-api.auvp.com.br";
export const FINANCAS_ORIGIN = "https://financas.auvp.com.br";

/** Rotas REST confirmadas na API (financas-api.auvp.com.br). */
export const FINANCAS_API_ROUTES: readonly FinancasApiRoute[] = [
  { method: "GET", path: "/auth/redirect-url", queryKeys: ["provider"], description: "Inicia fluxo SSO OIDC (redirect 302)." },
  {
    method: "POST",
    path: "/auth/validate-token",
    description: "Valida JWT (body: { token }). Usado pelo frontend.",
    note: "Probe vazio retorna 500; não expor como tool de escrita.",
  },
  {
    method: "POST",
    path: "/auth/refresh-token",
    description: "Renova access_token (body: { token }). Usado pelo frontend.",
    note: "Probe vazio retorna 500; renovação via auvp_ensure_auth no MCP.",
  },
  { method: "GET", path: "/users/profile", description: "Perfil do usuário logado." },
  { method: "GET", path: "/users", description: "Dados do usuário.", note: "403 em planos sem permissão." },
  { method: "GET", path: "/accounts", description: "Lista contas; inclui accountsSummary agregado." },
  { method: "GET", path: "/accounts/lastTransactions", description: "Últimas transações por conta." },
  { method: "GET", path: "/accounts/:accountId", description: "Detalhe de uma conta." },
  { method: "POST", path: "/accounts/manual", write: true, description: "Cria conta manual." },
  { method: "PATCH", path: "/accounts/:accountId", write: true, description: "Atualiza conta." },
  { method: "DELETE", path: "/accounts/:accountId", write: true, description: "Remove conta." },
  { method: "GET", path: "/transactions", queryKeys: ["page", "limit", "referenceMonth", "sortBy", "sortOrder", "status", "type", "accountIds"], description: "Lista transações com filtros; retorna totals e filtered." },
  {
    method: "GET",
    path: "/transactions/export",
    queryKeys: ["referenceMonth", "accountIds", "status", "type"],
    description: "Exporta transações (provável CSV/planilha).",
    note: "400 sem filtros válidos; contrato exato observado no frontend.",
  },
  { method: "GET", path: "/transactions/:transactionId", description: "Detalhe de uma transação." },
  { method: "POST", path: "/transactions/manual", write: true, description: "Cria transação manual." },
  { method: "PATCH", path: "/transactions/:transactionId", write: true, description: "Atualiza transação (tags, campos editáveis)." },
  { method: "DELETE", path: "/transactions/:transactionId", write: true, description: "Remove transação." },
  { method: "GET", path: "/dashboard", queryKeys: ["date"], description: "Dashboard do mês (date em MM-YYYY)." },
  { method: "GET", path: "/dashboard/cashflow", queryKeys: ["startDate", "endDate"], description: "Fluxo de caixa por período (DD/MM/YYYY)." },
  { method: "GET", path: "/budgets", description: "Metas/categorias de orçamento." },
  { method: "GET", path: "/budgets/monthly", queryKeys: ["date"], description: "Orçamento mensal (date em MM-YYYY)." },
  { method: "GET", path: "/budgets/summary", description: "Resumo de orçamentos.", note: "403 em planos sem permissão." },
  { method: "POST", path: "/budgets", write: true, description: "Cria meta de orçamento." },
  { method: "PATCH", path: "/budgets/:budgetId", write: true, description: "Atualiza meta de orçamento." },
  { method: "GET", path: "/categories", description: "Categorias de transação (catálogo Pluggy)." },
  { method: "GET", path: "/categories/tree", description: "Árvore de categorias.", note: "403 em planos sem permissão." },
  { method: "GET", path: "/user-categories", description: "Categorias personalizadas do usuário." },
  {
    method: "POST",
    path: "/categories",
    write: true,
    description: "Cria categoria do catálogo Pluggy (uso administrativo).",
    note: "Categorias do usuário usam GET /user-categories; criação pode retornar 500/403.",
  },
  { method: "DELETE", path: "/categories/:categoryId", write: true, description: "Remove categoria." },
  { method: "GET", path: "/tags", description: "Tags de transação." },
  { method: "POST", path: "/tags", write: true, description: "Cria tag." },
  { method: "PATCH", path: "/tags/:tagId", write: true, description: "Atualiza tag." },
  { method: "DELETE", path: "/tags/:tagId", write: true, description: "Remove tag." },
  { method: "GET", path: "/banks", description: "Bancos/conectores Pluggy." },
  {
    method: "GET",
    path: "/bills/account/:accountId",
    description: "Faturas de cartão de crédito.",
    note: "404 quando a conta não é cartão ou não há faturas sincronizadas.",
  },
  { method: "GET", path: "/bridge/status", description: "Status da ponte de sincronização bancária e plano." },
  { method: "POST", path: "/pluggy/connect-token", write: true, description: "Token para conectar banco via Pluggy (201)." },
];

/** Rotas SPA do frontend (financas.auvp.com.br), úteis para navegação. */
export const FINANCAS_PAGE_ROUTES: readonly FinancasPageRoute[] = [
  { path: "/", description: "Raiz (redirect)." },
  { path: "/sign-in", description: "Login SSO." },
  { path: "/dashboard/home", description: "Home do dashboard." },
  { path: "/dashboard/transactions", description: "Tela de transações." },
  { path: "/dashboard/transactions/edit", description: "Edição de transação." },
  { path: "/dashboard/budget", description: "Tela de orçamento." },
  { path: "/dashboard/general-accounts", description: "Contas gerais." },
  { path: "/dashboard/goals", description: "Metas." },
  { path: "/dashboard/invoices", description: "Faturas." },
  { path: "/dashboard/tags", description: "Tags." },
  { path: "/pluggy/auth", description: "Fluxo OAuth Pluggy (página, não API)." },
  { path: "/settings/profile", description: "Perfil e configurações." },
  { path: "/settings/categories", description: "Categorias." },
  { path: "/settings/types", description: "Tipos de transação." },
];

export function normalizeFinancasApiPath(pathname: string): string {
  return pathname.replace(/\/\d+(?=\/|$)/g, "/:id");
}

export function getFinancasRouteHint(
  url: string,
  status: number,
): string | undefined {
  let pathname: string;
  try {
    pathname = normalizeFinancasApiPath(new URL(url).pathname);
  } catch {
    return undefined;
  }

  const route = FINANCAS_API_ROUTES.find((entry) => {
    const normalized = entry.path.replace(/:(\w+)/g, ":id");
    return normalized === pathname || entry.path === pathname;
  });

  if (!route) {
    return undefined;
  }

  if (status === 403) {
    return (
      route.note ??
      "Restrição de plano — endpoint pode não estar disponível no seu plano atual."
    );
  }

  if (status === 404 && route.note) {
    return route.note;
  }

  return undefined;
}

export function listFinancasObservedRoutes(): {
  apiRoutes: string[];
  pageRoutes: string[];
  writeOperations: string[];
} {
  return {
    apiRoutes: FINANCAS_API_ROUTES.map(
      (route) =>
        `${route.method} ${route.path}${route.queryKeys?.length ? `?${route.queryKeys.join("&")}` : ""}${route.note ? ` (${route.note})` : ""}`,
    ),
    pageRoutes: FINANCAS_PAGE_ROUTES.map((route) => route.path),
    writeOperations: FINANCAS_API_ROUTES.filter((route) => route.write).map(
      (route) => `${route.method} ${route.path}`,
    ),
  };
}
