import { describe, expect, it, vi } from "vitest";
import { scanFinancasTools } from "../src/financas/scan-tools.js";
import { scanAnaliticaTools } from "../src/analitica/scan-tools.js";
import { scanCarteiraTools } from "../src/carteira/scan-tools.js";
import type { AuvpFinancasClient } from "../src/core/http-client.js";

function mockClient(): AuvpFinancasClient {
  return {
    setBearerToken: vi.fn(),
    setAnaliticaCookieHeader: vi.fn(),
    setComunidadeCookieHeader: vi.fn(),
    setCarteiraToken: vi.fn(),
    getBearerToken: vi.fn().mockReturnValue("token"),
    getAnaliticaCookieHeader: vi.fn().mockReturnValue("cookie"),
    getAuthStatus: vi.fn().mockReturnValue({
      hasBearerToken: true,
      hasSessionCookie: false,
      hasAnaliticaCookie: true,
      hasComunidadeCookie: false,
      hasCarteiraToken: false,
      cookieNames: [],
    }),
    get: vi.fn().mockResolvedValue({ data: [], accounts: [], transactions: [] }),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    getAnalitica: vi.fn().mockResolvedValue({ data: [] }),
    getAnaliticaText: vi.fn().mockResolvedValue("{}"),
    postAnalitica: vi.fn().mockResolvedValue({}),
    getCarteiraToken: vi.fn().mockReturnValue("token"),
    getCarteira: vi.fn().mockImplementation((path: string) =>
      Promise.resolve(path === "/auth/me" ? {
        _id: "user-1", assets: [], investimentGoals: [], diagramQuestions: [],
      } : {}),
    ),
    getCarteiraPageText: vi.fn().mockResolvedValue(
      "País,Country,Principal Índice,ETFs Americanos,S&P,Moody's,Fitch,Nível de Risco,Empresa,Ticker,Setor,GeoJSON name\n",
    ),
    postCarteira: vi.fn().mockResolvedValue({}),
    patchCarteira: vi.fn().mockResolvedValue({}),
    deleteCarteira: vi.fn().mockResolvedValue({}),
  } as unknown as AuvpFinancasClient;
}

describe("live scan safety", () => {
  it("does not call write methods in the default Finanças scan", async () => {
    const client = mockClient();
    await scanFinancasTools(client);
    expect(client.post).not.toHaveBeenCalled();
    expect(client.patch).not.toHaveBeenCalled();
    expect(client.delete).not.toHaveBeenCalled();
  });

  it("does not call POST in the default Analítica scan", async () => {
    const client = mockClient();
    await scanAnaliticaTools(client);
    expect(client.postAnalitica).not.toHaveBeenCalled();
  });

  it("does not call write methods in the default Carteira scan", async () => {
    const client = mockClient();
    await scanCarteiraTools(client);
    expect(client.postCarteira).not.toHaveBeenCalled();
    expect(client.patchCarteira).not.toHaveBeenCalled();
    expect(client.deleteCarteira).not.toHaveBeenCalled();
  });
});
