import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { AuvpFinancasClient } from "../core/http-client.js";
import { AuvpApiError, AuvpConfigError } from "../core/errors.js";
import { getFinancasRouteHint } from "../financas/catalog.js";

export type ToolResult = CallToolResult;

export type ToolHandler = (
  client: AuvpFinancasClient,
  args: unknown,
) => Promise<ToolResult>;

export interface ToolDefinition extends Tool {
  handler: ToolHandler;
}

export function defineTool(
  name: string,
  description: string,
  inputSchema: Tool["inputSchema"],
  handler: ToolHandler,
): ToolDefinition {
  return { name, description, inputSchema, handler };
}

export function jsonResult(value: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

export function errorResult(message: string): ToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

export function formatToolError(error: unknown, toolName?: string): string {
  if (error instanceof z.ZodError) {
    return `Invalid arguments: ${error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("; ")}`;
  }

  if (error instanceof AuvpApiError && error.status === 401) {
    const hint = toolName
      ? ` Chame a ferramenta auvp_ensure_auth para renovar a sessão.`
      : "";
    return `${error.message}${hint}`;
  }

  if (error instanceof AuvpApiError) {
    return formatAuvpApiError(error);
  }

  if (error instanceof AuvpConfigError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error while handling AUVP tool.";
}

function formatAuvpApiError(error: AuvpApiError): string {
  const parts = [error.message];
  const validationHint = formatApiValidationBody(error.responseBody);

  if (validationHint) {
    parts.push(validationHint);
  }

  if (error.url && error.status != null) {
    const routeHint = getFinancasRouteHint(error.url, error.status);
    if (routeHint) {
      parts.push(routeHint);
    }
  }

  return parts.join(" ");
}

function formatApiValidationBody(responseBody?: string): string | undefined {
  if (!responseBody?.trim()) {
    return undefined;
  }

  try {
    const payload = JSON.parse(responseBody) as {
      message?: unknown;
      error?: unknown;
    };

    if (Array.isArray(payload.message)) {
      return `Validação da API: ${payload.message.join("; ")}.`;
    }

    if (typeof payload.message === "string" && payload.error === "Bad Request") {
      return `Validação da API: ${payload.message}.`;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
