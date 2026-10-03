# ADR-001: Patrón de tenant context y RLS

## Estado
Aprobado

## Fecha y decisores
2026-10-02 (propuesto) · 2026-10-03 (aprobado) · Analista de Fase 0 (propone) · rjpython05@gmail.com (RT, aprueba)

## Contexto
El blueprint original (`monday-wms-construccion-blueprint.md` §4) define `withTenant()` usando `SET LOCAL app.tenant_id = ${tenantId}` con interpolación directa del valor en el string SQL, y una política RLS de ejemplo con solo `USING`, sin `WITH CHECK`. El plan maestro (`master-plan.md` §12.1) exige explícitamente lo contrario. Ver CHG-001.

## Decisión
1. `withTenant(tenantId, fn)` abre una transacción explícita y ejecuta `SELECT set_config('app.tenant_id', $1, true)` como **consulta parametrizada** (nunca interpolación de string), antes de invocar `fn`.
2. Toda tabla con `tenant_id` tiene `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` y una política con **ambas** cláusulas:
   ```sql
   CREATE POLICY tenant_isolation ON <tabla>
     USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
     WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
   ```
3. El rol de conexión de la aplicación (`app_user`) no es propietario de las tablas, no tiene `BYPASSRLS` y no tiene privilegios de DDL. Las migraciones usan un rol separado (`migrator`), propietario del esquema.
4. `SUPABASE_SERVICE_ROLE_KEY` **no se usa en el camino de ejecución normal de la aplicación** (rutas de negocio bajo `(embedded)` y `api/*` tenant-scoped). Se reserva exclusivamente para tareas de plataforma explícitamente aprobadas por ADR futuro (si alguna llega a necesitarlo), nunca para servir una request de un tenant.
5. Toda query de negocio pasa por `withTenant()`; se prohíbe por lint una importación directa del cliente de base de datos fuera de ese módulo (lista blanca: migraciones, tareas de plataforma).

## Alternativas
- **Mantener el patrón del blueprint**: descartada — contradice §12.1 del documento rector y es un criterio de rechazo automático de fase (§33).
- **`SET LOCAL` con escape manual del valor**: descartada — el parámetro vía `set_config()` ya resuelve esto de forma nativa y auditable; escapar manualmente es una fuente de error recurrente.

## Consecuencias
- Requiere que todo acceso a datos tenant-scoped pase por un único punto (`tenant-context.ts`), lo que simplifica la auditoría pero exige disciplina desde el primer commit.
- El rol `app_user` necesita permisos `GRANT` explícitos por tabla (no hereda nada de ser propietario), lo que se gestiona en las migraciones.

## Verificación
- Control de CI que falla si existe una tabla con `tenant_id` sin ambas políticas (plan maestro §12.3).
- Suite anti-BOLA de Fase 4: lectura/escritura/inserción cruzada entre dos tenants, incluyendo intento de `INSERT` con `tenant_id` ajeno (debe fallar por `WITH CHECK`).
- Prueba de concurrencia con el pooler real alternando tenant en cientos de requests paralelos (pendiente de entorno real — ver RSK-004).

## Evidencia
`master-plan.md` §12.1–§12.3; búsqueda de contradicción documentada en CHG-001.

## Revisión
Reevaluar si Supabase/PgBouncer cambia el comportamiento de `set_config` en modo transacción, o si se introduce un ORM distinto a Drizzle.
