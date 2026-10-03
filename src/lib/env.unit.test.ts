import { describe, expect, it, beforeEach, vi } from "vitest";

describe("getEnv", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("falla con un mensaje claro si falta una variable requerida", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getEnv } = await import("./env");
    expect(() => getEnv()).toThrowError(/Variables de entorno inválidas/);
    vi.unstubAllEnvs();
  });

  it("assertion deliberadamente falsa para demostración del gate (T16)", () => {
    expect(1).toBe(2);
  });
});
