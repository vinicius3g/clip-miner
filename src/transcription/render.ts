import type { TranscriptSegment } from "./types.js";

export function renderSegments(segments: TranscriptSegment[]): string {
  return segments
    .map((segment) => `[${segment.start.toFixed(2)}] ${segment.text}`)
    .join("\n");
}
