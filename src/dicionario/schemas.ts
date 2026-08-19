import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

type InputSchema = Tool["inputSchema"];

export const dicionarioSearchSchema = z
  .object({
    page: z.number().int().positive().default(1),
    query: z.string().default(""),
    category: z.string().default(""),
    letter: z.string().max(2).default(""),
    author: z.boolean().default(false),
  })
  .strict();
export const dicionarioTermSchema = z
  .object({ termId: z.string().min(1).regex(/^[A-Za-z0-9_-]+$/) })
  .strict();

export const dicionarioSearchInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    query: { type: "string", default: "" },
    category: { type: "string", default: "" },
    letter: { type: "string", maxLength: 2, default: "" },
    author: { type: "boolean", default: false },
  },
};
export const dicionarioTermInputSchema: InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["termId"],
  properties: {
    termId: { type: "string", minLength: 1, pattern: "^[A-Za-z0-9_-]+$" },
  },
};

