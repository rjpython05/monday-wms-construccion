export async function register() {
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    const { getEnv } = await import("@/lib/env");
    try {
      getEnv();
    } catch (error) {
      // Next.js registra el error de instrumentación como una excepción no
      // manejada pero no termina el proceso por sí solo (verificado en vivo
      // con `next start`): el servidor HTTP queda escuchando en un estado
      // roto. Forzamos un fallo determinístico y observable en el arranque.
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}
