# Informe de auditoría independiente — Fase 1: Repositorio y controles de ingeniería

**Sesión:** Auditor IA (Sesión C), sin contexto del implementador, conforme a `/docs/execution/master-plan.md` §22.4 y §32.4.
**Rango auditado:** `a64fbe9b2bc5b6524f8d8480f19d97ffce4ec495..6d7f25bdfe1649c5aed4b76775c5e597cd172839` (rama `main`, commit final `6d7f25b`).
**Fecha de auditoría:** 2026-10-03.
**Repositorio real:** https://github.com/rjpython05/monday-wms-construccion (público, CHG-003).

---

## Veredicto: **REJECT**

La fase no puede aprobarse. Se encontraron **4 criterios de aceptación que la propia evidencia marca o que esta auditoría demuestra como NO DEMOSTRADOS** (AC-01-07, AC-01-12, SEC-004, SEC-005), lo que activa por sí solo el criterio automático de rechazo del plan maestro §33 ("un criterio de aceptación figura como NO DEMOSTRADO"). Además hay dos hallazgos de severidad Alta (S2) reproducidos de forma independiente mediante fallas deliberadas, no detectadas por ningún control existente.

Dicho esto: el trabajo de ingeniería de CI/CD, SHA-pinning, branch protection, demostración del gate (T16) y trazabilidad de PRs reales está, en su gran mayoría, **genuinamente verificado contra la API real de GitHub** y no es evidencia inventada. El rechazo es por brechas puntuales y verificables, no por fabricación de evidencia generalizada (ver §"Qué se confirmó como real" más abajo).

---

## 1. Qué se confirmó como real (no reemplaza los hallazgos, pero evita sobre-penalizar)

Verificado de forma independiente contra la API real de GitHub (`gh api`, `gh run view --log`, `gh pr view/checks`), no contra el texto del implementador:

- El run de CI del commit auditado exacto (`6d7f25bdfe16...`, run `37140721900`) es real y **verde en los 15 pasos del job `Pipeline`**, incluidas integración contra PostgreSQL real, pruebas de seguridad (placeholder declarado), build, E2E y verificación de trazabilidad; más los jobs `Escaneo de secretos` y `SBOM`.
- Branch protection real sobre `main` coincide exactamente con lo documentado: `required_status_checks.contexts = [Pipeline, Escaneo de secretos (historial completo), Auditoría de dependencias (SCA)]`, `enforce_admins: true`, `required_approving_review_count: 0`, `allow_force_pushes: false`, `allow_deletions: false`.
- Las 3 demostraciones del gate (T16) vía PR real coinciden exactamente con la narrativa: PR #11 (tipo roto) falló en el paso "Tipos"; PR #12 (prueba fallida) falló en "Pruebas unitarias"; PR #13 (secreto falso) tuvo un primer intento en verde (por el allowlist de gitleaks sobre `AKIAIOSFODNN7EXAMPLE`, confirmado real, no inventado) y un segundo intento que falló realmente en "Gitleaks". La 4ª demostración (`any` nuevo) nunca generó PR, consistente con haber sido bloqueada por el hook de pre-commit antes de poder commitear (no puede verificarse contra GitHub por diseño, pero es la explicación más simple y no hay PR faltante sin explicar).
- Preview deployment de Vercel real y verificado: PR #15 muestra el check `Vercel` con conclusión `pass` y "Deployment has completed".
- SBOM real: artefacto `sbom-6d7f25bdfe1649c5aed4b76775c5e597cd172839.spdx.json` existe en el run del push a `main`, con el SHA del commit auditado en el nombre.
- Dependabot real: 9 PRs abiertos reales (`npm` y `github-actions`) y 2 alertas reales de vulnerabilidad (`drizzle-orm` alta, `vitest` media) visibles vía `gh api .../dependabot/alerts` — no simulado.
- Los 5 SHA de GitHub Actions fijados en `ci.yml` corresponden realmente a los commits de los repos oficiales de esas acciones (`actions/checkout`, `actions/setup-node`, `pnpm/action-setup`, `actions/upload-artifact`, `actions/dependency-review-action`, `anchore/sbom-action`), verificado consultando cada repo real — no son SHA inventados.
- Historial completo de git escaneado con `git log --all -p` para patrones de secretos reales (AWS, PEM, JWT, cadenas de conexión con credenciales): **no se encontró ningún secreto real**, solo valores de ejemplo/demo documentados (`AKIAIOSFODNN7EXAMPLE`, PEM falso) y credenciales de desarrollo local fijas y no sensibles (`wms_local_dev_only`, usadas también en CI). `spikes/phase-00-viability/` (que sí tenía credenciales reales según el propio análisis de la fase) nunca llegó a entrar al historial de git — confirmado que el único archivo `.env*` que existió alguna vez en el historial es `.env.example`.
- Repo configurado con squash-merge exclusivo (`allow_merge_commit: false`, `allow_rebase_merge: false`, `allow_squash_merge: true`), Conventional Commits reales en el log, `CODEOWNERS` presente.

