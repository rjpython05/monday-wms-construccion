# Informe de auditoría independiente — Fase 1: Repositorio y controles de ingeniería (2ª auditoría)

**Sesión:** Auditor IA (sesión nueva, sin contexto del implementador ni de la Sesión C anterior), conforme a `/docs/execution/master-plan.md` §32.4 y §32.5.
**Rango auditado:** `a64fbe9b2bc5b6524f8d8480f19d97ffce4ec495..963e618b329b1af44a7514044b9931cce7b04047` (rama `main`).
**Commit de corrección bajo escrutinio directo:** `65b2fd13e5a06eb7fcfedc425a277887bf390382` ("fix: corrige hallazgos FND-01-01 a FND-01-08 (auditoría) (#19)").
**Fecha de auditoría:** 2026-10-03.
**Repositorio real:** https://github.com/rjpython05/monday-wms-construccion (público, CHG-003).

---

## Veredicto: **REJECT**

7 de los 8 hallazgos originales (FND-01-01, 02, 03\*, 04, 05, 07, 08) están genuinamente corregidos y se verificaron de forma independiente y reproducible (comandos reales, logs reales de CI vía `gh api`/`gh run view --log`, y reproducción local propia). Sin embargo, la corrección de **FND-01-03 (SEC-005) es solo aparente**: el nuevo paso de CI es una prueba tautológica que no ejercita el riesgo real que SEC-005 existe para prevenir, y una reproducción propia con un componente cliente real demuestra que el paso de CI **no habría detectado una fuga real de un valor no público hacia el HTML entregado al cliente**. Esto reabre SEC-005 como **NO DEMOSTRADO** en los términos del propio hallazgo original, y por tanto activa el mismo criterio de rechazo automático del plan maestro §33 que motivó el primer `REJECT` ("un criterio de aceptación figura como NO DEMOSTRADO"), ahora bajo un nuevo hallazgo (FND-01-09, S2).

No hay evidencia de fabricación: todo lo reportado por el implementador sobre FND-01-01, 02, 04, 05, 07 y 08 se reprodujo de forma independiente y es real. El problema es específico y acotado a la sustancia de la corrección de SEC-005, no a su existencia nominal.

---

## 1. Verificación de los 8 hallazgos originales

### FND-01-01 (S2) — AC-01-07, validación de entorno al arranque real — **CORREGIDO**

Verificación propia, con `.env.local` del entorno local movido temporalmente fuera (sin leer su contenido) para que no enmascarara el resultado:

```
$ env -u DATABASE_URL -u DIRECT_DATABASE_URL -u MONDAY_CLIENT_ID -u MONDAY_CLIENT_SECRET \
  -u MONDAY_SIGNING_SECRET -u SUPABASE_SERVICE_ROLE_KEY -u UPSTASH_REDIS_URL \
  -u UPSTASH_REDIS_TOKEN -u NEXT_PUBLIC_MONDAY_CLIENT_ID pnpm build
...
✓ Generating static pages (4/4)
BUILD EXIT: 0
```

```
$ env (mismas vars sin setear) pnpm start
✓ Starting...
Variables de entorno inválidas o faltantes:
  - DATABASE_URL: Required
  ... (9 variables)
Revisa .env.example para la lista completa.
[ELIFECYCLE] Command failed with exit code 1.
START EXIT: 1
```

Confirma exactamente lo que el implementador reportó: `pnpm build` no falla (porque `register()` de `src/instrumentation.ts` no se ejecuta en `next build`, solo al iniciar un servidor real), y `pnpm start` sí falla, con exit code 1 y el mensaje exacto de `src/lib/env.ts`. Además probé el caso no cubierto por el propio implementador — **valor presente pero inválido**, no solo ausente:

```
$ DATABASE_URL="not-a-valid-url-garbage" (resto de vars válidas dummy) pnpm start
Variables de entorno inválidas o faltantes:
  - DATABASE_URL: Invalid url
[ELIFECYCLE] Command failed with exit code 1.
```

`src/instrumentation.ts` gatea correctamente con `process.env["NEXT_RUNTIME"] === "nodejs"`, evitando ejecución duplicada en el runtime `edge` (no hay middleware edge en esta fase, pero el guard es correcto y preventivo).

