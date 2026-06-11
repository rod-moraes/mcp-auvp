import { describe, expect, it } from "vitest";
import { buildQueryString } from "../src/core/query.js";

describe("buildQueryString", () => {
  it("omits empty optional values", () => {
    expect(
      buildQueryString({
        page: 1,
        limit: undefined,
        status: "",
        type: null,
        accountIds: [],
      }),
    ).toBe("page=1");
  });

  it("preserves false and zero values", () => {
    expect(buildQueryString({ enabled: false, amount: 0 })).toBe(
      "enabled=false&amount=0",
    );
  });

  it("serializes arrays as comma-separated values", () => {
    expect(
      buildQueryString({
        accountIds: ["account-a", "account-b"],
      }),
    ).toBe("accountIds=account-a%2Caccount-b");
  });
});
