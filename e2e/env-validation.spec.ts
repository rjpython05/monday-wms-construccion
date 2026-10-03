import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";

// AC-01-07: el arranque real del servidor (no solo la función aislada
// getEnv()) debe fallar con un mensaje claro si falta una variable de
// entorno requerida. Reutiliza el build ya generado por el webServer de
// Playwright (pnpm build && pnpm start) y levanta una segunda instancia en
// otro puerto con MONDAY_CLIENT_SECRET vacío.
const VALID_DUMMY_ENV = {
  DATABASE_URL:
    "postgresql://wms_app:wms_local_dev_only@localhost:5433/wms_dev",
  DIRECT_DATABASE_URL:
    "postgresql://wms_app:wms_local_dev_only@localhost:5433/wms_dev",
  MONDAY_CLIENT_ID: "e2e-dummy-client-id",
  MONDAY_CLIENT_SECRET: "e2e-dummy-client-secret",
  MONDAY_SIGNING_SECRET: "e2e-dummy-signing-secret",
  SUPABASE_SERVICE_ROLE_KEY: "e2e-dummy-service-role-key",
  UPSTASH_REDIS_URL: "https://e2e-dummy.upstash.io",
  UPSTASH_REDIS_TOKEN: "e2e-dummy-redis-token",
  NEXT_PUBLIC_MONDAY_CLIENT_ID: "e2e-dummy-client-id",
};

test("next start falla de verdad si falta una variable de entorno requerida", async () => {
  const child = spawn("pnpm", ["exec", "next", "start", "-p", "3010"], {
    cwd: process.cwd(),
    env: { ...process.env, ...VALID_DUMMY_ENV, MONDAY_CLIENT_SECRET: "" },
    shell: true,
  });

  let output = "";
  child.stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on("exit", (code) => resolve(code));
  });

  expect(exitCode).not.toBe(0);
  expect(output).toContain("Variables de entorno inválidas o faltantes");
  expect(output).toContain("MONDAY_CLIENT_SECRET");
});