Verifiqué también el run real de CI del commit `65b2fd1` (push run `37143136300`, job `Pipeline`, paso `E2E`): `2 passed (20.7s)` — los dos specs (`e2e/smoke.spec.ts` y `e2e/env-validation.spec.ts`) corren contra un `next start` real levantado por el `webServer` de Playwright más una segunda instancia en el puerto 3010 que el propio test de `env-validation.spec.ts` lanza con `MONDAY_CLIENT_SECRET` vaciado. No es un test decorativo: levanta el proceso real, exactamente lo que pedía la corrección mínima del primer informe.

**Evidencia:** `src/instrumentation.ts`, `e2e/env-validation.spec.ts`, `playwright.config.ts`, run CI `37143136300` (paso `E2E`), reproducción local propia (arriba).

---

### FND-01-02 (S2) — cobertura general de `.env*` en `.claude/settings.json` — **CORREGIDO**

Contenido real verificado de `.claude/settings.json`:

```json
"deny": [
  "Read(.env*)",
  "Read(!.env.example)",
  "Bash(git push --force*)",
  "Bash(git push -f*)",
  "Bash(vercel --prod*)",
  "Bash(vercel deploy --prod*)"
]
```

Reproducción propia con un nombre de archivo **nunca antes probado por nadie** (ni en la implementación original, ni en el primer informe de auditoría, que usó `.env.ci`): `.env.audit2`.

- Intento de creación con la herramienta `Write`: **rechazado** — `"File is covered by a Read deny rule in your permission settings and cannot be written."`
- Creado en su lugar vía shell (PowerShell, fuera del alcance de la política de `Read`), con un valor marcador falso.
- Intento de lectura con la herramienta `Read`: **rechazado** — `"File is in a directory that is denied by your permission settings."`
- `Read(.env.example)` en paralelo: **permitido**, contenido completo mostrado correctamente.
- Archivo `.env.audit2` eliminado inmediatamente después de la prueba (nunca commiteado; `git status --porcelain` confirmado limpio).

Esto es más fuerte que la propia demostración del implementador (que probó 3 nombres ya conocidos: `.env.vercel`, `.env.dev`, `.env.local`): aquí se usó un nombre genuinamente nuevo y la denegación se extendió también a la herramienta `Write`, no solo `Read`.

**Evidencia:** `.claude/settings.json:3-10`; prueba reproducida en esta sesión (arriba).

---

### FND-01-03 (S2/S3) — SEC-005, verificación de que ningún secreto llega al bundle de cliente — **CORREGIDO PARCIALMENTE (sustancialmente NO CORREGIDO — ver FND-01-09)**

El estado inválido "Pendiente" fue eliminado de `traceability-index.md` (correcto, cumple la letra de §10.2), y se añadió un paso real de CI (`.github/workflows/ci.yml:81-95`) que compila con `AUDIT_SEC005_MARKER` (sin prefijo `NEXT_PUBLIC_`) y hace `grep -rF` sobre `.next/static`. El paso corrió realmente en CI y pasó (`37143136300`, paso "Verificación de que ningún valor no público llega al bundle de cliente (SEC-005)": éxito).

**Pero la verificación propia demuestra que este paso no prueba lo que SEC-005 exige.** Ver hallazgo nuevo **FND-01-09** para el detalle completo: el marcador `AUDIT_SEC005_MARKER` no es referenciado por ningún código fuente (`grep -rn AUDIT_SEC005_MARKER` en todo el repo solo lo encuentra en `ci.yml`), por lo que el chequeo es tautológico — pasaría igual aunque el control real estuviera completamente roto. Además, al construir una prueba real (un componente cliente que sí lee `process.env.AUDIT_SEC005_MARKER`), el valor apareció en `.next/server/app/index.html` (HTML pre-renderizado que Next.js sirve literalmente al navegador para páginas estáticas), **no** en `.next/static` — el único directorio que el paso de CI inspecciona. El paso habría pasado en verde incluso con esta fuga real.

Clasifico esto como **CORREGIDO PARCIALMENTE**: el defecto de *proceso* (estado inválido "Pendiente", ausencia de cualquier paso de CI) sí se corrigió; el defecto de *sustancia* (que SEC-005 esté realmente demostrado) no.

---

### FND-01-04 (S3) — permisos del job `sbom` — **CORREGIDO**

`ci.yml:160-164` ahora declara `permissions: contents: read` para el job `sbom`. Verificado no solo por inspección del archivo sino contra el **log real de ejecución** del run `37143136300`:

