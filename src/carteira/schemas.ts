import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

type InputSchema = Tool["inputSchema"];

const idSchema = z.string().min(1).regex(/^[A-Za-z0-9_-]+$/);
export const carteiraAssetTypeValues = [
  "acoes_internacionais",
  "acoes_nacionais",
  "fundos_imobiliarios",
  "reits",
  "criptomoedas",
  "rendafixa",
  "rendafixa_internacional",
] as const;
const assetSchema = z.object({
  assetId: idSchema.optional(),
  type: z.enum(carteiraAssetTypeValues),
  name: z.string().min(1),
  alocation: z.string().min(1).optional(),
  value: z.number().nonnegative().optional(),
  amount: z.number().nonnegative().optional(),
  strength: z.number().min(0).max(10).optional(),
  useForcedStrength: z.boolean().optional(),
  diagramResponses: z.array(idSchema).optional(),
}).strict();

export const carteiraAssetIdSchema = z.object({ assetId: idSchema }).strict();
export const carteiraCreateAssetSchema = z.object({ asset: assetSchema }).strict();
export const carteiraUpdateAssetSchema = z
  .object({ assetId: idSchema, changes: assetSchema.partial().refine((value) => Object.keys(value).length > 0, "At least one change is required.") })
  .strict();
export const carteiraAmountSchema = z
  .object({ assetId: idSchema, value: z.number().positive() })
  .strict();
export const carteiraDiagramResponseSchema = z
  .object({
    assetId: idSchema,
    responses: z.array(idSchema),
    strength: z.number().finite(),
  })
  .strict();
const investmentGoalSchema = z.object({
  type: z.enum(carteiraAssetTypeValues),
  value: z.number().min(0).max(100),
}).strict();
export const carteiraGoalsSchema = z.object({
  goals: z.array(investmentGoalSchema).min(1).max(carteiraAssetTypeValues.length)
    .refine((goals) => new Set(goals.map((goal) => goal.type)).size === goals.length, "Goal types must be unique.")
    .refine((goals) => Math.abs(goals.reduce((sum, goal) => sum + goal.value, 0) - 100) < 0.001, "Goal values must total 100."),
}).strict();
export const carteiraContributionSchema = z
  .object({ value: z.number().positive() })
  .strict();
export const carteiraSuggestionSchema = z
  .object({ type: z.string().min(1), search: z.string().default("") })
  .strict();
export const carteiraQuestionSchema = z
  .object({
    question: z.string().min(1),
    criterias: z.string().min(1),
    diagram: z.enum(["diagrama-do-cerrado", "investimentos-imobiliarios"]),
  })
  .strict();
export const carteiraUpdateQuestionSchema = carteiraQuestionSchema.extend({
  questionId: idSchema,
}).strict();
export const carteiraQuestionIdSchema = z.object({ questionId: idSchema }).strict();
export const carteiraCountrySearchSchema = z
  .object({
    query: z.string().default(""),
    limit: z.number().int().positive().max(200).default(50),
  })
  .strict();

const idProperty = { type: "string", minLength: 1, pattern: "^[A-Za-z0-9_-]+$" } as const;
const assetProperties = {
  assetId: idProperty,
  type: { type: "string", enum: [...carteiraAssetTypeValues] },
  name: { type: "string", minLength: 1 },
  alocation: { type: "string", minLength: 1 },
  value: { type: "number", minimum: 0 },
  amount: { type: "number", minimum: 0 },
  strength: { type: "number", minimum: 0, maximum: 10 },
  useForcedStrength: { type: "boolean" },
  diagramResponses: { type: "array", items: idProperty },
} as const;
const assetProperty = {
  type: "object", additionalProperties: false, required: ["type", "name"], properties: assetProperties,
} as const;

export const carteiraAssetIdInputSchema: InputSchema = {
  type: "object", additionalProperties: false, required: ["assetId"], properties: { assetId: idProperty },
};
export const carteiraCreateAssetInputSchema: InputSchema = {
  type: "object", additionalProperties: false, required: ["asset"], properties: { asset: assetProperty },
};
export const carteiraUpdateAssetInputSchema: InputSchema = {
  type: "object", additionalProperties: false, required: ["assetId", "changes"], properties: { assetId: idProperty, changes: { type: "object", additionalProperties: false, minProperties: 1, properties: assetProperties } },
};
export const carteiraAmountInputSchema: InputSchema = {
  type: "object", additionalProperties: false, required: ["assetId", "value"], properties: { assetId: idProperty, value: { type: "number", exclusiveMinimum: 0 } },
};
export const carteiraDiagramResponseInputSchema: InputSchema = {
  type: "object", additionalProperties: false, required: ["assetId", "responses", "strength"], properties: {
    assetId: idProperty,
    responses: { type: "array", items: idProperty },
    strength: { type: "number" },
  },
};
export const carteiraGoalsInputSchema: InputSchema = {
  type: "object", additionalProperties: false, required: ["goals"], properties: {
    goals: { type: "array", minItems: 1, maxItems: 7, items: { type: "object", additionalProperties: false, required: ["type", "value"], properties: { type: { type: "string", enum: [...carteiraAssetTypeValues] }, value: { type: "number", minimum: 0, maximum: 100 } } } },
  },
};
export const carteiraContributionInputSchema: InputSchema = {
  type: "object", additionalProperties: false, required: ["value"], properties: { value: { type: "number", exclusiveMinimum: 0 } },
};
export const carteiraSuggestionInputSchema: InputSchema = {
  type: "object", additionalProperties: false, required: ["type"], properties: { type: { type: "string", minLength: 1 }, search: { type: "string", default: "" } },
};
const questionProperties = {
  question: { type: "string", minLength: 1 },
  criterias: { type: "string", minLength: 1 },
  diagram: { type: "string", enum: ["diagrama-do-cerrado", "investimentos-imobiliarios"] },
} as const;
export const carteiraQuestionInputSchema: InputSchema = {
  type: "object", additionalProperties: false, required: ["question", "criterias", "diagram"], properties: questionProperties,
};
export const carteiraUpdateQuestionInputSchema: InputSchema = {
  type: "object", additionalProperties: false, required: ["questionId", "question", "criterias", "diagram"], properties: { questionId: idProperty, ...questionProperties },
};
export const carteiraQuestionIdInputSchema: InputSchema = {
  type: "object", additionalProperties: false, required: ["questionId"], properties: { questionId: idProperty },
};
export const carteiraCountrySearchInputSchema: InputSchema = {
  type: "object", additionalProperties: false, properties: {
    query: { type: "string", default: "" }, limit: { type: "integer", minimum: 1, maximum: 200, default: 50 },
  },
};
