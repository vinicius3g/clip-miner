import type { Candidate } from "./types.js";

export function overlapAmount(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

export function iou(a: Candidate, b: Candidate): number {
  const intersection = overlapAmount(a.start, a.end, b.start, b.end);
  const union = a.end - a.start + (b.end - b.start) - intersection;

  return union <= 0 ? 0 : intersection / union;
}

// Remove candidatos que se sobrepõem acima do limiar, mantendo o de maior score.
export function deduplicate(candidates: Candidate[], threshold = 0.5): Candidate[] {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);

  const result: Candidate[] = [];

  for (const candidate of sorted) {
    const duplicate = result.some((existing) => iou(candidate, existing) > threshold);

    if (!duplicate) {
      result.push(candidate);
    }
  }

  return result;
}