---

## 2. Hallazgos

### FND-01-01 — S2 (Alta): AC-01-07 "Validación de variables de entorno al arranque" no está conectada a la aplicación real

**Descripción.** `src/lib/env.ts` exporta `getEnv()`, que valida `process.env` contra un esquema Zod y lanza si falta o es inválida una variable. Sin embargo, **ninguna parte de la aplicación llama a `getEnv()`**: no hay `instrumentation.ts`, ni middleware, ni código en `next.config.ts`/`layout.tsx`/`page.tsx` que la invoque. La única llamada en todo el árbol es la de su propio test unitario (`src/lib/env.unit.test.ts`), que importa la función directamente y la ejecuta en un entorno controlado por el test (`vi.stubEnv`).

**Ubicación.** `src/lib/env.ts:20` (declaración), ausencia confirmada en `src/app/layout.tsx`, `src/app/page.tsx`, `next.config.ts` y ausencia de cualquier `instrumentation.ts` en el repo.

**Cómo se reprodujo.** Se limpiaron del entorno de shell las 9 variables requeridas por el esquema (`DATABASE_URL`, `DIRECT_DATABASE_URL`, `MONDAY_CLIENT_ID`, `MONDAY_CLIENT_SECRET`, `MONDAY_SIGNING_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`, `NEXT_PUBLIC_MONDAY_CLIENT_ID`) y se ejecutó `pnpm build` real sobre el commit auditado:

```
$ env -u DATABASE_URL -u DIRECT_DATABASE_URL -u MONDAY_CLIENT_ID -u MONDAY_CLIENT_SECRET \
  -u MONDAY_SIGNING_SECRET -u SUPABASE_SERVICE_ROLE_KEY -u UPSTASH_REDIS_URL \
  -u UPSTASH_REDIS_TOKEN -u NEXT_PUBLIC_MONDAY_CLIENT_ID pnpm build
...
✓ Compiled successfully in 7.0s
✓ Generating static pages (4/4)
```

El build terminó exitosamente sin ningún error de validación de entorno. El criterio tal como está redactado en `phase-01-engineering-controls.md` ("Validación de variables de entorno al arranque … Arranque con var inválida/ausente falla con mensaje claro") **no se cumple**: la aplicación arranca igual.

**Por qué importa.** Esto es exactamente el patrón que el plan maestro pide buscar en la auditoría: "funcionalidad aparente sin implementación real". `traceability-index.md` marca AC-01-07 como "**Verificado**" citando únicamente el test unitario — evidencia válida de que la función en sí funciona, pero no de que el arranque real la use. En producción, un deploy con secretos faltantes o mal configurados (p. ej. `MONDAY_CLIENT_SECRET` vacío) no fallaría de forma visible y clara como exige el gate; fallaría más tarde y de forma menos clara, en el primer punto donde esa variable se use (si acaso se usa con una comprobación).

