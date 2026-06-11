import { describe, expect, it } from "vitest";
import { parseLeaderboardHtml } from "../src/comunidade/widgets.js";

const SAMPLE = `
<li class='ipsDataItem'>
  <strong>1</strong>
  <a href='https://comunidade.auvp.com.br/profile/20109-eddy-paulini/'>Eddy Paulini</a>
  <a class='ipsRepBadge ipsRepBadge_positive'>292</a>
</li>
`;

describe("comunidadeWidgets", () => {
  it("parses leaderboard widget HTML", () => {
    const entries = parseLeaderboardHtml(SAMPLE);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      position: 1,
      name: "Eddy Paulini",
      profileUrl: "https://comunidade.auvp.com.br/profile/20109-eddy-paulini/",
      score: 292,
    });
  });
});
