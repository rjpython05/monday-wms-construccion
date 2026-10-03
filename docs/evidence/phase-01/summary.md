# Resumen de evidencia — Fase 1

Fecha: 2026-10-03 · Responsable: Implementador (sesión de implementación)

## Repositorio real

- https://github.com/rjpython05/monday-wms-construccion (público — ver CHG-003)
- Commit inicial: `a64fbe9` · Último commit verificado: `697a19e`
- Branch protection activa en `main` (ver `branch-protection.txt`)

## CI real (GitHub Actions)

- Workflow: `.github/workflows/ci.yml`, job `Pipeline`: lint → formato → tipos → unit →
  migración vacía → integración (PostgreSQL 17 real) → security (placeholder) → build →
  E2E (Playwright) → verificación de trazabilidad.
- Runs verdes reales, por ejemplo: https://github.com/rjpython05/monday-wms-construccion/actions/runs/37140373807
- Jobs separados: `Escaneo de secretos (historial completo)` (gitleaks), `Auditoría de
  dependencias (SCA)` (dependency-review-action, solo PR), `SBOM` (solo push a main).

## Demostración del gate (T16) — 4/4

Ver `demo-pr-4-any-local-gate.txt` para el detalle y los enlaces a los PRs #11, #12, #13.

## Preview deployment (T12 / AC-01-11)

Ver `vercel-preview.txt`. Incluye el hallazgo real de que Vercel no soporta Node 26 (corregido
a 24.x) y de que la cuenta de Vercel necesitaba una Login Connection de GitHub.

## Denegaciones de Claude Code (T10 / AC-01-12, SEC-004)

Ver `claude-code-env-denial.txt`.

## Dependabot (SEC-002)

7 PRs reales abiertos automáticamente por Dependabot al crear el repo (actualizaciones de
`npm`/`github-actions`), más 2 adicionales tras habilitar el grafo de dependencias
(alertas de vulnerabilidad). Pendientes de revisión y merge por el RT — no se auto-mergearon
en esta sesión porque el plan maestro exige revisión, no solo automatización.

## Decisiones registradas

- CHG-003 (`docs/execution/change-control.md`): repositorio cambiado de privado a público.
- RSK-012 actualizado (sin segunda revisión humana, compensado por Auditor IA).
- RSK-015 cerrado (duplicado documental eliminado).
- RSK-017 nuevo (exposición pública de documentación de negocio/arquitectura).

## Pendiente (no bloqueante para el gate de esta fase)

- SEC-005 (ningún secreto en el bundle de cliente): no verificable de forma significativa
  todavía porque no existen secretos reales configurados (llegan en Fase 2-3). Estructura
  actual (solo `NEXT_PUBLIC_MONDAY_CLIENT_ID` expuesto) es correcta por inspección.
- Revisión y merge de los PRs de Dependabot: tarea de mantenimiento continuo, no bloqueante.
- Rotación de credenciales del spike de Fase 0 (RSK-013): sigue pendiente, a cargo del RT.
