import { describe, expect, it } from "vitest";
import { Client } from "pg";

// Prueba de integración contra PostgreSQL real (invariante #19 de CLAUDE.md:
// nada de mocks para Postgres). Requiere `pnpm db:up` antes de ejecutar.
describe("conexión a PostgreSQL real", () => {
  it("conecta y ejecuta SELECT 1 contra el Postgres 17 de docker-compose", async () => {
    const client = new Client({
      connectionString:
        process.env["DIRECT_DATABASE_URL"] ??
        "postgresql://wms_app:wms_local_dev_only@localhost:5433/wms_dev",
    });
    await client.connect();
    try {
      const result = await client.query("SELECT 1 AS ok");
      expect(result.rows[0]?.["ok"]).toBe(1);
    } finally {
      await client.end();
    }
  });
});
