import type { TranscriptSegment } from "./types.js";

function nearest(
  segments: TranscriptSegment[],
  pick: (segment: TranscriptSegment) => number,
  target: number
): TranscriptSegment {
  let best = segments[0];
  let bestDistance = Math.abs(pick(best) - target);

  for (const segment of segments) {
    const distance = Math.abs(pick(segment) - target);
    if (distance < bestDistance) {
      best = segment;
      bestDistance = distance;
    }
  }

  return best;
}

// Ajusta um intervalo aos limites de segmento mais próximos para não cortar no meio da frase.
export function snapToSegments(
  start: number,
  end: number,
  segments: TranscriptSegment[]
): { start: number; end: number } {
  if (segments.length === 0) {
    return { start, end };
  }

  const startSegment = nearest(segments, (segment) => segment.start, start);
  const endSegment = nearest(segments, (segment) => segment.end, end);

  const snappedStart = startSegment.start;
  const snappedEnd = Math.max(endSegment.end, startSegment.end);

  return { start: snappedStart, end: snappedEnd };
}
