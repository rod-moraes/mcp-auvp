import { describe, expect, it, vi } from "vitest";
import { callAuvpTool } from "../src/mcp/registry.js";
import type { AuvpFinancasClient } from "../src/core/http-client.js";

function client(): AuvpFinancasClient {
  return {
    setBearerToken: vi.fn(),
    setAnaliticaCookieHeader: vi.fn(),
    clearAnaliticaCookieHeader: vi.fn(),
    setComunidadeCookieHeader: vi.fn(),
    clearComunidadeCookieHeader: vi.fn(),
    setCarteiraToken: vi.fn(),
    getCarteira: vi.fn().mockResolvedValue({
      _id: "user-1",
      assets: [{ _id: "asset-1", name: "PETR4" }],
      investimentGoals: { acoes_nacionais: 40 },
      diagramQuestions: [{ _id: "question-1", question: "Teste" }],
    }),
    postCarteira: vi.fn().mockResolvedValue({ ok: true }),
    patchCarteira: vi.fn().mockResolvedValue({ ok: true }),
    deleteCarteira: vi.fn().mockResolvedValue({ ok: true }),
    getCarteiraPageText: vi.fn().mockResolvedValue(
      "País,Country,Principal Índice,ETFs Americanos,S&P,Moody's,Fitch,Nível de Risco,Empresa,Ticker,Setor,GeoJSON name\nBrasil,Brazil,Ibovespa,EWZ,BB-,Ba2,BB,bb,Petrobras,PETR4,Energia,Brazil\n",
    ),
  } as unknown as AuvpFinancasClient;
}

describe("Carteira tools", () => {
  it("returns portfolio fields without profile PII", async () => {
    const mock = client();
    const result = await callAuvpTool(mock, "auvp_carteira_get_portfolio", {}, ["carteira"]);
    const content = result.content[0];
    expect(content?.type).toBe("text");
    if (content?.type === "text") {
      expect(JSON.parse(content.text)).toEqual({
        assets: [{ _id: "asset-1", name: "PETR4" }],
        investmentGoals: { acoes_nacionais: 40 },
        questions: [{ _id: "question-1", question: "Teste" }],
        preferences: {},
      });
    }
  });

  it("dispatches asset writes to the observed endpoints", async () => {
    const mock = client();
    await callAuvpTool(mock, "auvp_carteira_update_asset", {
      assetId: "asset-1",
      changes: { strength: 8 },
    }, ["carteira"]);
    await callAuvpTool(mock, "auvp_carteira_record_contribution", {
      assetId: "asset-1",
      value: 100,
    }, ["carteira"]);
    expect(mock.patchCarteira).toHaveBeenNthCalledWith(1, "/users/assets/asset-1", { strength: 8, updatedBy: "user-1" });
    expect(mock.patchCarteira).toHaveBeenNthCalledWith(2, "/users/assets/asset-1/input", { value: 100 });
  });

  it("derives the current user id for goal and question-template writes", async () => {
    const mock = client();
    await callAuvpTool(mock, "auvp_carteira_update_investment_goals", {
      goals: [
        { type: "acoes_nacionais", value: 40 },
        { type: "rendafixa", value: 60 },
      ],
    }, ["carteira"]);
    await callAuvpTool(mock, "auvp_carteira_apply_question_template", {}, ["carteira"]);
    expect(mock.patchCarteira).toHaveBeenCalledWith("/users/user-1", {
      investimentGoals: [
        { type: "acoes_nacionais", value: 40 },
        { type: "rendafixa", value: 60 },
      ],
    });
    expect(mock.patchCarteira).toHaveBeenCalledWith("/wallets/diagrams/autofill/user-1", {});
  });

  it("dispatches the remaining observed write contracts", async () => {
    const mock = client();
    await callAuvpTool(mock, "auvp_carteira_create_asset", {
      asset: { type: "acoes_nacionais", name: "PETR4", assetId: "catalog-1", amount: 10 },
    }, ["carteira"]);
    await callAuvpTool(mock, "auvp_carteira_record_sale", { assetId: "asset-1", value: 2 }, ["carteira"]);
    await callAuvpTool(mock, "auvp_carteira_update_asset_diagram", {
      assetId: "asset-1", responses: ["question-1"], strength: 1,
    }, ["carteira"]);
    await callAuvpTool(mock, "auvp_carteira_create_question", {
      question: "Pergunta", criterias: "Critério", diagram: "diagrama-do-cerrado",
    }, ["carteira"]);
    await callAuvpTool(mock, "auvp_carteira_calculate_contribution", { value: 1000 }, ["carteira"]);
    await callAuvpTool(mock, "auvp_carteira_update_question", {
      questionId: "question-1", question: "Nova", criterias: "Novo", diagram: "diagrama-do-cerrado",
    }, ["carteira"]);
    await callAuvpTool(mock, "auvp_carteira_delete_question", { questionId: "question-1" }, ["carteira"]);
    await callAuvpTool(mock, "auvp_carteira_restore_default_questions", {}, ["carteira"]);
    await callAuvpTool(mock, "auvp_carteira_delete_asset", { assetId: "asset-1" }, ["carteira"]);

    expect(mock.postCarteira).toHaveBeenCalledWith("/users/assets", expect.objectContaining({
      type: "acoes_nacionais", name: "PETR4", updatedBy: "user-1",
    }));
    expect(mock.patchCarteira).toHaveBeenCalledWith("/users/assets/asset-1/sell-input", { value: 2 });
    expect(mock.patchCarteira).toHaveBeenCalledWith("/users/assets/asset-1/diagram", {
      responses: ["question-1"], strength: 1,
    });
    expect(mock.postCarteira).toHaveBeenCalledWith("/wallets/diagrams", {
      question: "Pergunta", criterias: "Critério", diagram: "diagrama-do-cerrado",
    });
    expect(mock.postCarteira).toHaveBeenCalledWith("/users/suggestions", { value: 1000 });
    expect(mock.patchCarteira).toHaveBeenCalledWith("/wallets/diagrams/question-1", {
      question: "Nova", criterias: "Novo", diagram: "diagrama-do-cerrado",
    });
    expect(mock.deleteCarteira).toHaveBeenCalledWith("/wallets/diagrams/question-1");
    expect(mock.postCarteira).toHaveBeenCalledWith("/wallets/diagrams/user-1/restore", {});
    expect(mock.deleteCarteira).toHaveBeenCalledWith("/users/assets/asset-1");
  });

  it("rejects investment goals that do not total 100", async () => {
    const result = await callAuvpTool(client(), "auvp_carteira_update_investment_goals", {
      goals: [{ type: "acoes_nacionais", value: 40 }],
    }, ["carteira"]);
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: "text", text: expect.stringContaining("total 100") });
  });

  it("parses and filters public country-rating data", async () => {
    const mock = client();
    const result = await callAuvpTool(mock, "auvp_carteira_search_country_ratings", {
      query: "PETR4",
      limit: 5,
    }, ["carteira"]);
    const content = result.content[0];
    expect(content?.type).toBe("text");
    if (content?.type === "text") {
      expect(JSON.parse(content.text)).toMatchObject({
        total: 1,
        countries: [{ country: "Brasil", mainIndex: "Ibovespa" }],
      });
    }
  });
});
