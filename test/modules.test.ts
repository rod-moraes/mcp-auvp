import { describe, expect, it } from "vitest";
import {
  ALL_AUVP_MODULES,
  getModulesFlagValue,
  parseAuvpModules,
  resolveEnabledModules,
} from "../src/mcp/modules.js";

describe("module selection", () => {
  it("enables every module when selection is absent or empty", () => {
    expect(parseAuvpModules(undefined)).toEqual(ALL_AUVP_MODULES);
    expect(parseAuvpModules("  ")).toEqual(ALL_AUVP_MODULES);
  });

  it("normalizes and deduplicates a comma-separated selection", () => {
    expect(parseAuvpModules(" CARTEIRA,financas,carteira ")).toEqual([
      "financas",
      "carteira",
    ]);
  });

  it("uses the CLI flag before AUVP_MODULES", () => {
    expect(
      resolveEnabledModules(["--modules", "dicionario,carteira"], {
        AUVP_MODULES: "financas",
      }),
    ).toEqual(["carteira", "dicionario"]);
    expect(getModulesFlagValue(["--modules=analitica"])).toBe("analitica");
  });

  it("fails fast for unknown modules or a missing flag value", () => {
    expect(() => parseAuvpModules("piar")).toThrow(/Valores aceitos/);
    expect(() => getModulesFlagValue(["--modules"])).toThrow(/exige/);
  });
});

