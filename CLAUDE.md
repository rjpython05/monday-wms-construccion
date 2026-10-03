# CLAUDE.md

## Proyecto

WMS multi-tenant embebido en monday.com Marketplace (Custom Object), para gestión de almacenes orientada inicialmente a construcción (control de materiales por proyecto/obra), diseñado como producto horizontal. Diferenciador: control de costos por centro de costo/proyecto con **segregación de funciones aplicada en el backend**, costeo por lote multi-moneda y trazabilidad completa vía ledger inmutable.

- **Plan maestro (documento rector, normativo):** `/docs/execution/master-plan.md`
- **Fase activa y estado de todas las fases:** `/docs/execution/phase-status.md`
- **Especificación detallada por fase:** `/docs/phases/phase-NN-*.md`
- **Blueprint de producto (fuente de diseño original):** `/monday-wms-construccion-blueprint.md`

**Trabaja SOLO en la fase activa indicada en `phase-status.md`.** No implementes elementos de fases futuras "por conveniencia" (R-03). No marques una fase como `APPROVED` ni la avances: ese es un cambio de estado humano (R-04, R-20).

Ante una ambigüedad que afecte datos, dinero, inventario, seguridad, permisos, estados o contratos públicos: **detente y pregunta** (R-07, R-08). No inventes reglas de negocio para llenar vacíos (R-06).

## Stack técnico

Next.js 15 (App Router) + TypeScript estricto + Tailwind v4 + shadcn/ui + PostgreSQL (Supabase, pooler **Transaction Mode**, puerto 6543) + Drizzle ORM + monday Apps SDK (feature **Custom Object**) + Vercel Pro. Jobs programados: Vercel Cron. Rate limiting: Upstash Redis. Observabilidad: Sentry. Package manager: pnpm.

## Comandos

- Instalar: `pnpm install --frozen-lockfile`
- Dev: `pnpm dev`
- Lint: `pnpm lint`
- Tipos: `pnpm typecheck`
- Unitarias: `pnpm test:unit` (costeo FIFO/FEFO, ATP, reorder point, ABC, decimal)
- Integración: `pnpm test:int` (requiere PostgreSQL real: `pnpm db:up`; nunca mocks)
- RLS / BOLA / tenancy: `pnpm test:security`
- E2E: `pnpm test:e2e` (Playwright)
- Build: `pnpm build`
- Migración desde cero: `pnpm db:reset && pnpm drizzle-kit migrate`
- Generar migración: `pnpm drizzle-kit generate`
- Verificación completa:`pnpm verify` (lint + typecheck + unit + migración vacía + integración + security + build + e2e)

## Arquitectura (resumen — detalle en `/docs/architecture/`)

```
src/app/(embedded)/   Vistas dentro del iframe de monday (Custom Object): dashboard, catálogo,
                      almacenes, solicitudes, compras, conteos, reportes, configuración
src/app/onboarding/   Wizard de primer arranque tras instalación
src/app/api/          Rutas de API: oauth, webhooks, entitlements, requisitions, receiving,
                      purchase-orders, cycle-counts, reports, import, export
src/lib/db/           Cliente Drizzle (prepare:false), schema por dominio, tenant-context.ts
                      (withTenant), rls-policies.sql
src/lib/monday/       SDK wrapper, verificación de signed session token, verificación JWT (HS256)
                      de webhooks, cliente de entitlements con cache + invalidación por webhook
src/lib/costing/      fifo-fefo.ts, fx.ts (multi-moneda), atp.ts, reorder-point.ts,
                      abc-classification.ts — módulos de dominio puro, sin framework
src/lib/rbac/         permissions.ts, check-scope.ts (verificación anti-BOLA)
src/lib/audit/        ledger.ts (único escritor del ledger), admin-audit.ts
```

**Flujo de datos:** cliente (iframe de monday) → signed session token verificado en middleware → Server Component / API route → `withTenant()` (transacción + `SELECT set_config('app.tenant_id', $1, true)`) → Drizzle → PostgreSQL con RLS forzada.

**Jerarquía de datos:** Tenant → CostCenter → Warehouse → Location (árbol recursivo). Item (SKU) con UOMConversion. Lot congela costo y tasa de cambio al recibir. InventoryTransaction es el ledger append-only. Requisition (solicitud → aprobación → despacho/backorder) y PurchaseOrder (borrador → enviada → recibida → cerrada) son los dos verticales transaccionales principales.

## Invariantes no negociables

