import { loadEnv } from "../config/env.js";
import { generateStructured } from "./gemini.js";
import { withRetry } from "./retry.js";
import { buildRankingPrompt } from "./prompts.js";
import { emptyUsage, type Usage } from "./usage.js";
import {
  CandidateListSchema,
  toGeminiResponseSchema,
  type Candidate,
} from "../candidates/types.js";
import { overlapAmount } from "../candidates/deduplicate.js";

// Garante que o corte usado seja o candidato original (com timestamps já ajustados).
function matchToInput(ranked: Candidate, input: Candidate[]): Candidate {
  let best: Candidate | null = null;
  let bestOverlap = 0;

  for (const candidate of input) {
    const overlap = overlapAmount(
      ranked.start,
      ranked.end,
      candidate.start,
      candidate.end
    );

    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = candidate;
    }
  }

  return best ?? ranked;
}

function dedupeByBounds(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const result: Candidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.start}-${candidate.end}`;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(candidate);
  }

  return result;
}

export async function rankCandidates(
  candidates: Candidate[]
): Promise<{ candidates: Candidate[]; usage: Usage }> {
  const env = loadEnv();

  if (candidates.length <= env.TOP_CLIPS) {
    return { candidates, usage: emptyUsage() };
  }

  const prompt = buildRankingPrompt(candidates, env.TOP_CLIPS, env.CLIP_PROFILE);
  const result = await withRetry(() =>
    generateStructured(env.GEMINI_MODEL, prompt, toGeminiResponseSchema(), 0.3)
  );

  let selected: Candidate[];

  try {
    const parsed = CandidateListSchema.safeParse(JSON.parse(result.text || "{}"));
    selected = parsed.success
      ? parsed.data.candidates
      : candidates.slice(0, env.TOP_CLIPS);
  } catch {
    selected = candidates.slice(0, env.TOP_CLIPS);
  }

  const matched = dedupeByBounds(
    selected.map((candidate) => matchToInput(candidate, candidates))
  );

  return { candidates: matched.slice(0, env.TOP_CLIPS), usage: result.usage };
}
