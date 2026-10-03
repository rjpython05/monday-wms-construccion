import { describe, expect, it } from "vitest";

// Placeholder de Fase 1: el runner de pruebas de seguridad (RLS/BOLA) queda
// cableado en CI (T7) desde esta fase. Las pruebas reales de RLS/tenencia
// se añaden en la Fase 4, cuando exista el primer schema con tenant_id.
describe("test:security (placeholder Fase 1)", () => {
  it("el runner de seguridad está operativo", () => {
    expect(true).toBe(true);
  });
});
