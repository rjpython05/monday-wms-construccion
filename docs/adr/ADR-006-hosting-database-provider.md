# ADR-006: Proveedor de hosting y base de datos

## Estado
Aprobado

## Fecha y decisores
2026-10-02 (propuesto) · 2026-10-03 (aprobado) · Analista de Fase 0 (propone) · rjpython05@gmail.com (RT, aprueba)

## Contexto
El blueprint (§2, §12) ya selecciona Vercel Pro + Supabase Pro con justificación de costo y de evitar las limitaciones de los planes gratuitos para uso comercial. El plan maestro (§11, §20) exige que esta elección quede fijada por ADR antes de empezar a construir.

## Decisión
Se ratifica la elección del blueprint:
- **Hosting de aplicación**: Vercel Pro (no Hobby, prohibido para uso comercial), con Fluid Compute habilitado para reducir cold starts dentro del iframe.
- **Base de datos**: Supabase Pro (no Free, se pausa tras 7 días de inactividad) desde el lanzamiento comercial; puede usarse el plan gratuito únicamente en desarrollo local/CI si el proveedor lo permite para ese uso.
- **Conexión**: pooler de Supabase, puerto 6543, **Transaction Mode**, `prepare: false` en Drizzle; conexión directa (puerto 5432) reservada exclusivamente a migraciones, ejecutadas con un rol distinto (`migrator`).
- **Escalamiento futuro**: mover trabajo pesado a un worker dedicado (Railway) o a Supabase Team ($599/mes) se evalúa solo cuando el ingreso lo justifique — no se diseña prematuramente para esa escala.

## Alternativas
- **BD dedicada por cliente (schema o instancia por tenant)**: descartada para el MVP — complejidad operativa no justificada a esta escala (coherente con §12 del plan maestro, "evita la complejidad operativa de BD-por-cliente").
- **Hosting alternativo (Railway, Render, Fly.io) para la aplicación**: no evaluado a fondo; Vercel se mantiene por integración nativa con Next.js y porque ya es la base de costeo del blueprint. Puede reabrirse si el costo por tenant no sostiene la hipótesis comercial (criterio de parada §35.6 del plan maestro).

## Consecuencias
- Costo de arranque realista de ~$45–50/mes (Vercel Pro + Supabase Pro), antes de escalar por asiento/uso.
- Todo el código de acceso a datos debe asumir pooler en modo transacción desde el día uno (ver ADR-001), no se puede "arreglar después".

## Verificación
Pruebas de Fase 2: conectividad vía pooler, comportamiento ante agotamiento de conexiones, simulacro de restauración de backup cronometrado contra NFR-005/NFR-006.

## Evidencia
Blueprint §2, §12.

## Revisión
Reevaluar si el costo de infraestructura por tenant activo (métrica de §36.3 del plan maestro) se acerca al límite de la hipótesis comercial.

## Addendum (2026-10-03): versión mayor de PostgreSQL

Resuelve la Ambigüedad 1 del análisis de Fase 1 (`/docs/execution/phase-status.md`). Verificado contra el changelog y la documentación oficial vigente de Supabase (no memoria del modelo, conforme a §5 del plan maestro):

- Supabase soporta actualmente PostgreSQL 15 y 17 (más la variante OrioleDB-17). El soporte de PostgreSQL 14 se deprecó y se retira el 1 de julio de 2026; todo proyecto que siga en una versión deprecada se migra automáticamente a la última disponible.
- Ninguna de las extensiones no soportadas en la versión 17 (`plv8`, `timescaledb`, `pgjwt`, `plcoffee`, `plls`) es usada por este diseño.

**Decisión:** se fija **PostgreSQL 17** como versión mayor para el servicio de PostgreSQL en CI (Fase 1), y para el proyecto Supabase de staging y producción (Fase 2). Esta es la versión que debe coincidir entre los tres entornos según §11 del plan maestro.

**Aprobado por:** rjpython05@gmail.com (RT), 2026-10-03.

**Fuentes:** [Deprecation Notice: Postgres 14 ending 1 July 2026](https://supabase.com/changelog/45827-deprecation-notice-support-for-postgres-14-ending-on-1st-july-2026) · [Upgrading — Supabase Docs](https://supabase.com/docs/guides/platform/upgrading)
