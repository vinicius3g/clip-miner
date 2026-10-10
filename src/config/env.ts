import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY é obrigatório"),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
  GEMINI_FAST_MODEL: z.string().default("gemini-flash-lite-latest"),
  CHUNK_MINUTES: z.coerce.number().positive().default(12),
  CHUNK_OVERLAP_SECONDS: z.coerce.number().nonnegative().default(30),
  MIN_CLIP_SECONDS: z.coerce.number().positive().default(25),
  MAX_CLIP_SECONDS: z.coerce.number().positive().default(90),
  TOP_CLIPS: z.coerce.number().int().positive().default(10),
  SINGLE_CALL_TOKEN_BUDGET: z.coerce.number().int().positive().default(300000),
  CLIP_PROFILE: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
      .join("\n");

    throw new Error(`Configuração inválida no .env:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}
