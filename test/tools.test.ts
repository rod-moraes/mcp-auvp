import { describe, expect, it, vi } from "vitest";
import { ANALITICA_RANKING_REQUEST_TIMEOUT_MS } from "../src/analitica/ranking.js";
import { analiticaToolDefinitions } from "../src/analitica/tools.js";
import { comunidadeToolDefinitions } from "../src/comunidade/tools.js";
import { financasToolDefinitions } from "../src/financas/tools.js";
import { callAuvpTool, listAuvpTools } from "../src/mcp/registry.js";
import type { AuvpFinancasClient } from "../src/core/http-client.js";

function createMockClient(): AuvpFinancasClient {
  return {
    fetchRaw: vi.fn(),
    setBearerToken: vi.fn(),
    getBearerToken: vi.fn(),
    setAnaliticaCookieHeader: vi.fn(),
    clearAnaliticaCookieHeader: vi.fn(),
    getAnaliticaCookieHeader: vi.fn(),
    setComunidadeCookieHeader: vi.fn(),
    clearComunidadeCookieHeader: vi.fn(),
    getComunidadeCookieHeader: vi.fn(),
    getAuthStatus: vi.fn().mockReturnValue({
      hasBearerToken: false,
      hasSessionCookie: false,
      hasAnaliticaCookie: false,
      hasComunidadeCookie: false,
      cookieNames: [],
    }),
    get: vi.fn().mockResolvedValue({ ok: true }),
    post: vi.fn().mockResolvedValue({ ok: true }),
    patch: vi.fn().mockResolvedValue({ updated: true }),
    delete: vi.fn().mockResolvedValue({ ok: true }),
    getAnalitica: vi.fn().mockResolvedValue({ ok: true }),
    postAnalitica: vi.fn().mockResolvedValue({ ok: true }),
    getAnaliticaText: vi.fn().mockResolvedValue("rsc-payload"),
    getComunidade: vi.fn().mockResolvedValue({
      title: "Busca",
      content: "<p>Encontrou 0 resultados</p>",
      filters: '<input name="csrfKey" value="csrf-1">',
    }),
    getComunidadeText: vi.fn().mockResolvedValue(
      '<meta property="og:title" content="Tópico teste"><article id="elComment_1"><div class="cAuthorPane_author"><a href="/profile/1-test/">Autor</a></div><li data-role="group">Time AUVP</li><time datetime="2026-01-01T00:00:00Z">1 Jan</time><div data-role="commentContent" class="ipsType_richText">Olá mundo</div></article>',
    ),
    getComunidadeAjaxText: vi.fn().mockResolvedValue(
      "<li class='ipsDataItem'><strong>1</strong><a href='/profile/1-test/'>Autor</a><span class='ipsRepBadge ipsRepBadge_positive'>10</span></li>",
    ),
  } as unknown as AuvpFinancasClient;
}

