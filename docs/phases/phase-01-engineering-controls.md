# Fase 1: Repositorio y controles de ingeniería

## Estado
**READY_FOR_IMPLEMENTATION** (2026-10-03, por el RT — `rjpython05@gmail.com`). Las 3 ambigüedades bloqueantes quedaron resueltas y ejecutadas en la sesión de análisis (§5). El RT aprobó este plan explícitamente ("aprobado", 2026-10-03). Formato de análisis según `/docs/execution/master-plan.md` §32.2.

## Metadatos
Versión 1 · Responsable: RT (`rjpython05@gmail.com`) · Revisión: RT (fase no marcada 🔒) · Fecha de este análisis: 2026-10-03 · Depende de: Fase 0 (`APPROVED`)

---

## 1. Estado actual del repositorio relevante para la fase

- No existía repositorio Git (`git status` → `fatal: not a git repository`), ni `package.json`, lockfile, `node_modules`, `tsconfig.json`, config. de ESLint/Vitest/Playwright, ni `.github/` en la raíz.
- `.claude/settings.local.json` existía pero solo con `{"enabledPlugins": {"ecc@ecc": true}}` — no implementaba las denegaciones de §22.2.
- Estructura `/docs` (§23) presente salvo `/docs/runbooks/`, `/docs/evidence/`, y `docs/execution/traceability-index.md`.
- `sistema-ejecucion-controlado-claude-code.md` en la raíz era copia byte-idéntica de `docs/execution/master-plan.md` (duplicado documental).
- `spikes/phase-00-viability/` existía con `node_modules/`, `.vercel/project.json` y un `.env.local` real (no `.env.example`) con credenciales de Supabase/monday.com del spike de Fase 0.

## 2. Verificación de dependencias

| Fase requerida | Estado |
|---|---|
| Fase 0 — Normalización del blueprint y spikes de viabilidad | **APPROVED** (2026-10-03). 16/16 ambigüedades de negocio cerradas, RBAC+SoD ratificado, 8 ADR aprobados, 5/5 spikes reales ejecutados. Riesgo residual aceptado (RSK-001, cámara móvil, no bloqueante para Fase 1). |

Dependencia satisfecha sin bloqueo.

## 3. Requisitos exactos de la fase