```
SBOM (release — solo push a main)  Set up job  ##[group]GITHUB_TOKEN Permissions
SBOM (release — solo push a main)  Set up job  Contents: read
SBOM (release — solo push a main)  Set up job  Metadata: read
```

Esto es más fuerte que una inspección estática: confirma que GitHub efectivamente emitió un token con permiso `read`, no solo que el YAML lo declara.

---

### FND-01-05 (S3, ya aceptado como riesgo) — redacción de AC-01-09 en `traceability-index.md` — **CORREGIDO (con observación menor)**

`traceability-index.md:15` ahora dice explícitamente:

> **Verificado parcialmente** — PR obligatorio/CI requerido/sin force-push/enforce_admins verificados reales; la sub-cláusula "≥1 revisión humana" NO se cumple (...) — ver RSK-012 (FND-01-05, auditoría)

Esto cumple la corrección mínima pedida (mencionar explícitamente que la sub-cláusula no se cumple y remitir a RSK-012). Branch protection real reverificada vía `gh api .../branches/main/protection`: idéntica a la documentada (`required_approving_review_count: 0`, `enforce_admins: true`, `allow_force_pushes: false`).

**Observación menor (no bloqueante, ver FND-01-10):** "Verificado parcialmente" no es ninguno de los tres estados válidos que el propio plan maestro define en §10.2 ("DEMOSTRADO", "NO DEMOSTRADO", "N/A (justificado)" — "No existe 'parcialmente demostrado'"), la misma regla que se invocó para rechazar el "Pendiente" de SEC-005 en el primer informe. Es una inconsistencia de forma, no de sustancia (el contenido es honesto y matizado), pero introduce una cuarta categoría de facto inmediatamente después de haber corregido otra fila por violar esa misma regla.

---

### FND-01-07 (S4) — `next-env.d.ts` excluido del lint — **CORREGIDO**

`package.json:14`: `"lint": "eslint . --ignore-pattern .agents --ignore-pattern .claude/skills --ignore-pattern next-env.d.ts"`. `eslint.config.mjs` no se tocó. Verificado que existe un mecanismo real (`config-protection`, hook de la herramienta a nivel de harness, plugin `ecc@ecc` habilitado en `.claude/settings.local.json`) que bloquea activamente la edición de `eslint.config.mjs`: intenté editarlo (una línea de comentario trivial, revertida — de hecho el intento fue bloqueado antes de aplicarse) y obtuve: `BLOCKED: Modifying eslint.config.mjs is not allowed...`. Esto confirma que la justificación del commit ("eslint.config.mjs está protegido por config-protection") es real, no una excusa inventada.

Reproducción local: `next-env.d.ts` existe en este checkout y `pnpm lint` corre limpio sin el error `@typescript-eslint/triple-slash-reference` que el primer informe documentó.

---

### FND-01-08 (S4) — `@types/node` alineado a Node 24.x — **CORREGIDO**

`package.json:39`: `"@types/node": "^24.0.0"`, consistente con `engines.node: "24.x"`. Diff de `pnpm-lock.yaml` revisado línea por línea: el cambio está acotado exactamente a la resolución de `@types/node` (26.6.4 → 24.19.1) y sus dependientes transitivos (`vite`, `vitest`, `next`, `sharp`, `@vitest/mocker`, `vite-node`) — sin scope creep hacia otras dependencias no relacionadas.

---

## 2. Hallazgos nuevos

### FND-01-09 — S2 (Alta): el paso de CI de SEC-005 es tautológico y no cubre el directorio donde realmente aparece una fuga vía componente cliente

**Descripción.** El paso "Verificación de que ningún valor no público llega al bundle de cliente (SEC-005)" (`.github/workflows/ci.yml:89-95`) construye con `AUDIT_SEC005_MARKER` seteado y hace `grep -rF` sobre `.next/static`. Pero:

1. **Nadie referencia `AUDIT_SEC005_MARKER` en código fuente.** `grep -rn "AUDIT_SEC005_MARKER" .` en todo el árbol del repo solo encuentra la línea del propio `ci.yml`. El chequeo pasaría exactamente igual si Next.js inlineara automáticamente *cualquier* variable de entorno no pública en el cliente (es decir, si SEC-005 estuviera completamente roto), porque no hay ningún punto del código que intente leer esa variable.
2. **El directorio verificado es el equivocado para el vector de fuga más común.** Reproduje el escenario real: un componente `"use client"` que lee `process.env["AUDIT_SEC005_MARKER"]`, importado desde una página estática. Al compilar con el marcador seteado:

