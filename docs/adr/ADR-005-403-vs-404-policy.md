# ADR-005: Política de respuesta 403 vs. 404 para BOLA

## Estado
Aprobado

## Fecha y decisores
2026-10-02 (propuesto) · 2026-10-03 (aprobado) · Analista de Fase 0 (propone) · rjpython05@gmail.com (RT, aprueba)

## Contexto
El plan maestro (§16) recomienda, sin fijarlo como obligatorio, responder `404` para recursos de otro tenant o fuera de alcance (no revela existencia) y `403` para recursos visibles pero sin permiso de acción. El blueprint no fija esta política.

## Decisión
1. **Cruce de tenant** (el recurso pertenece a otro tenant): `404 Not Found`. Nunca se revela que el recurso existe en otra cuenta.
2. **Dentro del tenant, fuera del alcance del actor** (p. ej. un almacén no asignado al Almacenista): `404 Not Found`, por el mismo motivo — no revelar la existencia de almacenes/centros de costo ajenos al alcance del usuario dentro del propio tenant.
3. **Dentro del tenant y del alcance, pero sin el permiso de la acción solicitada** (p. ej. un Capataz intentando aprobar su propia solicitud, que sí puede ver): `403 Forbidden`.
4. Todas las respuestas de error siguen el formato Problem Details (RFC 9457) definido en `master-plan.md` §17, sin stack traces ni datos de otros tenants.

## Alternativas
- **Siempre 403**: descartado — filtra la existencia de recursos ajenos al tenant o al alcance mediante la sola distinción de código de estado, lo que es información explotable en un escaneo de IDs.
- **Siempre 404**: descartado — dentro del propio alcance, ocultar que un recurso existe cuando el usuario ya sabe que existe (lo ve en una lista) pero no tiene el permiso de una acción específica, es una UX confusa sin beneficio de seguridad real.

## Consecuencias
- El middleware de autorización (`check-scope.ts`) debe distinguir explícitamente entre "no pertenece a mi tenant/alcance" (404) y "pertenece a mi alcance pero la acción no está permitida" (403), lo que requiere resolver primero la pertenencia y luego el permiso, en ese orden (ya es el orden exigido por §16).

## Verificación
Casos de prueba de Fase 6: "Rol correcto fuera de alcance → 404 o 403 según ADR-005, sin filtrar datos" (ya referenciado en `roles-and-permissions.md`).

## Evidencia
`master-plan.md` §16.

## Revisión
Ninguna condición de revisión prevista; es una decisión estable salvo que un auditor de seguridad identifique un canal de filtración residual.
