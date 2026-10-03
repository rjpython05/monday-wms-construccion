import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env["CI"],
    timeout: 120000,
    env: {
      DATABASE_URL:
        "postgresql://wms_app:wms_local_dev_only@localhost:5433/wms_dev",
      DIRECT_DATABASE_URL:
        "postgresql://wms_app:wms_local_dev_only@localhost:5433/wms_dev",
      MONDAY_CLIENT_ID: "e2e-dummy-client-id",
      MONDAY_CLIENT_SECRET: "e2e-dummy-client-secret", // gitleaks:allow
      MONDAY_SIGNING_SECRET: "e2e-dummy-signing-secret", // gitleaks:allow
      SUPABASE_SERVICE_ROLE_KEY: "e2e-dummy-service-role-key", // gitleaks:allow
      UPSTASH_REDIS_URL: "https://e2e-dummy.upstash.io",
      UPSTASH_REDIS_TOKEN: "e2e-dummy-redis-token", // gitleaks:allow
      NEXT_PUBLIC_MONDAY_CLIENT_ID: "e2e-dummy-client-id",
    },
  },
});
