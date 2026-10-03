# Requisitos no funcionales (NFR)

Fuente primaria: `/docs/execution/master-plan.md` §18.2 (NFR-001 a NFR-007, normativos, solo modificables por ADR). Se añaden aquí los NFR específicos de experiencia de campo derivados del blueprint y se documentan los datos de volumetría que **aún no están confirmados** (ver ambigüedad #15 en `phase-00-blueprint-normalization.md`).

## Confirmados (plan maestro §18.2 — no se renumeran)

| ID | Objetivo | Valor |
|---|---|---|
| NFR-001 | Disponibilidad mensual en producción | ≥ 99,5 % |
| NFR-002 | p95 de mutaciones críticas (recepción, despacho) | ≤ 800 ms |
| NFR-003 | p95 de consultas de listado | ≤ 500 ms |
| NFR-004 | Discrepancia entre ledger y saldo derivado | 0 (cualquier diferencia es S1) |
| NFR-005 | RPO (pérdida máxima de datos) | ≤ 15 min (PITR) |
| NFR-006 | RTO (tiempo máximo de recuperación) | ≤ 4 h |
| NFR-007 | Tiempo de detección de error crítico | ≤ 5 min (alerta) |

## Añadidos desde el blueprint (requieren ratificación del RT en el cierre de Fase 0)

| ID | Objetivo | Valor propuesto | Fuente |
|---|---|---|---|
| NFR-008 | Tiempo total de ciclo (usuario, en campo) de una recepción o un despacho con escaneo, de inicio a confirmación | ≤ 30 s | Blueprint, Success Metrics |
| NFR-009 | Objetivo táctil mínimo en UI de campo | ≥ 48×48 px | Blueprint §7 |
| NFR-010 | Contraste de UI de campo | Alto contraste, legible bajo luz solar directa simulada | Blueprint §7, Fase 20 (pulido) |
| NFR-011 | Cobertura de líneas/ramas en módulos de dominio (`/domain`, ledger, autorización) | ≥ 90 % | Plan maestro §25.2 |

NFR-008 es una métrica de **experiencia de usuario end-to-end** (incluye tiempo humano de escaneo), distinta de NFR-002 (latencia de backend p95). No se deben confundir ni fusionar: una API rápida no garantiza un flujo de campo rápido si la UX de escaneo es torpe.

## Volumetría de diseño (confirmada por el PO — 2026-10-03)

| Parámetro | Valor de diseño |
|---|---|
| SKUs por tenant típico | 500 |
| Ubicaciones por almacén | 50 |
| Movimientos de inventario por día, por tenant | 200 |
| Usuarios concurrentes por tenant | 10 |
| Tenants esperados a 12 meses | 50 |

Estos valores alimentan el dimensionamiento de Supabase y la prueba de carga de §21 del plan maestro (volumen de diseño ×2). Si el piloto (Fase 20) revela un uso real sostenidamente distinto, se actualiza esta tabla vía `CHG` antes de la Fase 21.
