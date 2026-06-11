import { describe, expect, it } from "vitest";
import { AuvpApiError } from "../src/core/errors.js";
import { formatToolError } from "../src/mcp/tool-utils.js";

describe("formatToolError", () => {
  it("inclui dica de plano para 403 conhecido", () => {
    const error = new AuvpApiError(
      'AUVP API returned HTTP 403 for https://financas-api.auvp.com.br/budgets/summary. Body: {"message":"Insufficient permissions"}',
      {
        status: 403,
        url: "https://financas-api.auvp.com.br/budgets/summary",
        responseBody: '{"message":"Insufficient permissions"}',
      },
    );

    expect(formatToolError(error)).toContain("403 em planos sem permissão");
  });

  it("formata erros de validação 400 da API", () => {
    const error = new AuvpApiError(
      'AUVP API returned HTTP 400 for https://financas-api.auvp.com.br/transactions/manual. Body: {"message":["accountId must be a number"],"error":"Bad Request"}',
      {
        status: 400,
        url: "https://financas-api.auvp.com.br/transactions/manual",
        responseBody:
          '{"message":["accountId must be a number"],"error":"Bad Request"}',
      },
    );

    expect(formatToolError(error)).toContain(
      "Validação da API: accountId must be a number",
    );
  });

  it("inclui nota de 404 para faturas sem dados", () => {
    const error = new AuvpApiError(
      'AUVP API returned HTTP 404 for https://financas-api.auvp.com.br/bills/account/10002. Body: {"message":"Credit card account not found"}',
      {
        status: 404,
        url: "https://financas-api.auvp.com.br/bills/account/10002",
        responseBody: '{"message":"Credit card account not found"}',
      },
    );

    expect(formatToolError(error)).toContain("não há faturas sincronizadas");
  });
});