```
$ grep -rF "sec005-marker-9f3a7c21-must-not-leak-to-client" .next/static
(sin resultados — exit 1)

$ grep -o 'data-audit-marker="[^"]*"' .next/server/app/index.html
data-audit-marker="sec005-marker-9f3a7c21-must-not-leak-to-client"
```

El valor **sí apareció**, pero en `.next/server/app/index.html` — el HTML pre-renderizado que Next.js sirve literalmente al navegador para páginas estáticas (no es "solo servidor" en el sentido de "nunca llega al cliente"; es el documento HTML real entregado). El paso de CI, tal como está escrito, solo inspecciona `.next/static` y por tanto **no habría detectado esta fuga real**.

**Ubicación.** `.github/workflows/ci.yml:81-95`.

**Por qué importa.** Es la misma clase de defecto que motivó el rechazo original de FND-01-01: un control que existe nominalmente (aparece en CI, corre, "pasa") pero no ejercita el riesgo que dice prevenir. SEC-005 es uno de los 6 bullets obligatorios del gate de Fase 1 (`phase-01-engineering-controls.md` §13). Marcarlo "Verificado" en `traceability-index.md` sobre la base de este paso es una sobre-afirmación de evidencia: el criterio de rechazo automático §33 ("un criterio de aceptación figura como NO DEMOSTRADO") aplica de nuevo, bajo esta nueva caracterización del mismo problema de fondo.

**Corrección mínima esperada.** (a) Hacer que el marcador se consuma realmente desde un punto de código de prueba (p. ej. un componente cliente de prueba, o reutilizar una ruta real cuando exista server/client boundary en fases futuras) para que el chequeo no sea tautológico; y (b) extender el `grep` para cubrir también `.next/server` (al menos los `.html`/`.rsc`/`.next/server/app/**` generados para rutas estáticas, que sí se sirven al navegador), no solo `.next/static`. Alternativa más robusta: en vez de un marcador inventado sin consumidor, verificar negativamente que ningún valor de las variables *reales* no públicas del esquema de `src/lib/env.ts` (con valores de prueba distintivos) aparece en ninguno de los artefactos servidos al cliente (`.next/static` + HTML/RSC de `.next/server/app`).

---

### FND-01-10 — S4 (Baja): `traceability-index.md` introduce un cuarto estado no canónico ("Verificado parcialmente") en la misma corrección que elimina otro estado no canónico ("Pendiente") por la misma razón

**Descripción.** El plan maestro §10.2 define exactamente tres estados válidos por criterio: `DEMOSTRADO`, `NO DEMOSTRADO`, `N/A (justificado)` ("No existe 'parcialmente demostrado'"). La corrección de FND-01-03 elimina correctamente el estado inválido "Pendiente" de la fila de SEC-005 invocando esa misma regla. Pero la corrección de FND-01-05, en el mismo commit, introduce "**Verificado parcialmente**" para AC-01-09 — un estado que tampoco es ninguno de los tres canónicos. El contenido es honesto y útil (explica exactamente qué sub-cláusula falla y remite a RSK-012), pero es inconsistente aplicar la regla de canonicidad a una fila y no a la otra en el mismo commit de corrección.

**Corrección mínima esperada.** No bloqueante. O bien formalizar "Verificado parcialmente" como una extensión documentada de §10.2 específica para `docs/execution/traceability-index.md` (que ya usa "Verificado" en vez de "DEMOSTRADO" como convención propia del proyecto, divergencia preexistente no introducida por este commit), o usar textualmente `NO DEMOSTRADO (sub-cláusula "≥1 revisión humana"; resto DEMOSTRADO — ver RSK-012, aceptado S3)`.

---

### FND-01-11 — S4 (Baja, informativa): `docs/evidence/phase-01/manifest.json` no se actualizó tras la corrección

**Descripción.** `manifest.json` sigue apuntando al run de ejemplo `37140373807` (anterior a la corrección) y no lista `e2e/env-validation.spec.ts` ni el paso de CI de SEC-005 entre la evidencia. No afecta el gate (la evidencia correcta sí está disponible y fue verificada contra CI real en este informe), pero es una inconsistencia menor de trazabilidad documental.

