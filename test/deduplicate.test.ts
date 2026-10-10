import { describe, expect, it } from "vitest";
import { deduplicate } from "../src/candidates/deduplicate.js";
import type { Candidate } from "../src/candidates/types.js";

function candidate(start: number, end: number, score: number): Candidate {
  return {
    start,
    end,
    score,
    title: "t",
    hook: "h",
    reason: "r",
    category: "insight",
  };
}

describe("deduplicate", () => {
  it("remove candidatos muito sobrepostos mantendo o maior score", () => {
    const result = deduplicate([
      candidate(0, 50, 60),
      candidate(2, 52, 90),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(90);
  });

  it("mantém candidatos adjacentes distintos", () => {
    const result = deduplicate([
      candidate(0, 50, 80),
      candidate(49, 100, 70),
    ]);

    expect(result).toHaveLength(2);
  });
});
