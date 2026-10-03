# ADR-003: Aislamiento transaccional y estrategia de bloqueo

## Estado
Aprobado

## Fecha y decisores
2026-10-02 (propuesto) · 2026-10-03 (aprobado) · Analista de Fase 0 (propone) · rjpython05@gmail.com (RT, aprueba)

## Contexto
El plan maestro (§15.2) exige documentar por ADR el nivel de aislamiento usado en operaciones críticas (recepción, despacho, ajuste). El blueprint ya asume `SELECT ... FOR UPDATE` para despacho pero no formaliza el nivel de aislamiento, el orden de bloqueo, ni la política de reintento.

## Decisión
1. Nivel de aislamiento por defecto para mutaciones críticas: **READ COMMITTED** combinado con bloqueo explícito (`SELECT ... FOR UPDATE`) sobre las filas de `Lot` afectadas, en **orden determinístico por `id` ascendente**, para evitar deadlocks entre transacciones concurrentes que compiten por los mismos lotes.
2. `lock_timeout` y `statement_timeout` se configuran a nivel del rol de aplicación (valores exactos a definir en la especificación de Fase 2, no en este ADR).
3. Errores de serialización (`40001`) y deadlock (`40P01`) se reintentan automáticamente hasta 3 veces con backoff exponencial + jitter (100ms–800ms); agotados los reintentos, se devuelve un error explícito (nunca un éxito parcial). Cada reintento se registra como métrica.
4. `SERIALIZABLE` se reserva como alternativa documentada para una operación específica si, durante la implementación de una fase, se demuestra que `READ COMMITTED` + bloqueo explícito no es suficiente para esa operación puntual — requiere entonces un ADR de reemplazo acotado a esa operación, no un cambio global.

## Alternativas
- **`SERIALIZABLE` global**: descartado como default — mayor tasa de reintentos por conflictos de serialización en operaciones de alta concurrencia (despacho), complejidad adicional sin beneficio claro dado que el bloqueo explícito ya resuelve las carreras conocidas (doble despacho, doble aprobación).
- **Bloqueo por orden de llegada (sin ordenar por id)**: descartado — es la causa más común de deadlocks en sistemas con múltiples recursos bloqueados por transacción.

## Consecuencias
- Todo código que bloquea más de una fila de `Lot` en la misma transacción debe ordenar explícitamente por `id` antes de iterar; esto se documenta como regla de código, no solo de ADR.
- Los tests de concurrencia (Fase 8, 9, 11) deben incluir escenarios que fuercen contención real (no solo happy path) para validar que el reintento funciona y que no hay condiciones de carrera residuales.

## Verificación
Pruebas de concurrencia con N conexiones simultáneas reales (plan maestro §25.1, nivel "Concurrencia"): doble despacho, doble aprobación, recepciones paralelas sobre la misma línea de PO.

## Evidencia
`master-plan.md` §15.2; blueprint §5 (`POST /api/requisitions/:id/dispatch`, "Dentro de una transacción con SELECT ... FOR UPDATE sobre los lotes candidatos").

## Revisión
Reevaluar si el volumen real de contención en el piloto (Fase 20) supera lo que este patrón maneja sin degradar NFR-002.