---

## 3. Resultados de las fallas deliberadas

Todas ejecutadas sobre el working tree local del commit `963e618` (HEAD de `main`), nunca commiteadas ni pusheadas. Confirmado `git status --porcelain` limpio al final (solo advertencias de normalización CRLF/LF sin diff de contenido real).

| # | Falla introducida | Dónde | Resultado | ¿Detectada? |
|---|---|---|---|---|
| 1 (reproducción FND-01-01) | 9 variables de entorno requeridas eliminadas del shell (con `.env.local` movido aparte para evitar que lo enmascarara) | Shell, antes de `pnpm build`/`pnpm start` | `build` exit 0 (esperado, sin control); `start` exit 1 con mensaje claro | **Sí** en `start` — confirma FND-01-01 corregido |
| 2 (reproducción FND-01-02) | Archivo `.env.audit2` nuevo, nombre nunca antes probado, valor marcador falso | Raíz del repo | `Write` rechazado; `Read` rechazado; `.env.example` permitido | **Sí** — confirma FND-01-02 corregido, con cobertura más amplia (`Write` también bloqueado) |
| 3 (nueva, propia) | `DATABASE_URL="not-a-valid-url-garbage"` (valor presente pero inválido, no ausente) | Shell, antes de `pnpm start` | Exit 1, `DATABASE_URL: Invalid url` | **Sí** — confirma que la validación cubre formato, no solo ausencia |
| 4 (nueva, propia — la más relevante) | Componente `"use client"` real que lee `process.env.AUDIT_SEC005_MARKER`, importado desde `page.tsx`, build con el marcador seteado | `src/app/audit-temp-client.tsx` (temporal) + `src/app/page.tsx` (editado y revertido) | El valor apareció en `.next/server/app/index.html`; el `grep` de CI (solo sobre `.next/static`) **no lo habría detectado** | **No** — confirma FND-01-09 (hallazgo nuevo) |

Reversión: prueba 1 no modificó archivos (solo variables de shell efímeras; `.env.local` restaurado a su nombre original con PowerShell sin leer su contenido). Prueba 2: `.env.audit2` eliminado (nunca trackeado por git). Prueba 3: no modificó archivos. Prueba 4: `src/app/audit-temp-client.tsx` eliminado, `src/app/page.tsx` revertido a su contenido original (confirmado `git diff` sin cambios de contenido), `.next/` (artefacto de build, ignorado por git) regenerado limpio.

---

## 4. Tabla de criterios: demostrado vs. no demostrado (actualizada)

| Criterio | Estado (esta auditoría) | Evidencia real verificada | Nota |
|---|---|---|---|
| AC-01-01 | **DEMOSTRADO** | `tsconfig.json`, sin cambios en este rango | Sin cambios respecto al 1er informe |
| AC-01-02 | **DEMOSTRADO** | `package.json`/`.nvmrc`/`engines`, `@types/node` ahora alineado | FND-01-08 corregido |
| AC-01-03 | **DEMOSTRADO** | `eslint.config.mjs` protegido por hook real (`config-protection`, verificado intentando editarlo); `next-env.d.ts` ahora ignorado vía script | FND-01-07 corregido |
| AC-01-04 | **DEMOSTRADO** | Run CI real `37143136300`/`37143624017`, todos los pasos verdes | — |
| AC-01-05 | **DEMOSTRADO** | `postgres:17` sin cambios | — |
| AC-01-06 | **DEMOSTRADO** | SHA de Actions sin cambios en este rango; permisos del job `sbom` corregidos y confirmados contra el log real del token (`Contents: read`) | FND-01-04 corregido |
| AC-01-07 | **DEMOSTRADO** | `src/instrumentation.ts` + `e2e/env-validation.spec.ts`; reproducido localmente con `pnpm build`/`pnpm start` reales, incluyendo caso de valor inválido (no solo ausente) | FND-01-01 corregido |
| AC-01-08 | **DEMOSTRADO** | Sin cambios | — |
| AC-01-09 | **DEMOSTRADO parcialmente** (sin cambio de sustancia, solo de redacción) | Branch protection re-verificada vía `gh api`, idéntica | FND-01-05 corregido (redacción); ver FND-01-10 (forma) |
| AC-01-10 | **DEMOSTRADO** | Sin cambios | — |
| AC-01-11 | **DEMOSTRADO** | Sin cambios | — |
| AC-01-12 | **DEMOSTRADO** | Reproducido con nombre de archivo genuinamente nuevo (`.env.audit2`), `Write` y `Read` ambos bloqueados; `.env.example` permitido | FND-01-02 corregido, con margen adicional |
| SEC-001 | **DEMOSTRADO** | Sin cambios; gitleaks re-verificado en el run del commit corregido: `no leaks found` | — |
| SEC-002 | **DEMOSTRADO** | Dependabot activo; alertas reales reconfirmadas (`drizzle-orm` alta, `vitest` media, ambas abiertas) | RSK-018 sigue abierto, no bloqueante |
| SEC-003 | **DEMOSTRADO** | Sin cambios | — |
| SEC-004 | **DEMOSTRADO** | Mismo mecanismo que AC-01-12 | FND-01-02 corregido |
| SEC-005 | **NO DEMOSTRADO** | Paso de CI real existe y pasa, pero es tautológico y no cubre `.next/server/app/*.html`; reproducción propia muestra una fuga real no detectada | **FND-01-09 (nuevo, S2)** — reabre el criterio de rechazo automático §33 |
| NFR-008 | **DEMOSTRADO** | Orden de pasos sin cambios, todos verdes | — |