| ID | Requisito | Fuente |
|---|---|---|
| AC-01-01 | Next.js (App Router) + TS `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | master-plan §19 |
| AC-01-02 | pnpm y Node fijados (`.nvmrc`/`engines`, `packageManager`) | master-plan §20 |
| AC-01-03 | ESLint (incl. framework para reglas de §12.3) + formato + lint-staged | master-plan §12.3, §19 |
| AC-01-04 | Vitest (unit+integración) y Playwright configurados | master-plan Fase 1 |
| AC-01-05 | PostgreSQL de la misma versión mayor que producción en CI | master-plan §11, Fase 1 — **resuelto: PostgreSQL 17** (ver ADR-006 addendum) |
| AC-01-06 | GitHub Actions con permisos mínimos y acciones fijadas por SHA | master-plan §20 |
| AC-01-07 | Validación de variables de entorno al arranque | master-plan Fase 1 |
| AC-01-08 | Trunk-based, Conventional Commits, squash merge, plantilla de PR, `CODEOWNERS` | master-plan Fase 1 |
| AC-01-09 | Branch protection: PR obligatorio, CI requerido, ≥1 revisión humana, sin force-push | master-plan Fase 1 |
| SEC-001 | Escaneo de secretos en cada PR y sobre historial completo | master-plan §20 |
| SEC-002 | SCA + Renovate/Dependabot | master-plan §20 |
| SEC-003 | SBOM por release | master-plan §20 |
| SEC-004 | `.claude/settings.json` deniega `.env*`, force-push, despliegue a producción | master-plan §22.2 |
| SEC-005 | Ningún secreto en el bundle del cliente (verificado sobre build real) | master-plan Fase 1 gate |
| NFR-008 | Pipeline mínimo completo en el orden de §Fase 1 | master-plan Fase 1 |
| AC-01-10 | CI bloquea errores intencionales (demostrado con 4 PRs de prueba) | master-plan Fase 1 gate |
| AC-01-11 | Preview deployment funciona | master-plan Fase 1 gate |
| AC-01-12 | Claude Code no puede leer `.env` ni desplegar a producción (demostrado) | master-plan Fase 1 gate |

Fase 1 no define `BR-xxx` (reglas de negocio): es puramente de ingeniería.

## 4. Brechas entre el estado actual y la fase

Ver §1 — brecha total en tooling/CI/repo (no existía nada); faltan `/docs/runbooks/`, `/docs/evidence/phase-01/`, `docs/execution/traceability-index.md`; duplicado documental a eliminar; `.claude/settings.json` real a crear; tabla de secretos de `CLAUDE.md` a precisar contra ADR-008.

## 5. Ambigüedades bloqueantes — RESUELTAS

| # | Ambigüedad | Resolución | Fecha |
|---|---|---|---|
| 1 | Versión mayor de PostgreSQL para CI/staging/producción | **PostgreSQL 17**, verificado contra changelog oficial de Supabase (PG14 se retira 2026-07-01; sin conflicto de extensiones con este diseño). Registrado como addendum de ADR-006. | 2026-10-03 |
| 2 | Coordenadas de repositorio remoto y revisor humano | GitHub, usuario `rjpython05`, repositorio `monday-wms-construccion`, `CODEOWNER` único = `rjpython05`. Vercel se conecta por integración nativa de GitHub. **Enmendado (CHG-003, 2026-10-03):** repositorio cambiado de privado a **público** porque GitHub exige plan Pro para branch protection en repos privados de cuenta individual (verificado en vivo, HTTP 403); el RT eligió público para evitar el costo y conservar branch protection real. | 2026-10-03 (enmendado el mismo día) |
| 3 | Destino de `spikes/phase-00-viability/` | **Eliminado** del árbol de trabajo (evidencia ya incorporada a los documentos de Fase 0 aprobados). Ejecutado en esta sesión. Pendiente aparte, no resuelto por esto: rotación de las credenciales reales que contenía, a cargo del RT en los paneles de Supabase y monday.com. | 2026-10-03 |

## 6. Riesgos técnicos, funcionales y de seguridad

Incorporados a `/docs/execution/risks.md`: RSK-012 (CODEOWNER único, sin segunda revisión humana), RSK-013 (rotación de credenciales del spike pendiente), RSK-014 (PostgreSQL 17 recién promovido por Supabase), RSK-015 (duplicado documental, mitigado por Tarea T2), RSK-016 (bus factor = 1).

## 7. Amenazas nuevas para threat-model.md

Incorporada a `/docs/architecture/threat-model.md` la sección "Repositorio y CI/CD (Fase 1)": cadena de suministro (dependencia comprometida), secretos de CI expuestos a forks, fuga de secretos vía commit/historial, Claude Code leyendo `.env` real, DoS por job de CI sin timeout, `any`/`@ts-ignore` reintroduciendo clases de bug de tipos.

## 8. Plan mínimo por tareas (aprobado)

| # | Tarea | Verificación independiente |
|---|---|---|
| T1 | Crear repo privado `rjpython05/monday-wms-construccion`; `git init`; primer commit con la documentación existente | `git remote -v` correcto; push exitoso |
| T2 | Eliminar `sistema-ejecucion-controlado-claude-code.md` (duplicado) | Archivo ausente; sin referencias rotas |
| T3 | Scaffolding Next.js 15 + TS `strict`/`noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`; pnpm/Node fijados | `pnpm install --frozen-lockfile` y `pnpm typecheck` en verde |
| T4 | ESLint + Prettier + lint-staged (framework para regla de §12.3, sin activarla — `withTenant()` no existe hasta Fase 4) | PR con `any` nuevo → CI rechaza |
| T5 | Vitest + Playwright con smoke test trivial por runner | `pnpm test:unit`, `pnpm test:e2e` en verde |
| T6 | Validación de variables de entorno al arranque (esquema mínimo, extensible) | Arranque con var inválida/ausente falla con mensaje claro |
| T7 | GitHub Actions: pipeline mínimo completo, PostgreSQL 17 como servicio, permisos mínimos, acciones fijadas por SHA | Run de CI verde sobre commit real |
| T8 | Branch protection en `main` (PR + CI + 1 revisión humana, sin force-push) | Push directo y force-push a `main`, ambos rechazados |
| T9 | `CODEOWNERS` + `pull_request_template.md` (Anexo C) | PR usa la plantilla; revisión solicitada al CODEOWNER correcto |
| T10 | `.claude/settings.json` real (deny `.env*`, force-push, despliegue a prod) + hooks de lint/typecheck | Intento real denegado y capturado como evidencia |
| T11 | Escaneo de secretos + SCA (Dependabot/Renovate) + SBOM | PR con secreto falso → bloqueado |
| T12 | Conectar Vercel (import nativo) para Preview deployments | Preview accesible por URL en un PR real |
| T13 | Crear `/docs/runbooks/` (stubs) y `/docs/evidence/phase-01/` | Estructura presente conforme a §23 |
| T14 | Crear `docs/execution/traceability-index.md` | Archivo presente |
| T15 | Corregir tabla de variables de entorno de `CLAUDE.md` (precisión ADR-008) | Revisión textual |
| T16 | Demostración del gate: 4 PRs deliberadamente rotos (tipo roto, test fallido, secreto falso, `any` nuevo), rechazados y cerrados sin merge | 4 runs de CI en rojo, evidencia capturada |
| T17 | `/docs/runbooks/secret-rotation.md` documentando el procedimiento de esta fase | Archivo presente, consistente con RSK-013 |

## 9. Archivos que se esperan crear o modificar

Ver lista completa entregada en el análisis de esta fase (commit de esta sesión); incluye scaffolding completo de Next.js/TS/CI, `.claude/settings.json`, runbooks, `traceability-index.md`, y eliminación de `sistema-ejecucion-controlado-claude-code.md` y `spikes/` (esta última ya ejecutada).

## 10. Migraciones requeridas

Ninguna de negocio. Framework de Drizzle Kit configurado con una migración inicial vacía (cero tablas), solo para probar el mecanismo contra PostgreSQL 17 real en CI. No aplica expand/contract.

## 11. Matriz de trazabilidad inicial

| Requisito | Criterio | Prueba planificada |
|---|---|---|
| AC-01-01 | TS estricto sin `any` nuevo | PR de prueba (T16) |
| AC-01-05 | PostgreSQL 17 en CI | `integration-tests.txt` |
| AC-01-07 | Validación de env al arranque | Test de arranque con var ausente |
| AC-01-09 | Branch protection activa | Push directo/force-push rechazado |
| AC-01-10 | CI bloquea errores intencionales | 4 PRs de prueba (T16) |
| AC-01-11 | Preview deployment funciona | URL de preview en PR real |
| AC-01-12 | Claude Code no lee `.env` ni despliega a prod | Intento real denegado (T10) |
| SEC-001 | Escaneo de secretos | PR con secreto falso (T16) |
| SEC-005 | Sin secretos en el bundle | Inspección del build de producción |

## 12. Evidencia que se producirá

`/docs/evidence/phase-01/`: `manifest.json`, `summary.md`, `traceability.md`, `commands.txt`, `ci-result.txt`, `unit-tests.txt`, `integration-tests.txt`, `build-result.txt`, `migration-empty-db.txt`, resultados de secret scan/SCA, evidencia de los 4 PRs rotos (T16) y del intento denegado de Claude Code (T10).

## 13. Criterio objetivo para APPROVE o REJECT

**APPROVE** solo con evidencia de CI (no pegada a mano) de los 6 bullets del gate de Fase 1 y ningún criterio de rechazo automático de §33. **REJECT** si falta cualquiera de los 6 o aparece un criterio de §33.

## 14. Evaluación de Definition of Ready

DoR cumplida (bloques de Negocio marcados N/A justificado — fase sin reglas de negocio; resto de bloques cumplidos). Pendientes no bloqueantes: incorporar formalmente la sección de `threat-model.md` (hecho en esta misma sesión, ver §7) y el guion de validación manual (se genera post-implementación, §32.6).

## 15. Aprobación

**Aprobado por el RT (`rjpython05@gmail.com`) el 2026-10-03**, mensaje explícito: "aprobado". Habilita el inicio de la implementación (§32.3) en una sesión separada, conforme a §22.4 del plan maestro.