**Corrección mínima esperada.** Invocar `getEnv()` en un punto de arranque real y único que se ejecute siempre: `instrumentation.ts` con `register()` (recomendado por Next.js 15 para esto exactamente), o al menos un test de integración que levante el proceso real (`next build && next start`, o el `webServer` de Playwright) con una variable requerida ausente y verifique que el arranque falla con el mensaje esperado — no solo que la función pura lanza cuando se le llama directamente.

---

### FND-01-02 — S2 (Alta): la denegación de `.env*` en `.claude/settings.json` no cubre el patrón general, solo nombres de archivo enumerados

**Descripción.** CLAUDE.md (invariante #17) y el plan maestro §22.2 exigen denegar la lectura de `.env*` salvo `.env.example`. La implementación real en `.claude/settings.json` es una lista enumerada de nombres exactos:

```json
"deny": [
  "Read(./.env)",
  "Read(./.env.local)",
  "Read(./.env.*.local)",
  "Read(./.env.production)",
  "Read(./.env.staging)",
  ...
]
```

Esto **no es equivalente** a un patrón que cubra `.env*` en general. Cualquier variante de nombre no enumerada explícitamente (p. ej. `.env.ci`, `.env.docker`, `.env.vercel`, `.env.dev`) queda fuera del `deny` y es legible.

**Ubicación.** `.claude/settings.json:3-15`.

**Cómo se reprodujo.** Se creó un archivo `.env.ci` (no commiteado, eliminado inmediatamente después de la prueba) con un valor de marcador de posición:

```
$ printf 'MONDAY_CLIENT_SECRET=fake_placeholder_for_audit_test_not_real\n' > .env.ci
```

Y se leyó con la herramienta `Read` de Claude Code: **la lectura se permitió sin denegación**, mostrando el contenido completo del archivo. Esto contradice directamente la afirmación de `traceability-index.md`/`summary.md`/`claude-code-env-denial.txt` de que "Claude Code no puede leer `.env`" — la demostración real de T10 solo probó el caso `.env.local`, que sí está en la lista, pero no demuestra la cobertura general que SEC-004/AC-01-12 reclaman.

**Por qué importa.** Es precisamente el tipo de control que el plan maestro exige que nunca exista "solo en apariencia": aquí el control existe, pero con una cobertura incompleta y fácil de burlar con un nombre de archivo distinto, que es exactamente el tipo de archivo que aparecerá en fases futuras (`.env.ci`, `.env.vercel`, etc., ya mencionados en el propio `secret-rotation.md` como "CI vía secret de GitHub Actions").

**Corrección mínima esperada.** Reemplazar la lista enumerada por un patrón glob real que cubra todo `.env*` (p. ej. `Read(./.env*)` si la sintaxis de permisos de Claude Code soporta glob, verificado contra la documentación oficial de Claude Code, no contra la memoria del modelo) con la excepción explícita `allow: ["Read(./.env.example)"]` que ya existe. Volver a ejecutar la demostración T10 con al menos dos nombres de archivo no enumerados previamente para confirmar la cobertura general, no solo el caso puntual.

---

### FND-01-03 — S2/S3 (ver nota de severidad): SEC-005 no tiene evidencia válida — el propio `traceability-index.md` lo admite, pero la fase lo cuenta como cumplido en el gate

**Descripción.** `docs/execution/traceability-index.md` marca SEC-005 como:

> `Pendiente (sin secretos reales aún configurados para probar la fuga)`

`Pendiente` **no es un estado válido** según el plan maestro §10.2 ("Estados válidos por criterio: `DEMOSTRADO`, `NO DEMOSTRADO`, `N/A (justificado)`. No existe 'parcialmente demostrado'."). Además, SEC-005 es uno de los **6 bullets obligatorios del gate de Fase 1** listados textualmente en `phase-01-engineering-controls.md` §13 ("Ningún secreto llega al bundle del cliente (verificado sobre el build)"), y el propio `summary.md` del implementador reconoce en su sección "Pendiente (no bloqueante...)" que la verificación fue solo "por inspección" de la estructura, no una comprobación automatizada sobre el build real generado por CI — lo que viola además la regla de integridad de evidencia del plan maestro §30.2 ("la evidencia la genera la CI... la salida pegada a mano por el implementador no es evidencia válida para el gate").

**Ubicación.** `docs/execution/traceability-index.md:23`; `docs/evidence/phase-01/summary.md:47-51`; ausencia de cualquier paso en `.github/workflows/ci.yml` que inspeccione `.next/` en busca de patrones de secretos tras el `Build`.

**Verificación independiente.** Se confirmó que `.github/workflows/ci.yml` no tiene ningún step posterior a "Build" que grep/escanee la salida de `.next/` por valores de variables de entorno no públicas. El build real (ejecutado localmente sobre el commit auditado para la prueba de FND-01-01) no expone ningún secreto porque, en efecto, ningún componente cliente lee hoy ninguna variable no pública — pero esto es circunstancial a que la Fase 1 casi no tiene código, no el resultado de un control verificado.

**Por qué importa.** El riesgo real hoy es bajo (no hay casi superficie de ataque todavía), pero el **criterio tal como está documentado no está demostrado**, y la fase exige que lo esté para el gate. Marcarlo "Pendiente" en vez de "N/A (justificado)" con la aprobación explícita del RT (que el plan maestro exige para cualquier N/A) es, en sí mismo, un defecto de proceso.

**Corrección mínima esperada.** Una de dos: (a) agregar un paso de CI real que construya con una variable de prueba no pública seteada a un valor marcador y haga `grep -r` sobre `.next/static`/`.next/server` buscando ese valor, fallando si aparece — convirtiendo SEC-005 en `DEMOSTRADO` con evidencia de CI; o (b) si el RT decide diferirlo formalmente, registrarlo como `N/A (justificado)` con su aprobación explícita y fecha, no como "Pendiente".

---

### FND-01-04 — S3 (Media): el job `sbom` de CI solicita `permissions: contents: write`, mayor privilegio del necesario

**Descripción.** AC-01-06 exige explícitamente "permisos mínimos". El job `sbom` en `ci.yml` declara `contents: write`, pero usa `anchore/sbom-action` con su configuración por defecto (`upload-artifact: true`, `dependency-snapshot: false` — no se habilita explícitamente en el workflow). Se verificó contra el `action.yml` real de `anchore/sbom-action` que `contents: write` solo es necesario cuando `dependency-snapshot: true` (publica al API de Dependency Submission de GitHub); con la configuración actual (solo sube un artefacto de workflow), `contents: read` bastaría.

**Ubicación.** `.github/workflows/ci.yml:142-148`.

**Corrección mínima esperada.** Cambiar a `permissions: contents: read` salvo que se decida activar `dependency-snapshot: true` deliberadamente (lo cual sí justificaría `write`).

---

### FND-01-05 — S3 (Media, ya aceptado como riesgo por el RT): AC-01-09 se marca "Verificado" en bloque, pero la sub-cláusula "≥1 revisión humana" no se cumple

**Descripción.** Confirmado contra la API real de GitHub (`gh api .../branches/main/protection`): `required_pull_request_reviews.required_approving_review_count = 0`. El resto de AC-01-09 (PR obligatorio, CI requerido, sin force-push, `enforce_admins`) está sólidamente demostrado con un push directo real rechazado (`GH006`). Pero la cláusula "al menos una revisión humana" de la especificación de la fase (y del master-plan Fase 1 "Incluido") **no se cumple estructuralmente** — no es un bug a corregir en código, es una limitación de GitHub para un equipo de una persona, ya documentada como **RSK-012** con dueño, fecha de revisión y mitigación ("el Auditor IA compensa manualmente"). Esa mitigación no es verificable por ningún mecanismo automático: depende de que exista, en efecto, una sesión de auditoría por cada PR futuro, lo cual no está garantizado por ningún gate.

**Por qué no es bloqueante por sí solo.** A diferencia de FND-01-01/02/03, este hallazgo **ya tiene aceptación de riesgo explícita, con dueño y fecha** (RSK-012, revisión "antes de Fase 20"), que es exactamente el mecanismo que el plan maestro prevé para riesgos S3 (§6: "Puede aprobarse solo con aceptación explícita del RT, dueño y fecha"). Lo que sí es un defecto es que `traceability-index.md` lo liste como "**Verificado**" sin matiz, en vez de "Verificado parcialmente — ver RSK-012", lo cual es una sobre-afirmación de evidencia.

**Corrección mínima esperada.** Corregir la redacción de `traceability-index.md` para reflejar honestamente que la sub-cláusula de revisión humana no se cumple y remite a RSK-012, en vez de "Verificado" sin matices.

---

### FND-01-06 — S4 (Baja): vulnerabilidad de alta severidad abierta en `drizzle-orm` (dependencia central de fases futuras)

**Descripción.** `gh api repos/.../dependabot/alerts` reporta una alerta real **alta** para `drizzle-orm` ("SQL injection via improperly escaped SQL identifiers") y una **media** para `vitest`, ambas abiertas, con PRs de Dependabot ya creados (#10, #9) pero no mergeados en el commit auditado. No bloquea Fase 1 (SEC-002 solo exige que el mecanismo de SCA exista y funcione, lo cual está demostrado), pero es un riesgo residual relevante dado que `drizzle-orm` es el ORM central de todo el proyecto desde Fase 4 en adelante.

**Corrección mínima esperada.** Ninguna para Fase 1; registrar como riesgo a revisar antes de Fase 4 (donde `drizzle-orm` empieza a ejecutar SQL real contra RLS).

---

### FND-01-07 — S4 (Baja): `eslint.config.mjs` no ignora `next-env.d.ts`, generando fallos de lint locales espurios

**Descripción.** A diferencia del preset recomendado de Next.js, la lista `ignores` de `eslint.config.mjs` no excluye `next-env.d.ts` (generado automáticamente por Next.js al correr `next dev`/`next build`). Esto causa que `pnpm lint` falle localmente con `@typescript-eslint/triple-slash-reference` en cualquier checkout donde ya se haya ejecutado un comando de Next.js antes del lint — **no afecta a CI real**, confirmado inspeccionando el log del paso "Lint" del run verde del commit auditado (pasa limpio, porque en un checkout fresco `next-env.d.ts` todavía no existe en ese punto del pipeline).

**Corrección mínima esperada.** Agregar `"next-env.d.ts"` a `ignores` en `eslint.config.mjs`.

---

### FND-01-08 — S4 (Baja): `@types/node` en `^26.0.0` mientras `engines.node`/`.nvmrc` fijan `24.x`

**Descripción.** El commit `697a19e` bajó el Node objetivo de 26.x a 24.x porque Vercel no soporta 26 todavía, pero dejó `@types/node: ^26.0.0` sin corregir en `package.json`. Riesgo bajo (tipos de Node son mayormente aditivos entre versiones menores), pero es una inconsistencia menor respecto a "pnpm y Node fijados" (AC-01-02).

**Corrección mínima esperada.** Fijar `@types/node` a `^24.0.0` o rango compatible con Node 24.

---

## 3. Resultados de las fallas deliberadas introducidas (y cómo se revirtieron)

Las 4 pruebas se ejecutaron sobre el working tree local del commit auditado, **nunca se commitearon ni se pushearon**, y se revirtieron con `git checkout -- <archivo>` (confirmado `git status --porcelain` limpio después de cada una) o con `rm` para el archivo nuevo no trackeado.

| # | Falla introducida | Dónde | Resultado | ¿Detectada? |
|---|---|---|---|---|
| 1 | `const x: number = "string"` + `console.log(x)` en `src/app/page.tsx` | Tipo roto + `no-console` | `tsc --noEmit` → `TS2322`; `eslint` → `no-console` error | **Sí**, ambos controles la detectaron |
| 2 | `arr[0]` asignado a `number` sin verificar `undefined` (viola `noUncheckedIndexedAccess`) + `const anyTest: any = 5` | `src/app/page.tsx` | `tsc --noEmit` → `TS2322` (`number \| undefined` no asignable); `eslint` → `no-explicit-any` error | **Sí**, ambos controles la detectaron — confirma que `noUncheckedIndexedAccess` y el ban de `any` son reales, no solo configuración decorativa |
| 3 | Las 9 variables de entorno requeridas por `src/lib/env.ts` eliminadas del shell antes de `pnpm build` | Entorno de shell, commit auditado sin modificar | `pnpm build` completó exitosamente, sin ningún error de validación | **No** — confirma FND-01-01 |
| 4 | Archivo `.env.ci` nuevo (no trackeado) con un valor marcador de secreto, nunca commiteado | Raíz del repo | `Read(./.env.ci)` con la herramienta Read de Claude Code tuvo éxito, mostró el contenido completo | **No** — confirma FND-01-02 |

Reversión: prueba 1 y 2 revertidas con `git checkout -- src/app/page.tsx` (confirmado sin diff tras cada una); prueba 3 no modificó ningún archivo (solo variables de shell efímeras); prueba 4 revertida con `rm .env.ci` (archivo nunca estuvo trackeado por git, `git status --porcelain` confirmado limpio antes y después).

---

## 4. Tabla de criterios: demostrado vs. no demostrado

| Criterio | Estado (esta auditoría) | Evidencia real verificada | Nota |
|---|---|---|---|
| AC-01-01 | **DEMOSTRADO** | `tsconfig.json` + 2 fallas deliberadas detectadas (TS2322 en ambos casos) | — |
| AC-01-02 | **DEMOSTRADO** (con nota) | `package.json`/`.nvmrc`/`engines` | Ver FND-01-08 (menor) |
| AC-01-03 | **DEMOSTRADO** | `eslint.config.mjs`, husky/lint-staged, T16 4/4 real | Regla §12.3 de `withTenant()` correctamente diferida a Fase 4 |
| AC-01-04 | **DEMOSTRADO** | Run de CI real del commit auditado, todos los pasos verdes | — |
| AC-01-05 | **DEMOSTRADO** | `postgres:17` en `ci.yml`, confirmado en el run real | — |
| AC-01-06 | **DEMOSTRADO** (con nota) | 5/5 SHA de Actions verificados reales contra los repos oficiales | Ver FND-01-04 (permiso excesivo en job `sbom`) |
| AC-01-07 | **NO DEMOSTRADO** | Build real con env vacío no falla | FND-01-01 |
| AC-01-08 | **DEMOSTRADO** | Squash-merge forzado a nivel de repo, Conventional Commits reales, CODEOWNERS, plantilla de PR | — |
| AC-01-09 | **DEMOSTRADO parcialmente** | Branch protection real confirmada vía API; push directo rechazado real | Sub-cláusula "≥1 revisión humana" no cumplida — FND-01-05, ya aceptada como RSK-012 |
| AC-01-10 | **DEMOSTRADO** | PRs #11/#12/#13 con fallos de CI reales y verificados paso por paso | — |
| AC-01-11 | **DEMOSTRADO** | Check "Vercel" real en PR #15, "Deployment has completed" | — |
| AC-01-12 | **NO DEMOSTRADO** (como afirmación general) | `.env.local` sí denegado; `.env.ci` no denegado | FND-01-02 |
| SEC-001 | **DEMOSTRADO** | PR #13 falló realmente en el job de gitleaks | — |
| SEC-002 | **DEMOSTRADO** | 9 PRs reales de Dependabot + 2 alertas reales | — |
| SEC-003 | **DEMOSTRADO** | Artefacto SBOM real con el SHA del commit auditado | — |
| SEC-004 | **NO DEMOSTRADO** (como afirmación general) | Mismo hallazgo que AC-01-12 | FND-01-02 |
| SEC-005 | **NO DEMOSTRADO** | El propio `traceability-index.md` lo admite ("Pendiente"); sin paso de CI que lo verifique | FND-01-03 |
| NFR-008 | **DEMOSTRADO** | Orden de pasos del run real coincide exactamente con el pipeline mínimo especificado | — |

**4 criterios NO DEMOSTRADOS** (AC-01-07, AC-01-12, SEC-004, SEC-005) activan por sí solos el criterio de rechazo automático del plan maestro §33.

---

## 5. Comandos ejecutados (con resultado real)

Todos ejecutados realmente en esta sesión contra el repositorio y la API real de GitHub; ninguno fue inventado ni resumido sin leer su salida completa.

```text
git status && git log --oneline -5
gh auth status ; gh repo view rjpython05/monday-wms-construccion --json name,visibility,defaultBranchRef
git diff a64fbe9..6d7f25b --stat
git log --oneline a64fbe9..6d7f25b
cat (Read) docs/execution/master-plan.md, docs/phases/phase-01-engineering-controls.md,
    docs/evidence/phase-01/*, docs/execution/traceability-index.md,
    docs/execution/change-control.md, docs/execution/risks.md, docs/execution/phase-status.md
cat (Read) package.json, .github/workflows/ci.yml, .claude/settings.json, eslint.config.mjs,
    drizzle.config.ts, src/lib/env.ts, tsconfig.json, docker-compose.yml, next.config.ts,
    src/app/layout.tsx, src/app/page.tsx, .husky/pre-commit, .lintstagedrc.json,
    .github/CODEOWNERS, .github/dependabot.yml, vitest*.config.ts, playwright.config.ts,
    e2e/smoke.spec.ts, src/lib/db/schema/index.ts, src/lib/db/schema/index.security.test.ts,
    src/lib/db/migration.int.test.ts, src/lib/env.unit.test.ts, .env.example, .nvmrc,
    drizzle/meta/_journal.json, docs/runbooks/secret-rotation.md, .github/pull_request_template.md
git log --all --diff-filter=A --name-only --pretty=format: | grep -i '\.env'     → solo .env.example
git log --all -p -- . | grep -nE "AKIA...|-----BEGIN...PRIVATE KEY|eyJhbGciOi|postgres(ql)?://...@|sk-..." → sin secretos reales
git log --all --diff-filter=A --name-only --pretty=format: | grep -i '^spikes'  → vacío (spikes/ nunca entró al historial)
gh api repos/rjpython05/monday-wms-construccion/branches/main/protection        → coincide con lo documentado
gh pr list --state all --limit 50 --json number,title,state,mergedAt,...        → 18 PRs reales, estados coinciden
gh run view 37140373807 / 37140721900 --json ...                               → runs reales, conclusion success
gh run list --limit 30 --json ...                                              → historial de runs real
gh run view 37138364032/37138365768/37138684612/37138368217 --json jobs -q ... → fallos T16 confirmados paso por paso
gh api repos/actions/checkout/commits/11d5960a...                             → SHA real
gh api repos/actions/setup-node/commits/49933ea5...                           → SHA real
gh api repos/pnpm/action-setup/commits/b906affc...                            → SHA real
gh api repos/actions/upload-artifact/commits/ea165f8d...                      → SHA real
gh api repos/actions/dependency-review-action/commits/2031cfc0...             → SHA real (v4.9.0)
gh api repos/anchore/sbom-action/commits/e22c389904...                        → SHA real (v0.24.0/v0/latest)
gh api repos/rjpython05/monday-wms-construccion/actions/runs/37140721900/artifacts → SBOM real con SHA del commit
gh api repos/rjpython05/monday-wms-construccion/dependabot/alerts             → 2 alertas reales
gh pr view 15 --json statusCheckRollup / gh pr checks 15                     → Vercel "Deployment has completed" real
gh api repos/rjpython05/monday-wms-construccion -q '{allow_squash_merge,...}' → squash-merge forzado real
gh api repos/anchore/sbom-action/contents/action.yml                         → confirma que contents:write no es necesario con la config usada
pnpm build (con las 9 env vars requeridas sin setear)                        → build exitoso SIN validar env (FND-01-01)
pnpm typecheck / pnpm lint (con fallas deliberadas 1 y 2 inyectadas)         → detectadas correctamente, luego revertidas con git checkout --
Read(./.env.ci) tras crear el archivo con un valor marcador                  → lectura permitida (FND-01-02), archivo luego eliminado con rm
```

No ejecutado / no verificable en este entorno:

- No se ejecutó `pnpm test:int` ni `pnpm db:up` localmente (requiere Docker; no disponible/no intentado en esta sesión de auditoría, tal como el propio implementador reportó). Se verificó en su lugar el paso real "Pruebas de integración (PostgreSQL real)" en el log de CI del commit auditado, que pasó.
- No se verificó en vivo el deny de `vercel --prod`/`vercel deploy --prod`/`git push --force` del `.claude/settings.json` (no se intentó un despliegue real a producción ni un force-push real, por ser acciones destructivas fuera del alcance de esta auditoría); se verificó solo por inspección de configuración que los patrones existen.
- No se intentó confirmar si la sintaxis de permisos de Claude Code soporta glob (`Read(./.env*)`) contra la documentación oficial — queda como parte de la corrección mínima de FND-01-02, a verificar por quien la implemente.

---

## 6. Riesgos residuales

- **RSK-012** (CODEOWNER único, 0 revisiones humanas requeridas): confirmado real y correctamente documentado; ver FND-01-05 sobre la sobre-afirmación en trazabilidad.
- **RSK-013** (credenciales reales del spike de Fase 0 pendientes de rotar): no verificable por esta auditoría (requiere acceso a paneles de Supabase/monday.com fuera de alcance); se confirma que el riesgo sigue abierto en `risks.md` sin fecha de cierre.
- **RSK-017** (repo público): aceptado explícitamente por el RT con justificación registrada (CHG-003); se confirmó por escaneo de historial que no hay secretos reales expuestos públicamente.
- Nuevo — vulnerabilidad alta de `drizzle-orm` abierta (FND-01-06): recomendar revisión antes de Fase 4.
- Nuevo — cobertura de `.env*` incompleta en `.claude/settings.json` (FND-01-02): mientras no se corrija, cualquier archivo `.env.<nombre-no-enumerado>` con secretos reales podría ser leído por Claude Code en sesiones futuras.

---

## 7. Correcciones mínimas obligatorias antes de re-auditar

1. Conectar `getEnv()` a un punto de arranque real de la aplicación (p. ej. `instrumentation.ts`) y demostrarlo con un test que levante el proceso real, no solo la función aislada (FND-01-01).
2. Cambiar el `deny` de `.claude/settings.json` de una lista enumerada de nombres a un patrón que cubra `.env*` en general (verificado contra la documentación oficial de Claude Code), y repetir la demostración T10 con al menos un nombre de archivo no probado antes (FND-01-02).
3. Resolver SEC-005 con evidencia real de CI (paso automatizado que falle si un valor marcador no público aparece en `.next/`) o registrarlo formalmente como `N/A (justificado)` con aprobación explícita del RT, no como "Pendiente" (FND-01-03).
4. Reducir `permissions` del job `sbom` a `contents: read` salvo que se habilite deliberadamente `dependency-snapshot: true` (FND-01-04).
5. Corregir la redacción de `traceability-index.md` para AC-01-09, indicando explícitamente que la sub-cláusula de revisión humana remite a RSK-012 en vez de "Verificado" sin matices (FND-01-05).
6. (No bloqueante, recomendado) Agregar `next-env.d.ts` a los `ignores` de ESLint (FND-01-07) y alinear `@types/node` con Node 24.x (FND-01-08).

Tras corregir 1-5, debe re-generarse evidencia real de CI sobre el nuevo commit y re-auditarse contra ese commit (nunca reutilizar la evidencia de `6d7f25b` para aprobar un commit distinto, por `master-plan.md` §30.2).
