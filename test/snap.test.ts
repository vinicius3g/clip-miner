import { describe, expect, it } from "vitest";
import { snapToSegments } from "../src/transcription/snap.js";
import type { TranscriptSegment } from "../src/transcription/types.js";

const segments: TranscriptSegment[] = [
  { id: 0, start: 0, end: 5, text: "a" },
  { id: 1, start: 5, end: 11, text: "b" },
  { id: 2, start: 11, end: 18, text: "c" },
  { id: 3, start: 18, end: 25, text: "d" },
];

describe("snapToSegments", () => {
  it("ajusta o intervalo aos limites de segmento mais próximos", () => {
    const snapped = snapToSegments(5.4, 17.2, segments);
    expect(snapped).toEqual({ start: 5, end: 18 });
  });

  it("garante fim depois do início", () => {
    const snapped = snapToSegments(10, 10.1, segments);
    expect(snapped.end).toBeGreaterThan(snapped.start);
  });

  it("retorna o intervalo original sem segmentos", () => {
    expect(snapToSegments(3, 7, [])).toEqual({ start: 3, end: 7 });
  });
});
