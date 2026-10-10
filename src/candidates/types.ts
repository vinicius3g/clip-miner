import { z } from "zod";

export const CATEGORIES = [
  "motivacao",
  "disciplina",
  "insight",
  "historia",
  "curiosidade",
  "emocao",
  "contraste",
  "conselho",
  "outro",
] as const;

export const CandidateSchema = z.object({
  start: z.number(),
  end: z.number(),
  title: z.string(),
  hook: z.string(),
  category: z.enum(CATEGORIES),
  reason: z.string(),
  score: z.number().min(0).max(100),
});

export const CandidateListSchema = z.object({
  candidates: z.array(CandidateSchema),
});

export type Candidate = z.infer<typeof CandidateSchema>;

// Fonte única do schema: o responseSchema do Gemini é derivado do Zod.
export function toGeminiResponseSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(CandidateListSchema) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}
