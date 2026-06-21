function read(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

export const env = {
  DATABASE_URL: () => read("DATABASE_URL"),
  SUPABASE_URL: () => read("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_PUBLISHABLE_KEY: () => read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: () => read("SUPABASE_SERVICE_ROLE_KEY"),
  GEMINI_API_KEY: () => read("GEMINI_API_KEY"),
  AUTO_HEAL_THRESHOLD: () => Number(process.env.AUTO_HEAL_THRESHOLD ?? "0.85"),
  GEMINI_MODEL: () => process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
};
