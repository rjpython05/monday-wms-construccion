# Matriz de roles, permisos y segregación de funciones

Formaliza el modelo RBAC del blueprint (§8) en permisos atómicos verificables por el backend (`src/lib/rbac/check-scope.ts`, plan maestro §16).

**Estado: Aprobada por el PO (rjpython05@gmail.com), 2026-10-03.** Satisface el gate de Fase 0 "Matriz RBAC y SoD aprobada por el PO".

## Roles y alcance por defecto

| Rol | Alcance por defecto |
|---|---|
| Dueño / Admin de cuenta | Global |
| Admin de Almacén | Global |
| Gerente de Proyecto | 1+ Centros de Costo asignados |
| Residente de Obra | 1 Centro de Costo |
| Capataz | Su Centro de Costo asignado (mismo límite de autorización que Residente). "Su frente de trabajo" es un filtro de UI sobre ese alcance, no un límite de seguridad adicional en el MVP. Decidido 2026-10-03. |
| Almacenista | 1+ Almacenes asignados |
| Control de Costos | Global o por proyecto (configurable) |
| Comprador | Global |
| Contabilidad | Global, solo lectura |

## Matriz de permisos atómicos

`P` = permitido · `—` = no permitido. Todo permiso se evalúa además contra el alcance (cost_center/warehouse) del actor, después de confirmar tenant e identidad (orden de §16 del plan maestro).

| Permiso | Dueño | Admin Almacén | Gte. Proyecto | Residente | Capataz | Almacenista | Control Costos | Comprador | Contabilidad |
|---|---|---|---|---|---|---|---|---|---|
| `requisition.create` | P | P | P | P | **P** | — | — | — | — |
| `requisition.approve` | P | P | P | P | — | — | — | — | — |
| `requisition.cancel` | P | P | P | P | P (propia, antes de aprobar) | — | — | — | — |
| `material.dispatch` | P | P | — | — | — | P | — | — | — |
| `material.receive` | P | P | — | — | — | P | — | — | — |
| `lot.override.fifo_fefo` | P | P | — | — | — | P (con motivo) | — | — | — |
| `lot.quarantine.release` | P | P | — | — | — | — | — | — | — |
| `po.create` | P | — | — | — | — | — | — | P | — |
| `po.send` | P | — | — | — | — | — | — | P | — |
| `cost_center.close` | P | — | P | — | — | — | — | — | — |
| `cycle_count.count` | P | P | — | — | — | P | — | — | — |
| `cycle_count.adjust.approve` | P | P | P (si excede tolerancia) | P (si excede tolerancia) | — | — | — | — | — |
| `ledger.correct` | P | — | — | — | — | — | — | — | — |
| `catalog.manage` | P | P | — | — | — | — | — | — | — |
| `supplier.manage` | P | — | — | — | — | — | — | P | — |
| `import.run` | P | P | — | — | — | — | — | — | — |
| `export.run` | P | P | P | P | — | P | P | P | P |
| `report.valuation.view` | P | P | P (su alcance) | — | — | — | P | **—** | P |
| `report.budget_vs_actual.view` | P | — | P (su alcance) | P (su alcance) | — | — | P | — | P |
| `user.role.assign` | P | P | — | — | — | — | — | — | — |
| `billing.manage` | P | — | — | — | — | — | — | — | — |

Celdas sin marcar son deny-by-default (R-16 del plan maestro); un permiso ausente de esta tabla para un rol se trata como denegado hasta que se agregue explícitamente.

## Reglas de segregación de funciones (declarativas)

Estas reglas se implementan como verificaciones declarativas en el backend, no como convención de UI (BR-IAM-004, BR-IAM-005 en `business-rules.md`):

1. `requisition.requested_by != requisition.approved_by` en toda transición a `APROBADA_*`.
2. `requisition.approved_by != requisition.dispatched_by` en toda transición a `EN_DESPACHO`.
3. `cycle_count.counted_by != cycle_count.approved_by` cuando el ajuste requiere segunda aprobación.
4. Un usuario no puede asignarse a sí mismo un rol o permiso nuevo (`user.role.assign` excluye al propio actor como destino, salvo que ya sea Dueño).
5. El último usuario con rol Dueño activo en un tenant no puede removerse ese rol (BR-IAM-006).

## Casos obligatorios de prueba (heredados del plan maestro §6, Fase 6)

```text
Sin permiso                              → 403
Rol correcto fuera de alcance            → 404 o 403 según ADR-005, sin filtrar datos
Permiso y alcance correctos              → permitido
Rol desactivado                          → 403
Usuario desactivado                      → 401/403 en la siguiente request
Cambio de rol                            → auditado y efectivo dentro del TTL documentado
ID de otro tenant                        → respuesta segura sin filtración
Escalamiento vertical (usuario se asigna rol) → rechazado y auditado
Último Dueño intenta quitarse el rol     → rechazado
```

## Decisiones de cierre (2026-10-03)

- `report.valuation.view` para Comprador: **denegado** (mínimo privilegio; Contabilidad y Control de Costos ya cubren esa necesidad). La columna "Comprador" en la tabla de permisos queda sin esta celda marcada.
- `po.create` para Gerente de Proyecto: **denegado** — se mantiene exclusivo de Comprador/Dueño para preservar la segregación entre quien ejecuta obra y quien compra. Una compra de emergencia se resuelve con aprobación directa del Dueño, no ampliando este permiso. Si el piloto demuestra que esto bloquea operación legítima, se revisa vía `CHG`.
- Alcance de Capataz: Centro de Costo asignado (igual límite que Residente); "frente de trabajo" es filtro de presentación, no de autorización, en el MVP.

Matriz ratificada sin otros cambios pendientes.
