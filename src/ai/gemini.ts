import { GoogleGenAI } from "@google/genai";
import { loadEnv } from "../config/env.js";
import type { Usage } from "./usage.js";

const env = loadEnv();

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export interface StructuredResult {
  text: string;
  usage: Usage;
}

export async function generateStructured(
  model: string,
  prompt: string,
  responseJsonSchema: unknown,
  temperature = 0.2
): Promise<StructuredResult> {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature,
      responseMimeType: "application/json",
      responseJsonSchema,
    },
  });

  const metadata = response.usageMetadata;

  return {
    text: response.text ?? "",
    usage: {
      promptTokens: metadata?.promptTokenCount ?? 0,
      outputTokens: metadata?.candidatesTokenCount ?? 0,
      totalTokens: metadata?.totalTokenCount ?? 0,
    },
  };
}
