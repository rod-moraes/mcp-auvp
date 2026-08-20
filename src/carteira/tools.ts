import { emptyInputSchema } from "../mcp/schemas/json.js";
import { emptyArgsSchema } from "../mcp/schemas/zod.js";
import {
  defineTool,
  jsonResult,
  type ToolDefinition,
} from "../mcp/tool-utils.js";
import type { AuvpFinancasClient } from "../core/http-client.js";
import { listCarteiraObservedRoutes } from "./catalog.js";
import { searchCountryRatings } from "./map.js";
import {
  carteiraAmountInputSchema,
  carteiraAmountSchema,
  carteiraAssetIdInputSchema,
  carteiraAssetIdSchema,
  carteiraContributionInputSchema,
  carteiraContributionSchema,
  carteiraCountrySearchInputSchema,
  carteiraCountrySearchSchema,
  carteiraCreateAssetInputSchema,
  carteiraCreateAssetSchema,
  carteiraDiagramResponseInputSchema,
  carteiraDiagramResponseSchema,
  carteiraGoalsInputSchema,
  carteiraGoalsSchema,
  carteiraQuestionIdInputSchema,
  carteiraQuestionIdSchema,
  carteiraQuestionInputSchema,
  carteiraQuestionSchema,
  carteiraSuggestionInputSchema,
  carteiraSuggestionSchema,
  carteiraUpdateAssetInputSchema,
  carteiraUpdateAssetSchema,
  carteiraUpdateQuestionInputSchema,
  carteiraUpdateQuestionSchema,
} from "./schemas.js";

