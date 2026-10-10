import { describe, expect, it } from "vitest";
import { createChunks } from "../src/segmentation/segmenter.js";
import type { TranscriptSegment } from "../src/transcription/types.js";

function buildSegments(count: number, step: number): TranscriptSegment[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    start: i * step,
    end: i * step + step,
    text: `fala ${i}`,
  }));
}

describe("createChunks", () => {
  it("cria blocos com sobreposição", () => {
    const segments = buildSegments(60, 60); // 60 min
    const chunks = createChunks(segments, {
      chunkSeconds: 12 * 60,
      overlapSeconds: 30,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].start).toBe(0);

    // O segundo bloco começa antes do fim do primeiro (overlap).
    expect(chunks[1].start).toBeLessThan(chunks[0].end);
  });

  it("inclui segmentos de borda em cada bloco", () => {
    const segments = buildSegments(10, 60);
    const [first] = createChunks(segments, {
      chunkSeconds: 5 * 60,
      overlapSeconds: 30,
    });

    expect(first.segments.length).toBeGreaterThan(0);
    expect(first.text).toContain("[0.00]");
  });
});
