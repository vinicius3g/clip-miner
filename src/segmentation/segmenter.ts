import type { TranscriptSegment } from "../transcription/types.js";

export interface TranscriptChunk {
  id: number;
  start: number;
  end: number;
  segments: TranscriptSegment[];
  text: string;
}

interface Options {
  chunkSeconds: number;
  overlapSeconds: number;
}

export function createChunks(
  segments: TranscriptSegment[],
  options: Options
): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];

  const { chunkSeconds, overlapSeconds } = options;

  const duration = segments.at(-1)?.end ?? 0;

  const step = Math.max(chunkSeconds - overlapSeconds, 1);

  let start = 0;
  let id = 0;

  while (start < duration) {
    const end = Math.min(start + chunkSeconds, duration);

    const chunkSegments = segments.filter(
      (segment) => segment.end >= start && segment.start <= end
    );

    chunks.push({
      id,
      start,
      end,
      segments: chunkSegments,
      text: chunkSegments
        .map((segment) => `[${segment.start.toFixed(2)}] ${segment.text}`)
        .join("\n"),
    });

    id++;
    start += step;
  }

  return chunks;
}
