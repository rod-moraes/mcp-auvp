import { emptyInputSchema } from "../mcp/schemas/json.js";
import { emptyArgsSchema } from "../mcp/schemas/zod.js";
import {
  defineTool,
  jsonResult,
  type ToolDefinition,
} from "../mcp/tool-utils.js";
import { listDicionarioObservedRoutes } from "./catalog.js";
import {
  sanitizeDictionarySearchResponse,
  sanitizeDictionaryTerm,
} from "./normalize.js";
import {
  dicionarioSearchInputSchema,
  dicionarioSearchSchema,
  dicionarioTermInputSchema,
  dicionarioTermSchema,
} from "./schemas.js";

export const dicionarioToolDefinitions: ToolDefinition[] = [
  defineTool(
    "auvp_dicionario_list_observed_routes",
    "Lista os contratos de leitura observados no Dicionário do Mercado AUVP.",
    emptyInputSchema,
    async (_client, args) => {
      emptyArgsSchema.parse(args ?? {});
      return jsonResult(listDicionarioObservedRoutes());
    },
  ),
  defineTool(
    "auvp_dicionario_search_terms",
    "Pesquisa termos no Dicionário do Mercado com paginação e filtros. Remove e-mail, foto e demais metadados pessoais da resposta.",
    dicionarioSearchInputSchema,
    async (client, args) => {
      const parsed = dicionarioSearchSchema.parse(args ?? {});
      const response = await client.getDicionario("/dictionary", {
        page: parsed.page,
        search: parsed.query,
        categories: parsed.category,
        letter: parsed.letter,
        pending: true,
        author: parsed.author,
      });
      return jsonResult(sanitizeDictionarySearchResponse(response));
    },
  ),
  defineTool(
    "auvp_dicionario_get_term",
    "Consulta um termo do Dicionário por ID e retorna somente conceito, definição, categoria, validação e datas.",
    dicionarioTermInputSchema,
    async (client, args) => {
      const parsed = dicionarioTermSchema.parse(args ?? {});
      const response = await client.getDicionario(`/dictionary/${parsed.termId}`);
      return jsonResult(sanitizeDictionaryTerm(response) ?? {});
    },
  ),
];

