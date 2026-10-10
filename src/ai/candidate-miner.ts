import { loadEnv } from "../config/env.js";
import { generateStructured } from "./gemini.js";
import { withRetry } from "./retry.js";
import { buildCandidatePrompt } from "./prompts.js";
import { estimateTokens } from "./token-budget.js";
import { addUsage, emptyUsage, type Usage } from "./usage.js";
import { createChunks } from "../segmentation/segmenter.js";
import { renderSegments } from "../transcription/render.js";
import { snapToSegments } from "../transcription/snap.js";
import { sleep } from "../utils/sleep.js";
import {
  CandidateListSchema,
  toGeminiResponseSchema,
  type Candidate,
} from "../candidates/types.js";
import type { Transcript, TranscriptSegment } from "../transcription/types.js";

export interface MineResult {
  candidates: Candidate[];
  usage: Usage;
  usedChunking: boolean;
}

function parseCandidates(text: string, segments: TranscriptSegment[]): Candidate[] {
  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }

  const parsed = CandidateListSchema.safeParse(json);
  if (!parsed.success) return [];

  return parsed.data.candidates.map((candidate) => {
    const snapped = snapToSegments(candidate.start, candidate.end, segments);
    return { ...candidate, start: snapped.start, end: snapped.end };
  });
}

export async function mineCandidates(transcript: Transcript): Promise<MineResult> {
  const env = loadEnv();
  const schema = toGeminiResponseSchema();
  const model = env.GEMINI_FAST_MODEL;

  const fullText = renderSegments(transcript.segments);

  let usage = emptyUsage();
  const collected: Candidate[] = [];

  if (estimateTokens(fullText) <= env.SINGLE_CALL_TOKEN_BUDGET) {
    const prompt = buildCandidatePrompt(fullText, env.CLIP_PROFILE);
    const result = await withRetry(() => generateStructured(model, prompt, schema));

    usage = addUsage(usage, result.usage);
    collected.push(...parseCandidates(result.text, transcript.segments));

    return { candidates: collected, usage, usedChunking: false };
  }

  const chunks = createChunks(transcript.segments, {
    chunkSeconds: env.CHUNK_MINUTES * 60,
    overlapSeconds: env.CHUNK_OVERLAP_SECONDS,
  });

  for (const chunk of chunks) {
    const prompt = buildCandidatePrompt(chunk.text, env.CLIP_PROFILE);
    const result = await withRetry(() => generateStructured(model, prompt, schema));

    usage = addUsage(usage, result.usage);
    collected.push(...parseCandidates(result.text, transcript.segments));

    await sleep(1500);
  }

  return { candidates: collected, usage, usedChunking: true };
}
