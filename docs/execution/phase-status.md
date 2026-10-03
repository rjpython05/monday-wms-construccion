# Estado de fases

Fuente de verdad del estado de cada fase. Toda transición se registra aquí con fecha, actor, commit y motivo (ver `/docs/execution/master-plan.md` §7 y §10).

| Fase | Nombre | Estado | Desde | Commit | Responsable | Notas |
|---|---|---|---|---|---|---|
| 00 | Normalización del blueprint y spikes de viabilidad | **APPROVED** | 2026-10-03 | — | RT | 16/16 ambigüedades resueltas, RBAC y 8 ADR + 2 CHG ratificados, 5/5 spikes reales ejecutados con evidencia. Riesgo residual aceptado: confirmar cámara en dispositivo móvil antes de Fase 16 (no bloqueante) |
| 01 | Repositorio y controles de ingeniería | READY_FOR_IMPLEMENTATION | 2026-10-03 | — | RT | Análisis completo en `/docs/phases/phase-01-engineering-controls.md`. 3 ambigüedades bloqueantes resueltas (PostgreSQL 17, repo privado GitHub `rjpython05/monday-wms-construccion`, eliminación de `spikes/`). Plan aprobado por el RT |
| 02 | Infraestructura de staging | NOT_STARTED | — | — | — | Depende de 01 |
| 03 | Autenticación con monday.com 🔒 | NOT_STARTED | — | — | — | Depende de 02 |
| 04 | Multi-tenencia y RLS 🔒⛔ | NOT_STARTED | — | — | — | Depende de 03 |
| 05 | Onboarding mínimo | NOT_STARTED | — | — | — | Depende de 04 |
| 06 | RBAC y alcance 🔒 | NOT_STARTED | — | — | — | Depende de 05 |
| 07 | Catálogo y estructura logística | NOT_STARTED | — | — | — | Depende de 06 |
| 08 | Ledger inmutable 🔒⛔ | NOT_STARTED | — | — | — | Depende de 07 |
| 09 | Vertical 1: PO → recepción → lote | NOT_STARTED | — | — | — | Depende de 08 |
| 10 | Vertical 2: solicitud → aprobación → ATP | NOT_STARTED | — | — | — | Depende de 09 |
| 11 | Vertical 3: despacho y backorder 🔒 | NOT_STARTED | — | — | — | Depende de 10 |
| 12 | Transferencias y cierre de centro de costo | NOT_STARTED | — | — | — | Depende de 11 |
| 13 | Conteos y ajustes | NOT_STARTED | — | — | — | Depende de 11 |
| 14 | Importación y saldos iniciales | NOT_STARTED | — | — | — | Depende de 09 |
| 15 | Reportes esenciales | NOT_STARTED | — | — | — | Depende de 12, 13, 14 |
| 16 | Escaneo operativo básico | NOT_STARTED | — | — | — | Depende de 11 |
| 18 | Monetización 🔒 | NOT_STARTED | — | — | — | Depende de 06 |
| 19 | Seguridad y privacidad (consolidación) 🔒⛔ | NOT_STARTED | — | — | — | Depende de 15, 16, 18 |
| 20 | Piloto controlado | NOT_STARTED | — | — | — | Depende de 19 |
| 21 | Preparación para Marketplace 🔒 | NOT_STARTED | — | — | — | Depende de 20 |
| 22 | Producción y liberación gradual | NOT_STARTED | — | — | — | Depende de 21 |
| 17 | Resiliencia offline 🔒 (post-MVP) | NOT_STARTED | — | — | — | Depende de 20 y datos de uso de 16 |

**Fase activa:** 01 — Repositorio y controles de ingeniería (Fase 00 `APPROVED`, habilita el inicio de Fase 01).

## Historial de transiciones

