import {
  comunidadeGetTopicInputSchema,
  comunidadeLeaderboardInputSchema,
  comunidadeListForumTopicsInputSchema,
  comunidadeSearchInputSchema,
  emptyInputSchema,
} from "../mcp/schemas/json.js";
import {
  comunidadeGetTopicSchema,
  comunidadeLeaderboardSchema,
  comunidadeListForumTopicsSchema,
  comunidadeSearchSchema,
  emptyArgsSchema,
} from "../mcp/schemas/zod.js";
import { listComunidadeObservedRoutes } from "./catalog.js";
import { listComunidadeForumTopics } from "./forum-topics.js";
import { listComunidadeForums } from "./forums.js";
import { listComunidadeNotifications } from "./notifications.js";
import { searchComunidade } from "./search.js";
import { getComunidadeTopic } from "./topic.js";
import {
  getComunidadeMostSolved,
  getComunidadeTopContributors,
} from "./widgets.js";
import {
  defineTool,
  jsonResult,
  type ToolDefinition,
} from "../mcp/tool-utils.js";

export const comunidadeToolDefinitions: ToolDefinition[] = [
  defineTool(
    "auvp_comunidade_list_observed_routes",
    "Lista rotas HTTP/AJAX e páginas observadas em comunidade.auvp.com.br (catálogo IPS).",
    emptyInputSchema,
    async (_client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(listComunidadeObservedRoutes());
    },
  ),
  defineTool(
    "auvp_comunidade_list_forums",
    "Lista os fóruns da Comunidade AUVP (comunidade.auvp.com.br) com ids e slugs para filtrar buscas.",
    emptyInputSchema,
    async (_client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult({ forums: listComunidadeForums() });
    },
  ),
  defineTool(
    "auvp_comunidade_search",
    "Pesquisa tópicos e publicações na Comunidade AUVP via GET /search/ (Invision Community). Retorna resultados estruturados a partir do HTML da busca.",
    comunidadeSearchInputSchema,
    async (client, args) => {
      const parsed = comunidadeSearchSchema.parse(args ?? {});
      return jsonResult(
        await searchComunidade(client, {
          query: parsed.query,
          forums: parsed.forums,
          searchMode: parsed.searchMode,
          searchIn: parsed.searchIn,
          contentType:
            parsed.contentType === "all" ? "" : (parsed.contentType ?? "forums_topic"),
          sortBy: parsed.sortBy,
          page: parsed.page,
        }),
      );
    },
  ),
  defineTool(
    "auvp_comunidade_list_forum_topics",
    "Lista tópicos de um fórum via GET /?forumId= (HTML IPS). Aceita id ou slug do fórum.",
    comunidadeListForumTopicsInputSchema,
    async (client, args) => {
      const parsed = comunidadeListForumTopicsSchema.parse(args ?? {});
      return jsonResult(
        await listComunidadeForumTopics(client, {
          forum: parsed.forum,
          page: parsed.page,
        }),
      );
    },
  ),
  defineTool(
    "auvp_comunidade_get_topic",
    "Lê um tópico completo da Comunidade AUVP com post original e comentários, a partir do HTML da página do tópico.",
    comunidadeGetTopicInputSchema,
    async (client, args) => {
      const parsed = comunidadeGetTopicSchema.parse(args ?? {});
      return jsonResult(await getComunidadeTopic(client, { url: parsed.url }));
    },
  ),
  defineTool(
    "auvp_comunidade_list_notifications",
    "Lista notificações recentes do usuário via GET /notifications/ (JSON IPS com HTML embutido).",
    emptyInputSchema,
    async (client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(await listComunidadeNotifications(client));
    },
  ),
  defineTool(
    "auvp_comunidade_get_top_contributors",
    "Ranking de top respondedores (widget IPS topContributors) — semana, mês, ano ou todo o tempo.",
    comunidadeLeaderboardInputSchema,
    async (client, args) => {
      const parsed = comunidadeLeaderboardSchema.parse(args ?? {});
      return jsonResult(
        await getComunidadeTopContributors(client, {
          time: parsed.time,
          limit: parsed.limit,
        }),
      );
    },
  ),
  defineTool(
    "auvp_comunidade_get_most_solved",
    "Ranking de tópicos mais resolvidos (widget IPS mostSolved) — semana, mês, ano ou todo o tempo.",
    comunidadeLeaderboardInputSchema,
    async (client, args) => {
      const parsed = comunidadeLeaderboardSchema.parse(args ?? {});
      return jsonResult(
        await getComunidadeMostSolved(client, {
          time: parsed.time,
          limit: parsed.limit,
        }),
      );
    },
  ),
];