export const carteiraToolDefinitions: ToolDefinition[] = [
  defineTool(
    "auvp_carteira_list_observed_routes",
    "Lista os contratos observados da Carteira/Diagrama do Cerrado.",
    emptyInputSchema,
    async (_client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(listCarteiraObservedRoutes());
    },
  ),
  defineTool(
    "auvp_carteira_get_portfolio",
    "Consulta ativos, metas, perguntas e preferências usadas pelo Diagrama do Cerrado, sem retornar dados pessoais do perfil.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(sanitizePortfolio(await getCarteiraUser(client)));
    },
  ),
  defineTool(
    "auvp_carteira_list_assets",
    "Lista os ativos cadastrados na Carteira AUVP.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      const user = await getCarteiraUser(client);
      return jsonResult({ assets: arrayField(user, "assets") });
    },
  ),
  defineTool(
    "auvp_carteira_get_investment_goals",
    "Consulta as metas percentuais do Diagrama do Cerrado.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      const user = await getCarteiraUser(client);
      return jsonResult({ goals: user.investimentGoals ?? [] });
    },
  ),
  defineTool(
    "auvp_carteira_list_questions",
    "Lista as perguntas configuradas para pontuar ativos no Diagrama.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      const user = await getCarteiraUser(client);
      return jsonResult({ questions: arrayField(user, "diagramQuestions") });
    },
  ),
  defineTool(
    "auvp_carteira_get_classification",
    "Consulta a classificação atual do perfil de investimento.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getCarteira("/users/classification"));
    },
  ),
  defineTool(
    "auvp_carteira_get_config",
    "Consulta a configuração pública da Carteira, incluindo a cotação do dólar usada nos cálculos.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await client.getCarteira("/config"));
    },
  ),
  defineTool(
    "auvp_carteira_search_asset_suggestions",
    "Busca ativos que podem ser adicionados à Carteira por tipo e texto.",
    carteiraSuggestionInputSchema,
    async (client, args) => {
      const parsed = carteiraSuggestionSchema.parse(args ?? {});
      return jsonResult(
        await client.getCarteira("/assets/sugestions", {
          type: parsed.type,
          search: parsed.search,
        }),
      );
    },
  ),
  defineTool(
    "auvp_carteira_search_country_ratings",
    "Pesquisa países, índices, ratings, ETFs e empresas exibidos no mapa da Carteira.",
    carteiraCountrySearchInputSchema,
    async (client, args) => {
      const parsed = carteiraCountrySearchSchema.parse(args ?? {});
      return jsonResult(
        await searchCountryRatings(client, parsed.query, parsed.limit),
      );
    },
  ),
  defineTool(
    "auvp_carteira_calculate_contribution",
    "POST /users/suggestions — calcula a distribuição de um novo aporte e pode registrar o último valor calculado no serviço AUVP.",
    carteiraContributionInputSchema,
    async (client, args) => {
      const parsed = carteiraContributionSchema.parse(args ?? {});
      return jsonResult(
        await client.postCarteira("/users/suggestions", { value: parsed.value }),
      );
    },
  ),
  defineTool(
    "auvp_carteira_create_asset",
    "ESCRITA: adiciona um ativo à Carteira AUVP.",
    carteiraCreateAssetInputSchema,
    async (client, args) => {
      const parsed = carteiraCreateAssetSchema.parse(args ?? {});
      const userId = requireId(await getCarteiraUser(client), "usuário da Carteira");
      return jsonResult(await client.postCarteira("/users/assets", {
        ...parsed.asset,
        updatedBy: userId,
      }));
    },
  ),
  defineTool(
    "auvp_carteira_update_asset",
    "ESCRITA: atualiza os campos de um ativo existente na Carteira AUVP.",
    carteiraUpdateAssetInputSchema,
    async (client, args) => {
      const parsed = carteiraUpdateAssetSchema.parse(args ?? {});
      return jsonResult(
        await client.patchCarteira(
          `/users/assets/${parsed.assetId}`,
          {
            ...parsed.changes,
            updatedBy: requireId(await getCarteiraUser(client), "usuário da Carteira"),
          },
        ),
      );
    },
  ),
  defineTool(
    "auvp_carteira_delete_asset",
    "ESCRITA IRREVERSÍVEL: remove um ativo da Carteira AUVP.",
    carteiraAssetIdInputSchema,
    async (client, args) => {
      const parsed = carteiraAssetIdSchema.parse(args ?? {});
      return jsonResult(
        await client.deleteCarteira(`/users/assets/${parsed.assetId}`),
      );
    },
  ),
  defineTool(
    "auvp_carteira_record_contribution",
    "ESCRITA: registra um aporte em um ativo da Carteira.",
    carteiraAmountInputSchema,
    async (client, args) => {
      const parsed = carteiraAmountSchema.parse(args ?? {});
      return jsonResult(
        await client.patchCarteira(`/users/assets/${parsed.assetId}/input`, {
          value: parsed.value,
        }),
      );
    },
  ),
  defineTool(
    "auvp_carteira_record_sale",
    "ESCRITA: registra uma venda em um ativo da Carteira.",
    carteiraAmountInputSchema,
    async (client, args) => {
      const parsed = carteiraAmountSchema.parse(args ?? {});
      return jsonResult(
        await client.patchCarteira(`/users/assets/${parsed.assetId}/sell-input`, {
          value: parsed.value,
        }),
      );
    },
  ),
  defineTool(
    "auvp_carteira_update_asset_diagram",
    "ESCRITA: atualiza respostas e nota de um ativo no Diagrama do Cerrado.",
    carteiraDiagramResponseInputSchema,
    async (client, args) => {
      const parsed = carteiraDiagramResponseSchema.parse(args ?? {});
      return jsonResult(
        await client.patchCarteira(`/users/assets/${parsed.assetId}/diagram`, {
          responses: parsed.responses,
          strength: parsed.strength,
        }),
      );
    },
  ),
  defineTool(
    "auvp_carteira_update_investment_goals",
    "ESCRITA: substitui as metas percentuais do Diagrama do Cerrado.",
    carteiraGoalsInputSchema,
    async (client, args) => {
      const parsed = carteiraGoalsSchema.parse(args ?? {});
      const user = await getCarteiraUser(client);
      const userId = requireId(user, "usuário da Carteira");
      return jsonResult(
        await client.patchCarteira(`/users/${userId}`, {
          investimentGoals: parsed.goals,
        }),
      );
    },
  ),
  defineTool(
    "auvp_carteira_create_question",
    "ESCRITA: cria uma pergunta de avaliação do Diagrama.",
    carteiraQuestionInputSchema,
    async (client, args) => {
      const parsed = carteiraQuestionSchema.parse(args ?? {});
      return jsonResult(await client.postCarteira("/wallets/diagrams", parsed));
    },
  ),
  defineTool(
    "auvp_carteira_update_question",
    "ESCRITA: atualiza uma pergunta de avaliação do Diagrama.",
    carteiraUpdateQuestionInputSchema,
    async (client, args) => {
      const parsed = carteiraUpdateQuestionSchema.parse(args ?? {});
      const { questionId, ...body } = parsed;
      return jsonResult(
        await client.patchCarteira(`/wallets/diagrams/${questionId}`, body),
      );
    },
  ),
  defineTool(
    "auvp_carteira_delete_question",
    "ESCRITA IRREVERSÍVEL: remove uma pergunta de avaliação do Diagrama.",
    carteiraQuestionIdInputSchema,
    async (client, args) => {
      const parsed = carteiraQuestionIdSchema.parse(args ?? {});
      return jsonResult(
        await client.deleteCarteira(`/wallets/diagrams/${parsed.questionId}`),
      );
    },
  ),
  defineTool(
    "auvp_carteira_apply_question_template",
    "ESCRITA: aplica o modelo de perguntas do Diagrama ao usuário atual.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      const userId = requireId(await getCarteiraUser(client), "usuário da Carteira");
      return jsonResult(
        await client.patchCarteira(`/wallets/diagrams/autofill/${userId}`, {}),
      );
    },
  ),
  defineTool(
    "auvp_carteira_restore_default_questions",
    "ESCRITA: restaura as perguntas padrão do Diagrama do usuário atual.",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      const userId = requireId(await getCarteiraUser(client), "usuário da Carteira");
      return jsonResult(
        await client.postCarteira(`/wallets/diagrams/${userId}/restore`, {}),
      );
    },
  ),
];

async function getCarteiraUser(
  client: AuvpFinancasClient,
): Promise<Record<string, unknown>> {
  const value = await client.getCarteira("/auth/me");
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A API da Carteira não retornou um usuário válido.");
  }
  return value as Record<string, unknown>;
}

function sanitizePortfolio(user: Record<string, unknown>): Record<string, unknown> {
  return {
    assets: arrayField(user, "assets"),
    investmentGoals: user.investimentGoals ?? {},
    questions: arrayField(user, "diagramQuestions"),
    preferences:
      user.preferences && typeof user.preferences === "object"
        ? user.preferences
        : {},
  };
}

function arrayField(user: Record<string, unknown>, key: string): unknown[] {
  return Array.isArray(user[key]) ? user[key] : [];
}

function requireId(value: Record<string, unknown>, label: string): string {
  const id = value._id ?? value.id;
  if (typeof id !== "string" || !id) {
    throw new Error(`Não foi possível identificar ${label}.`);
  }
  return id;
}
