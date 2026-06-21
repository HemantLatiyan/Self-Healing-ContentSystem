import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "@/lib/env";

let cached: ReturnType<typeof createGoogleGenerativeAI> | null = null;

function provider() {
  if (cached) return cached;
  cached = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY() });
  return cached;
}

export function geminiModel() {
  return provider()(env.GEMINI_MODEL());
}
