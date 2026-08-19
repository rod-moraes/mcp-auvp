import { describe, expect, it } from "vitest";
import {
  sanitizeDictionarySearchResponse,
  sanitizeDictionaryTerm,
} from "../src/dicionario/normalize.js";

describe("Dicionário normalization", () => {
  it("converts HTML definitions to text and drops personal metadata", () => {
    const result = sanitizeDictionaryTerm({
      _id: "term-1",
      concept: "Ágio",
      definition: "<p>Valor &amp; prêmio</p>",
      categories: "DEFAULT",
      validated: true,
      createdAt: "2026-01-01T00:00:00Z",
      createdBy: { name: "Pessoa", email: "secret@example.com", photoUrl: "data:image/png" },
    });
    expect(result).toEqual({
      id: "term-1",
      concept: "Ágio",
      definition: "Valor & prêmio",
      category: "DEFAULT",
      validated: true,
      createdAt: "2026-01-01T00:00:00Z",
    });
    expect(JSON.stringify(result)).not.toContain("secret@example.com");
  });

  it("sanitizes every term in a paginated response", () => {
    expect(
      sanitizeDictionarySearchResponse({
        totalPages: 25,
        terms: [{ _id: "1", concept: "ADR", definition: "<b>Definição</b>" }],
      }),
    ).toEqual({
      totalPages: 25,
      terms: [{ id: "1", concept: "ADR", definition: "Definição" }],
    });
  });
});

