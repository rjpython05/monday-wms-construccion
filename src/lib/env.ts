import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_DATABASE_URL: z.string().url(),
  MONDAY_CLIENT_ID: z.string().min(1),
  MONDAY_CLIENT_SECRET: z.string().min(1),
  MONDAY_SIGNING_SECRET: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  UPSTASH_REDIS_URL: z.string().url(),
  UPSTASH_REDIS_TOKEN: z.string().min(1),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_MONDAY_CLIENT_ID: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Variables de entorno inválidas o faltantes:\n${issues}\n` +
        "Revisa .env.example para la lista completa.",
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
