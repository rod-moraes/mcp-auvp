import { describe, expect, it } from "vitest";
import {
  createManualAccountSchema,
  createManualTransactionSchema,
  createTagSchema,
} from "../src/mcp/schemas/zod.js";

describe("finanças write schemas", () => {
  it("normaliza conta manual conforme o frontend", () => {
    expect(
      createManualAccountSchema.parse({
        name: "Poupança",
        type: "bank",
        subtype: "SAVINGS_ACCOUNT",
        number: "123",
        balance: 250.5,
        bankCode: 260,
      }),
    ).toEqual({
      name: "Poupança",
      type: "BANK",
      subtype: "SAVINGS_ACCOUNT",
      number: "123",
      balance: 250.5,
      bankCode: 260,
    });
  });

  it("força CREDIT_CARD em contas de crédito", () => {
    expect(
      createManualAccountSchema.parse({
        name: "Cartão",
        type: "CREDIT",
        subtype: "CHECKING_ACCOUNT",
        number: "9999",
        balance: 0,
        creditData: { brand: "VISA" },
      }),
    ).toMatchObject({
      type: "CREDIT",
      subtype: "CREDIT_CARD",
      creditData: { brand: "VISA" },
    });
  });

  it("monta payload de transação manual com accountId", () => {
    expect(
      createManualTransactionSchema.parse({
        accountId: "10001",
        amount: 12.5,
        type: "debit",
        description: "Teste",
        date: "11-06-2026 12:00",
        tagIds: [1, 2],
      }),
    ).toEqual({
      accountId: 10001,
      amount: 12.5,
      type: "DEBIT",
      description: "Teste",
      date: "11-06-2026 12:00",
      tagIds: [1, 2],
      ignore: false,
      isRecurrent: false,
    });
  });

  it("valida cor hexadecimal de tag", () => {
    expect(() =>
      createTagSchema.parse({ name: "TESTE", color: "ff00ff" }),
    ).toThrow();
    expect(createTagSchema.parse({ name: "TESTE", color: "#ff00ff" })).toEqual({
      name: "TESTE",
      color: "#ff00ff",
    });
  });
});