Solo un ADR aprobado puede modificar estas reglas (ver `/docs/execution/master-plan.md` Parte II para el detalle completo).

1. `tenantId`/`userId` nunca vienen del cliente como fuente de verdad — se derivan de la sesión/signed session token verificado en el servidor.
2. **Toda consulta de negocio pasa por `withTenant()`** (`src/lib/db/tenant-context.ts`). Nunca una query suelta fuera de ese wrapper. Dentro de él se usa `SELECT set_config('app.tenant_id', $1, true)` en una transacción explícita — **nunca `SET` a secas**: con el pooler en Transaction Mode, eso filtra el tenant de una request a la siguiente.
3. **`FORCE ROW LEVEL SECURITY`** en toda tabla con `tenant_id`, con políticas `USING` + `WITH CHECK`. La app se conecta con un rol no propietario, sin `BYPASSRLS` y sin permisos de DDL.
4. Claves únicas y foráneas de tablas tenant-scoped incluyen `tenant_id` (p. ej. `UNIQUE (tenant_id, sku)`, FK compuesta `(tenant_id, id)`).
5. Conexión de aplicación siempre vía el **pooler** (puerto 6543, Transaction Mode, `prepare: false` en Drizzle); el puerto directo 5432 es exclusivo de migraciones.
6. **Decimal exacto siempre**: `NUMERIC`/`DECIMAL` en PostgreSQL y una librería decimal en TypeScript (`decimal.js`) para cantidades, costos y tasas de cambio. **Nunca `number`/`float`/`double`** en cálculos de negocio. Serializar como `string` en JSON.
7. **El ledger (`InventoryTransaction`) es append-only.** El rol de aplicación no tiene `UPDATE`/`DELETE`/`TRUNCATE` sobre la tabla (`REVOKE` + trigger). Una corrección es una transacción nueva que referencia la original. Único escritor: `src/lib/audit/ledger.ts`.
8. Recepción, despacho, transferencia y ajuste son **atómicos**: ledger + saldo derivado + lote + documento de origen se confirman en la misma transacción, o ninguno.
9. **Idempotency key obligatoria** en recepción, despacho, ajuste de conteo, importación y eventos de webhook. Mismo key + mismo payload → misma respuesta sin re-ejecutar; mismo key + payload distinto → error sin efectos.
10. Llamadas a sistemas externos (API de monday, correo, almacenamiento) **nunca** dentro de una transacción de base de datos abierta; efectos externos vía patrón outbox.
11. **Autorización en backend, deny by default**, verificada en `src/lib/rbac/check-scope.ts` en este orden: identidad → tenant → permiso → alcance (centro de costo/almacén) → estado del recurso → segregación de funciones → entitlement del plan. La UI nunca es la protección principal.
12. **Segregación de funciones como constraint de aplicación**: `requisition.requested_by != approved_by` y `approved_by != dispatched_by` se validan en el backend en cada mutación, no solo se ocultan en la UI.
13. Todo endpoint que recibe un ID verifica pertenencia al tenant y alcance del actor (anti-BOLA) antes de cualquier otra cosa.
14. **Webhooks de monday se verifican con JWT (HS256) contra el Signing Secret** — mecanismo distinto y secreto distinto al de los signed session tokens de usuario. Anti-replay y deduplicación por ID de evento obligatorios.
15. OAuth usa `state` anti-CSRF y redirect URIs exactas registradas. Tokens de acceso de cuentas se cifran en reposo y nunca se registran en logs.
16. `CSP frame-ancestors https://*.monday.com` en toda página embebida — nunca `'none'` ni abierto a cualquier dominio.
17. **Nunca prefijar un secreto con `NEXT_PUBLIC_`.** La `SUPABASE_SERVICE_ROLE_KEY` es exclusivamente server-side. Revisar en cada PR.
18. Paginación por cursor obligatoria en todo listado — ninguna tabla carga "todo" sin límite.
19. **Nada de mocks para PostgreSQL, RLS, transacciones, locks, constraints, pooling o concurrencia.** Toda funcionalidad crítica se prueba contra PostgreSQL real.
20. **No se eliminan, debilitan, omiten ni marcan `skip`/`only`/`todo` tests** para obtener un resultado exitoso. Un test flaky en ruta crítica es un defecto bloqueante.
21. Ningún resultado se reporta como ejecutado si no se ejecutó realmente. "No ejecutado" o "no verificable en este entorno" es válido; inventar salida es un hallazgo crítico (S1).
22. Toda migración se prueba desde base vacía y desde el estado anterior con datos representativos.

