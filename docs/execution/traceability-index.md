# Índice de trazabilidad

Formato según `/docs/execution/master-plan.md` §10. Cada fila conecta un requisito con su origen, la fase que lo implementa, la prueba que lo verifica y su estado actual. Se actualiza en cada fase, nunca se reescribe el historial de filas ya cerradas.

| ID       | Tipo                   | Descripción breve                                                              | Fase | Prueba(s)                                | Estado                           |
| -------- | ---------------------- | ------------------------------------------------------------------------------ | ---- | ---------------------------------------- | -------------------------------- |
| AC-01-01 | Criterio de aceptación | Next.js 15 + TS strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes | 01   | `pnpm typecheck`, PR de prueba T16       | En progreso                      |
| AC-01-02 | Criterio de aceptación | pnpm y Node fijados                                                            | 01   | Inspección de `package.json`/`.nvmrc`    | En progreso                      |
| AC-01-03 | Criterio de aceptación | ESLint + formato + lint-staged                                                 | 01   | PR de prueba T16 (any nuevo)             | En progreso                      |
| AC-01-04 | Criterio de aceptación | Vitest + Playwright configurados                                               | 01   | `pnpm test:unit`, `pnpm test:e2e`        | En progreso                      |
| AC-01-05 | Criterio de aceptación | PostgreSQL 17 en CI                                                            | 01   | `integration-tests.txt`                  | En progreso                      |
| AC-01-06 | Criterio de aceptación | GitHub Actions con permisos mínimos y acciones fijadas por SHA                 | 01   | Inspección de `.github/workflows/ci.yml` | En progreso                      |
| AC-01-07 | Criterio de aceptación | Validación de variables de entorno al arranque                                 | 01   | `src/lib/env.unit.test.ts`               | En progreso                      |
| AC-01-08 | Criterio de aceptación | Trunk-based, Conventional Commits, squash merge, plantilla de PR, CODEOWNERS   | 01   | Inspección de `.github/`                 | En progreso                      |
| AC-01-09 | Criterio de aceptación | Branch protection activa                                                       | 01   | Push directo/force-push rechazado        | Pendiente (requiere repo remoto) |
| AC-01-10 | Criterio de aceptación | CI bloquea errores intencionales                                               | 01   | 4 PRs de prueba (T16)                    | Pendiente                        |
| AC-01-11 | Criterio de aceptación | Preview deployment funciona                                                    | 01   | URL de preview en PR real                | Pendiente (requiere Vercel, T12) |
| AC-01-12 | Criterio de aceptación | Claude Code no lee `.env` ni despliega a prod                                  | 01   | Intento real denegado (T10)              | Pendiente de evidencia capturada |
| SEC-001  | Seguridad              | Escaneo de secretos en cada PR e historial completo                            | 01   | PR con secreto falso (T16)               | En progreso                      |
| SEC-002  | Seguridad              | SCA + Renovate/Dependabot                                                      | 01   | `.github/dependabot.yml`                 | En progreso                      |
| SEC-003  | Seguridad              | SBOM por release                                                               | 01   | Paso de CI `sbom`                        | En progreso                      |
| SEC-004  | Seguridad              | `.claude/settings.json` deniega `.env*`, force-push, despliegue a producción   | 01   | Intento real denegado                    | En progreso                      |
| SEC-005  | Seguridad              | Ningún secreto en el bundle de cliente                                         | 01   | Inspección del build de producción       | Pendiente                        |
| NFR-008  | No funcional           | Pipeline mínimo completo en el orden de Fase 1                                 | 01   | Run de CI verde                          | En progreso                      |

Trazabilidad heredada de Fase 0 (16 BR, RBAC, NFR de volumetría/FX/numeración fiscal): ver `/docs/phases/phase-00-blueprint-normalization.md` — no se duplica aquí.
