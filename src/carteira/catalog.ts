export interface CarteiraRoute {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  write?: boolean;
  public?: boolean;
}

export const CARTEIRA_API_ROUTES: readonly CarteiraRoute[] = [
  { method: "GET", path: "/auth/me", description: "Usuário, ativos, metas e perguntas do Diagrama." },
  { method: "GET", path: "/users/classification", description: "Classificação do perfil de investimento." },
  { method: "GET", path: "/config", description: "Configuração pública da ferramenta, incluindo cotação do dólar.", public: true },
  { method: "GET", path: "/assets/sugestions", description: "Busca ativos disponíveis por tipo e texto.", public: true },
  { method: "GET", path: "/assets/:assetId/force-strength", description: "Nota mínima/forçada de um ativo.", public: true },
  { method: "POST", path: "/users/suggestions", description: "Calcula sugestões para um novo aporte.", write: true },
  { method: "POST", path: "/users/assets", description: "Adiciona ativo à carteira.", write: true },
  { method: "PATCH", path: "/users/assets/:assetId", description: "Atualiza ativo da carteira.", write: true },
  { method: "DELETE", path: "/users/assets/:assetId", description: "Remove ativo da carteira.", write: true },
  { method: "PATCH", path: "/users/assets/:assetId/input", description: "Registra aporte em um ativo.", write: true },
  { method: "PATCH", path: "/users/assets/:assetId/sell-input", description: "Registra venda em um ativo.", write: true },
  { method: "PATCH", path: "/users/assets/:assetId/diagram", description: "Atualiza respostas e nota do Diagrama.", write: true },
  { method: "PATCH", path: "/users/:userId", description: "Atualiza metas de investimento.", write: true },
  { method: "POST", path: "/wallets/diagrams", description: "Cria pergunta do Diagrama.", write: true },
  { method: "PATCH", path: "/wallets/diagrams/:questionId", description: "Atualiza pergunta do Diagrama.", write: true },
  { method: "DELETE", path: "/wallets/diagrams/:questionId", description: "Remove pergunta do Diagrama.", write: true },
  { method: "PATCH", path: "/wallets/diagrams/autofill/:userId", description: "Aplica modelo de perguntas.", write: true },
  { method: "POST", path: "/wallets/diagrams/:userId/restore", description: "Restaura perguntas padrão.", write: true },
  { method: "GET", path: "/dados/paises_dados_completos_final.csv", description: "Dados públicos do mapa de países.", public: true },
] as const;

export function listCarteiraObservedRoutes(): {
  apiBase: string;
  frontendBase: string;
  routes: readonly CarteiraRoute[];
} {
  return {
    apiBase: "https://ferramentas-backend.auvp.com.br",
    frontendBase: "https://ferramentas.auvp.com.br",
    routes: CARTEIRA_API_ROUTES,
  };
}