describe("AUVP MCP tools", () => {
  it("lists all planned tools", () => {
    expect(listAuvpTools().map((tool) => tool.name)).toEqual([
      "auvp_create_sso_login_url",
      "auvp_complete_sso_login",
      "auvp_ensure_auth",
      "auvp_get_auth_status",
      ...financasToolDefinitions.map((tool) => tool.name),
      ...analiticaToolDefinitions.map((tool) => tool.name),
      ...comunidadeToolDefinitions.map((tool) => tool.name),
    ]);
  });

  it("creates an SSO login URL from the API redirect endpoint", async () => {
    const client = createMockClient();
    vi.mocked(client.fetchRaw).mockResolvedValueOnce(
      new Response("", {
        status: 302,
        headers: {
          location:
            "https://sso.auvp.com.br/realms/AUVP/protocol/openid-connect/auth?client_id=financas&redirect_uri=https%3A%2F%2Ffinancas-api.auvp.com.br%2Fauth%2Fauvp%2Fcallback&response_type=code&scope=email+profile+openid&state=state-123",
        },
      }),
    );

    const result = await callAuvpTool(client, "auvp_create_sso_login_url", {});

    expect(result.isError).toBeUndefined();
    const firstContent = result.content[0];
    expect(firstContent?.type).toBe("text");
    if (firstContent?.type === "text") {
      const payload = JSON.parse(firstContent.text) as { loginUrl: string };
      const url = new URL(payload.loginUrl);
      expect(url.origin).toBe("https://sso.auvp.com.br");
      expect(url.searchParams.get("client_id")).toBe("financas");
      expect(url.searchParams.get("state")).toBe("state-123");
    }
  });

  it("returns auth status without secret values", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(client, "auvp_get_auth_status", {});

    expect(result.isError).toBeUndefined();
    expect(client.getAuthStatus).toHaveBeenCalled();
  });

  it("dispatches transaction queries with validated filters", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(client, "auvp_financas_list_transactions", {
      page: 1,
      limit: 50,
      referenceMonth: "2026-05",
      sortBy: "date",
      sortOrder: "desc",
      type: "DEBIT",
      status: "PENDING",
      accountIds: ["account-a", "account-b"],
    });

    expect(result.isError).toBeUndefined();
    expect(client.get).toHaveBeenCalledWith("/transactions", {
      page: 1,
      limit: 50,
      referenceMonth: "2026-05",
      sortBy: "date",
      sortOrder: "desc",
      type: "DEBIT",
      status: "PENDING",
      accountIds: ["account-a", "account-b"],
    });
  });

  it("rejects invalid transaction filters", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(client, "auvp_financas_list_transactions", {
      limit: 0,
    });

    expect(result.isError).toBe(true);
    const firstContent = result.content[0];
    expect(firstContent?.type).toBe("text");
    if (firstContent?.type === "text") {
      expect(firstContent.text).toMatch(/Invalid arguments/);
    }
    expect(client.get).not.toHaveBeenCalled();
  });

  it("dispatches manual transaction creation with typed flat args", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(
      client,
      "auvp_financas_create_manual_transaction",
      {
        accountId: 10001,
        amount: 10,
        type: "DEBIT",
        description: "MCP test",
        date: "11-06-2026 12:00",
      },
    );

    expect(result.isError).toBeUndefined();
    expect(client.post).toHaveBeenCalledWith("/transactions/manual", {
      accountId: 10001,
      amount: 10,
      type: "DEBIT",
      description: "MCP test",
      date: "11-06-2026 12:00",
      tagIds: [],
      ignore: false,
      isRecurrent: false,
    });
  });

  it("dispatches manual account creation with typed flat args", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(client, "auvp_financas_create_manual_account", {
      name: "Conta teste",
      type: "BANK",
      subtype: "CHECKING_ACCOUNT",
      number: "12345",
      balance: 100,
    });

    expect(result.isError).toBeUndefined();
    expect(client.post).toHaveBeenCalledWith("/accounts/manual", {
      name: "Conta teste",
      type: "BANK",
      subtype: "CHECKING_ACCOUNT",
      number: "12345",
      balance: 100,
    });
  });

  it("updates transaction tags with the narrow PATCH body observed in the HAR", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(client, "auvp_financas_update_transaction", {
      transactionId: 14198288,
      tagIds: [1, 2],
    });

    expect(result.isError).toBeUndefined();
    expect(client.patch).toHaveBeenCalledWith("/transactions/14198288", {
      tagIds: [1, 2],
    });
  });

  it("dispatches Analitica most-viewed queries", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(
      client,
      "auvp_analitica_list_most_viewed",
      {
        companyType: "BRA:stock",
        limit: 8,
      },
    );

    expect(result.isError).toBeUndefined();
    expect(client.getAnalitica).toHaveBeenCalledWith(
      "/api/views/most-viewed",
      {
        companyType: "BRA:stock",
        limit: 8,
      },
    );
  });

  it("dispatches Analitica BFF home ranking requests", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(
      client,
      "auvp_analitica_get_home_ranking",
      {
        companyType: "stock",
        country: "BRA",
        rankingType: "dividend_yield",
      },
    );

    expect(result.isError).toBeUndefined();
    expect(client.postAnalitica).toHaveBeenCalledWith(
      "/api/bff",
      {
        companyType: "stock",
        country: "BRA",
        rankingType: "dividend_yield",
      },
      { key: "home-rankings" },
    );
  });

  it("dispatches Analitica get_code requests", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(client, "auvp_analitica_get_code", {
      code: "BBAS3",
    });

    expect(result.isError).toBeUndefined();
    expect(client.getAnalitica).toHaveBeenCalledWith("/api/codes", {
      code: "BBAS3",
    });
  });

  it("dispatches Analitica ranking page requests via paginated RSC route", async () => {
    const client = createMockClient();
    vi.mocked(client.getAnaliticaText).mockResolvedValue(
      '{\\"key\\":\\"upside_graham\\",\\"associated_key\\":\\"upside_graham\\",\\"name\\":\\"Upside Graham\\",\\"data\\":[{\\"code\\":\\"BBAS3\\",\\"type\\":\\"stock\\",\\"value\\":10,\\"quote\\":\\"19.10\\"}],\\"pagination\\":{\\"page\\":1,\\"limit\\":20,\\"total_pages\\":5}}',
    );

    const result = await callAuvpTool(client, "auvp_analitica_get_ranking", {
      segment: "acoes",
      rankingType: "upside_graham",
      page: 1,
      limit: 20,
    });

    expect(result.isError).toBeUndefined();
    expect(client.getAnaliticaText).toHaveBeenCalledWith(
      "/rankings/acoes/upside_graham",
      {
        page: 1,
        limit: 20,
        _rsc: "4soq9",
      },
      { timeoutMs: ANALITICA_RANKING_REQUEST_TIMEOUT_MS },
    );
    const first = result.content[0];
    expect(first?.type).toBe("text");
    if (first?.type === "text") {
      expect(JSON.parse(first.text)).toMatchObject({
      ranking: { key: "upside_graham" },
      data: [
        {
          position: 1,
          code: "BBAS3",
          columns: {
            cotacao: "19.10",
            metric_key: "upside_graham",
            metric_label: "Upside Graham",
            metric_value: 10,
            p_l: null,
            p_vp: null,
            valor_mercado: null,
            roe: null,
            roa: null,
            media_hist_setor: null,
            media_atual_setor: null,
          },
        },
      ],
      pagination: { page: 1, limit: 20, total_pages: 5 },
      });
    }
  });

  it("dispatches Analitica page routes as raw text", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(
      client,
      "auvp_analitica_get_page_route",
      {
        path: "/rankings/acoes/upside_graham",
        rsc: "19zvn",
      },
    );

    expect(result.isError).toBeUndefined();
    expect(client.getAnaliticaText).toHaveBeenCalledWith(
      "/rankings/acoes/upside_graham",
      { _rsc: "19zvn" },
    );
  });

  it("dispatches comunidade search requests", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(client, "auvp_comunidade_search", {
      query: "tesouro",
      forums: ["renda-fixa", 32],
      searchMode: "and",
      sortBy: "relevancy",
    });

    expect(result.isError).toBeUndefined();
    expect(client.getComunidade).toHaveBeenCalledWith("/search/", {
      q: "tesouro",
      search_and_or: "and",
      search_in: "all",
      sortby: "relevancy",
      type: "forums_topic",
      nodes: "16,32",
    });
  });

  it("dispatches comunidade get topic requests", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(client, "auvp_comunidade_get_topic", {
      url: "/topic/43093-empreender-agora-ou-esperar/",
    });

    expect(result.isError).toBeUndefined();
    expect(client.getComunidadeText).toHaveBeenCalledWith(
      "/topic/43093-empreender-agora-ou-esperar/",
    );
  });

  it("lists comunidade forums", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(client, "auvp_comunidade_list_forums", {});

    expect(result.isError).toBeUndefined();
    const firstContent = result.content[0];
    expect(firstContent?.type).toBe("text");
    if (firstContent?.type === "text") {
      const payload = JSON.parse(firstContent.text) as {
        forums: Array<{ id: number; slug: string }>;
      };
      expect(payload.forums.some((forum) => forum.slug === "renda-fixa")).toBe(
        true,
      );
    }
  });

  it("rejects non-Analitica page routes in the page-route tool", async () => {
    const client = createMockClient();

    const result = await callAuvpTool(
      client,
      "auvp_analitica_get_page_route",
      {
        path: "/api/auth/me",
      },
    );

    expect(result.isError).toBe(true);
    expect(client.getAnaliticaText).not.toHaveBeenCalled();
  });
});
