# ADR-004: Estrategia de idempotencia

## Estado
Aprobado

## Fecha y decisores
2026-10-02 (propuesto) · 2026-10-03 (aprobado) · Analista de Fase 0 (propone) · rjpython05@gmail.com (RT, aprueba)

## Contexto
El plan maestro (§15.1) exige idempotency key en toda mutación crítica, con hash de payload y registro en la misma transacción que el efecto de negocio. El blueprint menciona `idempotency_key` como columna única en `InventoryTransaction` y como header en despacho, pero no define retención, formato del hash ni el comportamiento exacto de conflicto.

## Decisión
1. Header `Idempotency-Key` (UUID v4 generado por el cliente, por intención de usuario, no por reintento automático de red) en: recepción, despacho, ajuste de conteo, importación (por archivo) y procesamiento de eventos de webhook.
2. Tabla `idempotency_keys` con `(tenant_id, key)` como clave compuesta única, `payload_hash` (SHA-256 del body normalizado), `status` (`in_progress`/`completed`/`failed`), `response_snapshot` (JSON de la respuesta original) y `created_at`.
3. Comportamiento:
   - Mismo key + mismo `payload_hash` + `status = completed` → se devuelve `response_snapshot` sin re-ejecutar.
   - Mismo key + `payload_hash` distinto → `422` sin efectos.
   - Mismo key + `status = in_progress` (ejecución concurrente) → `409` indicando reintento más tarde.
4. El registro de idempotencia se escribe en la **misma transacción** que el efecto de negocio (se inserta `in_progress` al inicio de la transacción, se actualiza a `completed` con el snapshot al confirmar; si la transacción falla, el registro `in_progress` queda huérfano y se limpia por job o se trata como expirado tras un timeout corto).
5. Retención: 7 días desde `created_at`, purgado por job. Elegido por superar ampliamente cualquier ventana razonable de reintento de red o de cola offline (Fase 17 post-MVP, cuyo diseño de expiración de cola se revisará contra este valor cuando se especifique).

## Alternativas
- **Clave derivada del contenido del payload (sin header explícito)**: descartada — no distingue una intención de usuario genuinamente repetida de un reintento de red del mismo payload.
- **Retención indefinida**: descartada — crece sin límite y no aporta valor pasada la ventana de reintento razonable.

## Consecuencias
- El cliente (frontend) debe generar y persistir el `Idempotency-Key` localmente antes del primer intento de envío, para poder reenviarlo igual en un reintento.
- Requiere un job de purga programado (Vercel Cron) desde que la primera mutación idempotente exista (Fase 8).

## Verificación
Pruebas de integración: mismo key + mismo payload en paralelo → un solo efecto; mismo key + payload distinto → rechazado sin efectos; expiración tras 7 días verificada con reloj inyectado.

## Evidencia
`master-plan.md` §15.1; blueprint, columna `idempotencyKey` en `inventory_transactions` y header en `POST /api/requisitions/:id/dispatch`.

## Revisión
Reevaluar la retención de 7 días cuando se especifique Fase 17 (cola offline), si su ventana de reintento offline pudiera superar ese plazo.