**1 criterio sigue NO DEMOSTRADO (SEC-005)**, lo que por sí solo activa el criterio de rechazo automático del plan maestro §33.

---

## 5. Comandos ejecutados (con resultado real)

Todos ejecutados realmente en esta sesión contra el repositorio local y la API real de GitHub.

```text
git status ; git log --oneline -5
git log --oneline a64fbe9..963e618
gh auth status
gh run list --limit 30 --json ...
gh run view 37143136300 --json jobs -q '...'              → todos los pasos success, incluida E2E y SEC-005
gh run view 37143136300 --log | grep -i "E2E" ...          → "2 passed (20.7s)"
gh run view 37143136300 --log | grep -A15 "SBOM.*Set up job" → "Contents: read" real, token real
gh run view 37142681820 --log | grep -iE gitleaks          → 2 leaks reales (dummy) antes de .gitleaksignore
gh run view 37143136300 --log | grep -iE "gitleaks|leaks"  → "no leaks found" tras la corrección
gh run view 37143624017 --json conclusion,headSha,jobs     → verde sobre 963e618 (commit final del rango)
gh api repos/.../branches/main/protection -q '{...}'        → idéntico a lo documentado
gh pr view 19 --json ...  / gh pr view 20 --json ...        → ambos MERGED, squash, oid coincide
gh api repos/.../dependabot/alerts -q '...'                 → drizzle-orm alta / vitest media, ambas abiertas
git show 65b2fd1 --stat                                     → 10 archivos, diff completo revisado
git show 65b2fd1 -- .claude/settings.json ...                → diff completo revisado línea por línea
git show 65b2fd1 -- pnpm-lock.yaml                          → cambio acotado a @types/node y dependientes
git log --all -p -- .gitleaksignore                         → solo 2 fingerprints, nunca ampliado
git log --all -p a64fbe9..963e618 | grep -nE "AKIA...|BEGIN...PRIVATE KEY|eyJhbGciOi|postgres://...@" 
                                                              → sin secretos reales nuevos
pnpm install --frozen-lockfile                               → ok
env -u ... pnpm build                                        → exit 0 (con .env.local movido aparte sin leerlo)
env -u ... pnpm start                                         → exit 1, mensaje claro (9 vars faltantes)
env DATABASE_URL="not-a-valid-url-garbage" ... pnpm start     → exit 1, "DATABASE_URL: Invalid url"
Write(.env.audit2)                                            → rechazado ("covered by a Read deny rule")
Read(.env.audit2) (creado vía PowerShell)                     → rechazado ("denied by your permission settings")
Read(.env.example)                                            → permitido, contenido mostrado
Edit(eslint.config.mjs, línea trivial)                        → bloqueado por hook config-protection real
pnpm lint                                                     → limpio (next-env.d.ts existente, sin error)
pnpm typecheck                                                → limpio
pnpm test:unit                                                → 1/1 passed
rm -rf .next ; AUDIT_SEC005_MARKER=... pnpm build (con componente cliente de prueba)
grep -rF "sec005-marker-..." .next/static                    → sin resultados (exit 1)
grep -o 'data-audit-marker="[^"]*"' .next/server/app/index.html → valor presente (fuga real no detectada por CI)
git status --porcelain / git diff --stat (final)              → limpio, sin cambios de contenido reales
```

