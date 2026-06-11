import { describe, expect, it } from "vitest";
import {
  getFinancasRouteHint,
  normalizeFinancasApiPath,
} from "../src/financas/catalog.js";

describe("finanças catalog helpers", () => {
  it("normaliza ids numéricos no path", () => {
    expect(normalizeFinancasApiPath("/bills/account/10002")).toBe(
      "/bills/account/:id",
    );
  });

  it("retorna dica para rotas com restrição de plano", () => {
    expect(
      getFinancasRouteHint(
        "https://financas-api.auvp.com.br/users",
        403,
      ),
    ).toContain("403 em planos sem permissão");
  });
});