## Forma de trabajar

- Analiza y propone un plan antes de editar (Especificar → Analizar → Planificar → Implementar → Probar → Validar). Ante ambigüedad crítica (R-07): detente y formula la pregunta concreta; durante el análisis, agrupa todas las ambigüedades bloqueantes en una sola entrega.
- El cambio mínimo correcto tiene prioridad sobre una reescritura amplia (R-05). No se reemplazan patrones existentes si pueden extenderse de forma segura (R-10).
- No se modifica la arquitectura sin un ADR aprobado que documente la causa técnica (R-09).
- Reporta solo lo que ejecutaste realmente, con su salida. Si no ejecutaste algo, dilo explícitamente.
- Propuestas de mejora fuera del alcance de la fase activa: regístralas en el reporte, no las implementes (R-03).
- Jerarquía de fuentes de verdad ante conflicto: especificación de la fase activa → blueprint aprobado → ADR vigentes → reglas de negocio documentadas → matriz de roles/permisos → arquitectura documentada → contratos públicos → pruebas válidas → implementación actual. Un conflicto entre los primeros niveles **no se resuelve eligiendo**: se detiene la fase y se escala.
- La documentación oficial vigente de monday.com, PostgreSQL y el proveedor de hosting prevalece sobre la memoria del modelo: verifica comportamiento de APIs externas contra documentación o prueba real, no contra suposiciones.

## Prohibido

- Leer `.env*` (excepto `.env.example`) o usar credenciales de producción. Claude Code nunca tiene acceso a producción.
- Desplegar a producción, `git push --force`, o modificar workflows de CI sin indicación explícita.
- Vercel Hobby o Supabase Free en producción — Pro en ambos desde el lanzamiento comercial.
- `any`, `@ts-ignore`, `@ts-expect-error` sin comentario que explique la causa y referencia a ticket.
- `catch` vacíos, errores silenciados, `console.log` en código de producción (usar el logger estructurado).
- Publicar en el Marketplace sin que Política de Privacidad y Términos de Uso hayan pasado revisión legal profesional (gate bloqueante, no opcional).

## Diseño (resumen — detalle en el blueprint §7)

Tema **claro forzado**, sin excepción (se anula el toggle de tema oscuro del SDK de monday). Paleta: Primary `#2F6F4E` · Secondary `#4A7FA6` · Background `#FAFAF8` · Surface `#FFFFFF` · Text `#1A1D1B` · Muted `#6B7268` · Destructive `#C0392B` · Success `#27804F` · Warning `#B8860B`. Tipografía Montserrat. Radio de borde 10px (16px cards), sombras suaves, spacing base 4px. **Objetivos táctiles mínimo 48×48px** y alto contraste (uso en campo, con guantes, bajo sol directo).

## Variables de entorno

| Variable                                    | Descripción                                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONDAY_CLIENT_ID`                          | ID de cliente OAuth de la app                                                                                                                                                   |
| `MONDAY_CLIENT_SECRET`                      | Verifica (HS256) los **signed session tokens** de usuario (iframe) **y** los webhooks de **ciclo de vida de la app** (`install`/`uninstall`/`app_subscription_*`) — ver ADR-008 |
| `MONDAY_SIGNING_SECRET`                     | Verifica (HS256) exclusivamente los webhooks de **board/integración** — secreto distinto al anterior, nunca intercambiable (ver ADR-008)                                        |
| `DATABASE_URL`                              | Pooler Supabase, puerto 6543, Transaction Mode                                                                                                                                  |
| `DIRECT_DATABASE_URL`                       | Puerto 5432, solo migraciones                                                                                                                                                   |
| `SUPABASE_SERVICE_ROLE_KEY`                 | Bypasea RLS — solo server-side, nunca en bundle de cliente                                                                                                                      |
| `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` | Rate limiting                                                                                                                                                                   |
| `SENTRY_DSN`                                | Observabilidad                                                                                                                                                                  |
| `NEXT_PUBLIC_MONDAY_CLIENT_ID`              | Única variable segura de exponer al cliente                                                                                                                                     |

## Referencias completas

- Gobierno de ejecución, roles, severidades, estados de fase, DoR/DoD, trazabilidad: `/docs/execution/master-plan.md` Partes I y II.
- Mapa de fases y dependencias: `/docs/execution/master-plan.md` Parte III (§24) y `/docs/execution/phase-status.md`.
- Modelo de datos, API, diseño y build order completos: `/monday-wms-construccion-blueprint.md`.
