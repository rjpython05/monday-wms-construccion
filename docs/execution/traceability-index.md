# Índice de trazabilidad

Formato según `/docs/execution/master-plan.md` §10. Cada fila conecta un requisito con su origen, la fase que lo implementa, la prueba que lo verifica y su estado actual. Se actualiza en cada fase, nunca se reescribe el historial de filas ya cerradas.

| ID       | Tipo                   | Descripción breve                                                              | Fase | Prueba(s)                                | Estado                           |
| -------- | ---------------------- | ------------------------------------------------------------------------------ | ---- | ---------------------------------------- | -------------------------------- |
| AC-01-01 | Criterio de aceptación | Next.js 15 + TS strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes | 01   | `pnpm typecheck`, PR #11 (tipo roto)      | **Verificado** (CI real, PR #11)       |
| AC-01-02 | Criterio de aceptación | pnpm y Node fijados                                                            | 01   | Inspección de `package.json`/`.nvmrc`    | **Verificado**                         |
| AC-01-03 | Criterio de aceptación | ESLint + formato + lint-staged                                                 | 01   | Bloqueo real de pre-commit (any nuevo)   | **Verificado** (ver evidencia T16 4/4) |
| AC-01-04 | Criterio de aceptación | Vitest + Playwright configurados                                               | 01   | `pnpm test:unit`, `pnpm test:e2e`        | **Verificado**                         |
| AC-01-05 | Criterio de aceptación | PostgreSQL 17 en CI                                                            | 01   | Run de CI real (job Pipeline)            | **Verificado** (CI real)               |
| AC-01-06 | Criterio de aceptación | GitHub Actions con permisos mínimos y acciones fijadas por SHA                 | 01   | Inspección de `.github/workflows/ci.yml` | **Verificado**                         |
| AC-01-07 | Criterio de aceptación | Validación de variables de entorno al arranque                                 | 01   | `src/lib/env.unit.test.ts`               | **Verificado**                         |
| AC-01-08 | Criterio de aceptación | Trunk-based, Conventional Commits, squash merge, plantilla de PR, CODEOWNERS   | 01   | Inspección de `.github/`, PR #8 real     | **Verificado**                         |
| AC-01-09 | Criterio de aceptación | Branch protection activa                                                       | 01   | Push directo rechazado (GH006, real)     | **Verificado** (ver CHG-003, RSK-012)  |
| AC-01-10 | Criterio de aceptación | CI bloquea errores intencionales                                               | 01   | PRs #11, #12, #13 + bloqueo local (T16)  | **Verificado**                         |
| AC-01-11 | Criterio de aceptación | Preview deployment funciona                                                    | 01   | URL de preview en PR real (#15)          | **Verificado** (ver evidencia T12)     |
| AC-01-12 | Criterio de aceptación | Claude Code no lee `.env` ni despliega a prod                                  | 01   | Intento real denegado (T10)              | **Verificado** (ver evidencia)         |
| SEC-001  | Seguridad              | Escaneo de secretos en cada PR e historial completo                            | 01   | PR #13 (secreto falso), rechazado        | **Verificado** (CI real)               |
| SEC-002  | Seguridad              | SCA + Renovate/Dependabot                                                      | 01   | 7 PRs reales abiertos por Dependabot     | **Verificado** (dependabot.yml activo) |
| SEC-003  | Seguridad              | SBOM por release                                                               | 01   | Artefacto `sbom-*.spdx.json` generado    | **Verificado** (push a main real)      |
| SEC-004  | Seguridad              | `.claude/settings.json` deniega `.env*`, force-push, despliegue a producción   | 01   | Intento real denegado                    | **Verificado**                         |
| SEC-005  | Seguridad              | Ningún secreto en el bundle de cliente                                         | 01   | Inspección del build de producción       | Pendiente (sin secretos reales aún configurados para probar la fuga) |
| NFR-008  | No funcional           | Pipeline mínimo completo en el orden de Fase 1                                 | 01   | Run de CI verde (lint→...→e2e)           | **Verificado** (CI real)               |

Trazabilidad heredada de Fase 0 (16 BR, RBAC, NFR de volumetría/FX/numeración fiscal): ver `/docs/phases/phase-00-blueprint-normalization.md` — no se duplica aquí.