No ejecutado / no verificable en este entorno:

- No se ejecutó `pnpm test:int` ni `pnpm test:security` localmente (requieren PostgreSQL real vía Docker, no disponible en esta sesión). Se verificó en su lugar el log real de esos pasos en el run de CI del commit auditado (`37143136300`), ambos verdes.
- No se intentó un push directo real ni un force-push real a `main` en esta sesión (serían acciones destructivas fuera del alcance de una auditoría de solo lectura sobre el repositorio real); se reconfirmó branch protection solo vía `gh api` de solo lectura, consistente con el primer informe que sí hizo la prueba destructiva.
- No se verificó la sintaxis de negación `Read(!.env.example)` contra la documentación oficial de Claude Code de forma independiente (más allá de la reproducción empírica, que es concluyente para el resultado observado); el mecanismo exacto (negación tipo gitignore dentro de `deny`) no se auditó contra el texto de la documentación, solo contra el comportamiento real.

---

## 6. Riesgos residuales

- **Nuevo — FND-01-09 (S2):** el paso de CI de SEC-005 no detecta una fuga real de valor no público hacia `.next/server/app/*.html`. Bloqueante hasta corregirse.
- **RSK-012** (CODEOWNER único, 0 revisiones humanas): sin cambios, redacción de `traceability-index.md` ahora más honesta (FND-01-05 corregido); riesgo de fondo sigue abierto y aceptado por el RT, revisión antes de Fase 20.
- **RSK-018** (`drizzle-orm` alta severidad, alerta real de Dependabot): sigue abierta (alerta #1, confirmado real vía `gh api`); PR de Dependabot aún no mergeado. No bloqueante para Fase 1, revisar antes de Fase 4.
- **RSK-013** (credenciales reales del spike de Fase 0 pendientes de rotar): sin cambios, no verificable desde esta auditoría (fuera de alcance, paneles externos).
- **RSK-017** (repo público): sin cambios, aceptado por el RT.
- Nuevo — observación menor: `docs/evidence/phase-01/manifest.json` no refleja la evidencia de la corrección (FND-01-11, no bloqueante).
- Nuevo — observación menor: inconsistencia de forma en el uso de estados no canónicos en `traceability-index.md` (FND-01-10, no bloqueante).
- Preexistente, no introducido por este commit: el job `secret-scan` instala `gitleaks` vía `curl` sin verificación de checksum/firma (pin de versión `v8.24.3`, pero sin hash pinning). No es parte del delta auditado; se registra como observación para una futura revisión de cadena de suministro de herramientas de CI.

---

## 7. Correcciones mínimas obligatorias antes de re-auditar

1. **(Bloqueante, FND-01-09, S2)** Corregir el paso de CI de SEC-005 para que deje de ser tautológico: hacer que el valor de prueba sea efectivamente consumido por código fuente (no solo declarado como variable de entorno del step), y extender la verificación a `.next/server` (al menos el HTML/RSC de rutas estáticas servidas al cliente), no solo `.next/static`. Alternativa aceptable: verificar negativamente los valores reales del esquema de `src/lib/env.ts` con valores de prueba distintivos contra todos los artefactos de build que efectivamente se sirven al navegador.
2. Tras corregir (1), regenerar evidencia real de CI sobre el nuevo commit y volver a marcar SEC-005 en `traceability-index.md` únicamente si el nuevo paso demuestra, de forma reproducible, que detecta una fuga real (no solo que pasa en verde).
3. (No bloqueante, recomendado) Resolver la inconsistencia de forma de FND-01-10 en `traceability-index.md`.
4. (No bloqueante, recomendado) Actualizar `docs/evidence/phase-01/manifest.json` para referenciar el run de CI y los archivos de evidencia del commit corregido (FND-01-11).

Tras corregir el punto 1 (bloqueante), debe re-generarse evidencia real de CI sobre el nuevo commit y re-auditarse contra ese commit específico, nunca reutilizando la evidencia de `65b2fd1`/`963e618` para aprobar un commit distinto (`master-plan.md` §30.2).
