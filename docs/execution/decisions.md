# Índice de decisiones de arquitectura (ADR)

Todas las ADR fueron ratificadas por rjpython05@gmail.com (RT) el 2026-10-03, tras revisión individual, con autorización explícita en sesión.

| ADR | Título | Estado | Corrige blueprint |
|---|---|---|---|
| [ADR-001](../adr/ADR-001-tenant-context-rls-pattern.md) | Patrón de tenant context y RLS (`set_config` parametrizado, `USING`+`WITH CHECK`) | **Aprobado** | Sí — CHG-001 |
| [ADR-002](../adr/ADR-002-decimal-precision-rounding.md) | Precisión decimal y modo de redondeo | **Aprobado** | No (completa un vacío) |
| [ADR-003](../adr/ADR-003-transactional-isolation-locking.md) | Aislamiento transaccional y estrategia de bloqueo | **Aprobado** | No (formaliza lo ya implícito) |
| [ADR-004](../adr/ADR-004-idempotency-strategy.md) | Estrategia de idempotencia | **Aprobado** | No (completa un vacío) |
| [ADR-005](../adr/ADR-005-403-vs-404-policy.md) | Política de respuesta 403 vs. 404 para BOLA | **Aprobado** | No (completa un vacío) |
| [ADR-006](../adr/ADR-006-hosting-database-provider.md) | Proveedor de hosting y base de datos | **Aprobado** | No (ratifica blueprint) |
| [ADR-007](../adr/ADR-007-monday-sdk-packages.md) | Paquetes del SDK de monday.com | **Aprobado** | Sí — CHG-002 |
| [ADR-008](../adr/ADR-008-monday-secrets-separation.md) | Separación de secretos: Client Secret vs. Signing Secret | **Aprobado** | Sí — CHG-002 |

No se crean ADR para las 16 ambigüedades de negocio listadas en `/docs/phases/phase-00-blueprint-normalization.md`: un ADR registra una decisión técnica ya tomada por quien tiene autoridad para tomarla; esas 16 son decisiones de negocio que corresponden al PO (R-06 del plan maestro prohíbe inventarlas).