| Fecha (UTC) | Fase | De | A | Actor | Commit | Motivo / referencia |
|---|---|---|---|---|---|---|
| 2026-10-02 | 00 | — | NOT_STARTED | RT | — | Inicialización del sistema de ejecución y del repositorio de documentación |
| 2026-10-02 | 00 | NOT_STARTED | IN_ANALYSIS | Analista (sesión) | — | Inicio del análisis de normalización del blueprint (§32.2 del plan maestro) |
| 2026-10-02 | 00 | IN_ANALYSIS | BLOCKED | Analista (sesión), confirma RT (pendiente) | — | 16 ambigüedades bloqueantes de negocio sin decisión del PO; 8 ADR propuestos sin ratificar; 2 CHG (corrección de contradicciones blueprint/plan maestro) sin aprobar. Ver `/docs/phases/phase-00-blueprint-normalization.md` |
| 2026-10-03 | 00 | BLOCKED | BLOCKED | PO (autoriza), Analista (resuelve) | — | PO autorizó al Analista a resolver ambigüedades con sus recomendaciones; 13/16 resueltas (business-rules.md, state-machines.md actualizados). Quedan 3 abiertas, preguntadas directamente al PO: fuente de tasas de cambio (#10), volumetría de diseño (#15), numeración fiscal (#16b) |
| 2026-10-03 | 00 | BLOCKED | IN_ANALYSIS | PO | — | PO respondió directamente las 3 ambigüedades restantes (FX manual, numeración sin régimen fiscal especial, volumetría placeholder pequeño confirmada). 16/16 ambigüedades de negocio cerradas; bloqueo de ambigüedades levantado. Pendiente: aprobación de RBAC por el PO y ratificación de ADR/CHG por el RT antes de `READY_FOR_IMPLEMENTATION` |
| 2026-10-03 | 00 | IN_ANALYSIS | READY_FOR_IMPLEMENTATION | RT | — | RT ratificó la matriz RBAC (con 2 ajustes: sin `po.create` para Gerente de Proyecto, sin `report.valuation.view` para Comprador) y los 8 ADR + 2 CHG. El "plan aprobado" de esta fase es la lista de spikes reales de §9 de `phase-00-blueprint-normalization.md` |
| 2026-10-03 | 00 | READY_FOR_IMPLEMENTATION | READY_FOR_IMPLEMENTATION | RT | — | Ejecutados los 5 spikes reales contra infraestructura real (Supabase, Vercel, monday.com Developer Center): pooler, session token, cámara, monetización y webhook de ciclo de vida, todos con evidencia reproducible. RSK-010 y RSK-001 cerrados. Fase lista para firma final del RT (`APPROVED`) |
| 2026-10-03 | 00 | READY_FOR_IMPLEMENTATION | **APPROVED** | RT | — | Aprobación final del RT. Fase 0 cerrada. Habilita el inicio de Fase 1 (Repositorio y controles de ingeniería). Riesgo residual aceptado: cámara en móvil pendiente de confirmar antes de Fase 16 |
| 2026-10-03 | 01 | — | NOT_STARTED | RT | — | Fase 0 `APPROVED` habilita el inicio de Fase 1 |
| 2026-10-03 | 01 | NOT_STARTED | IN_ANALYSIS | Analista (sesión) | — | Inicio del análisis de repositorio y controles de ingeniería (§32.2 del plan maestro) |
| 2026-10-03 | 01 | IN_ANALYSIS | BLOCKED | Analista (sesión) | — | 3 ambigüedades bloqueantes: versión mayor de PostgreSQL para CI, coordenadas de repositorio remoto/revisor humano, destino de `spikes/phase-00-viability/`. Ver `/docs/phases/phase-01-engineering-controls.md` §5 |
| 2026-10-03 | 01 | BLOCKED | IN_ANALYSIS | RT | — | RT resolvió las 3 ambigüedades: PostgreSQL 17 (verificado contra changelog oficial de Supabase, registrado como addendum de ADR-006); GitHub usuario `rjpython05`, repo privado `monday-wms-construccion`, CODEOWNER único; `spikes/phase-00-viability/` eliminado del árbol de trabajo |
| 2026-10-03 | 01 | IN_ANALYSIS | READY_FOR_IMPLEMENTATION | RT | — | RT aprobó el plan mínimo de 17 tareas de `/docs/phases/phase-01-engineering-controls.md` §8. Pendiente aparte (no bloqueante para este gate): rotación de credenciales reales de Supabase/monday.com que vivían en el spike eliminado |
