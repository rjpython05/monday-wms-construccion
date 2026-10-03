# Informe de auditoría independiente — Fase 1: Repositorio y controles de ingeniería (3ª auditoría)

**Sesión:** Auditor IA (sesión nueva, sin contexto del implementador ni de las sesiones de la 1ª/2ª auditoría), conforme a `/docs/execution/master-plan.md` §32.4/§32.5.
**Rango auditado:** `a64fbe9b2bc5b6524f8d8480f19d97ffce4ec495..966eec5b90b8ba088214a9f275b024d2915efe35` (rama `main`).
**Commit de corrección bajo escrutinio directo:** `1194dd2802fd66f213346a3ccbe8f1b4b6adab48` ("fix: corrige FND-01-09 (SEC-005 tautológico) + FND-01-10/11 de la 2ª auditoría (#22)").
**Commit final del rango (docs):** `966eec5b90b8ba088214a9f275b024d2915efe35` (#23).
**Fecha de auditoría:** 2026-10-03.
**Repositorio real:** https://github.com/rjpython05/monday-wms-construccion (público, CHG-003).

---

## Veredicto: **APPROVE**

Los tres hallazgos de la 2ª auditoría (`auditor-report-2.md`) se verifican, de forma independiente y adversarial, como genuinamente corregidos o corregidos con un residuo no bloqueante registrado:

- **FND-01-09 (S2, bloqueante): CORREGIDO.** La corrección es sustantiva, no cosmética. Se reprodujo el defecto original (chequeo tautológico que no cubría `.next/server`), se confirmó que el nuevo mecanismo (canario real consumido por código + verificación en dos pasos) funciona contra el build real del commit auditado, y — lo más importante — se introdujo una fuga deliberada **nueva y con un vector distinto** al usado por el 2º auditor (un Server Component en una ruta anidada, no un componente `"use client"` importado desde `page.tsx`) y el chequeo de CI, tal como está escrito en el commit auditado, la detectó correctamente. El log real de CI del commit exacto (`1194dd2`, run `37145316208`) confirma que el paso corrió de verdad y produjo el resultado "OK" esperado, no solo que el YAML "se ve bien".
- **FND-01-10 (S4, no bloqueante): CORREGIDO.** `traceability-index.md` ya no usa el estado no canónico "Verificado parcialmente"; usa textualmente una de las formas que el propio 2º informe propuso como corrección aceptable.
- **FND-01-11 (S4, no bloqueante): CORREGIDO PARCIALMENTE.** `manifest.json` ahora sí referencia ambos informes de auditoría y añade una sección `auditTrail` real y precisa. Pero sigue sin actualizar `ciVerification.exampleGreenRun` (sigue apuntando al run `37140373807`, anterior a *todas* las correcciones) ni registra el SHA ni el run id reales de la corrección de SEC-005. Se registra como **FND-01-12** (nuevo, S4, no bloqueante) — ver abajo.

No hay evidencia de fabricación en el commit bajo escrutinio. Se encontró, además, una tensión de redacción no bloqueante entre la corrección de FND-01-10 y la letra literal de §33 del plan maestro, discutida en detalle en **FND-01-13** — se concluye que no debe bloquear el gate, por las razones expuestas allí, pero se recomienda una aclaración formal del RT.

No hay ningún hallazgo S1/S2 abierto ni ningún criterio de aceptación NO DEMOSTRADO en el sentido sustantivo que exige el rechazo automático del plan maestro §33 (ver discusión de AC-01-09 en FND-01-13, que es la única fila con esa etiqueta textual y corresponde a un riesgo ya aceptado explícitamente por el RT, sin cambio de sustancia desde la 1ª auditoría).

---

## 1. Verificación de FND-01-09/10/11 (hallazgos bajo escrutinio directo)

### FND-01-09 (S2) — chequeo de CI de SEC-005 tautológico — **CORREGIDO**

**Lo que se verificó, en orden:**

1. **Código del canario** (`src/app/audit-sec005-canary/page.tsx`, añadido en `1194dd2`):

   ```tsx
   export default function Sec005CanaryPage() {
     const value = process.env["AUDIT_SEC005_CANARY_VALUE"];
     if (!value) {
       return null;
     }
     return <div data-audit-canary={value} />;
   }
   ```

   Es un Server Component real que solo renderiza contenido si `AUDIT_SEC005_CANARY_VALUE` está seteado. Esa variable solo se setea en el paso "Build" del job `Pipeline` de CI (`.github/workflows/ci.yml`); no existe en Vercel. Esto resuelve la causa raíz exacta de FND-01-09: ahora **sí existe código fuente que consume el marcador**, por lo que el chequeo deja de ser tautológico.

2. **Lógica del paso de CI** (`.github/workflows/ci.yml:81-111`, diff completo revisado contra `963e618`):

   ```bash
   MARKER="sec005-canary-7f1e4b9c-must-leak-only-here"
   CANARY_PATH_PREFIX=".next/server/app/audit-sec005-canary"

   if ! grep -rlF "$MARKER" .next/static .next/server 2>/dev/null | grep -q "^${CANARY_PATH_PREFIX}"; then
     echo "::error::El canario de SEC-005 no apareció..."; exit 1
   fi
   echo "OK: el canario se detectó en su ubicación esperada..."

   LEAKS=$(grep -rlF "$MARKER" .next/static .next/server 2>/dev/null | grep -v "^${CANARY_PATH_PREFIX}" || true)
   if [ -n "$LEAKS" ]; then
     echo "::error::El valor no público apareció fuera de la ruta canario..."; exit 1
   fi
   echo "OK: ningún otro artefacto..."
   ```

   Esto responde exactamente a la pregunta pedida: primero confirma que el canario **sí** aparece donde se espera (prueba que el detector no está ciego — corrige el defecto raíz de que nada consumía el marcador anterior), y solo después confirma que el valor **no** aparece en ningún otro archivo bajo `.next/static` o `.next/server`.

3. **Reproducción local propia, build real** (`rm -rf .next && AUDIT_SEC005_CANARY_VALUE="sec005-canary-7f1e4b9c-must-leak-only-here" pnpm build`), inspeccionando la estructura real generada (sin asumir nada):

   ```
   .next/server/app/audit-sec005-canary          (directorio: page.js, page.js.nft.json, page_client-reference-manifest.js)
   .next/server/app/audit-sec005-canary.html     (HTML servido al navegador — contiene el marcador)
   .next/server/app/audit-sec005-canary.meta
   .next/server/app/audit-sec005-canary.rsc      (payload RSC — contiene el marcador)
   ```

   Esto confirma exactamente la advertencia de la tarea: Next.js genera archivos **hermanos** (`audit-sec005-canary.html`, `.rsc`) fuera de la carpeta homónima, no solo dentro de ella. El `grep -q "^${CANARY_PATH_PREFIX}"` usa un *anclaje de prefijo de string*, no un separador de ruta, por lo que coincide correctamente con `audit-sec005-canary.html` y `audit-sec005-canary.rsc` además de con el contenido de la carpeta `audit-sec005-canary/`. Ejecuté el script del workflow literalmente contra este build limpio: ambos pasos imprimieron `OK`.

4. **La prueba más importante — fuga deliberada nueva, con un vector distinto al de la 2ª auditoría.** La 2ª auditoría introdujo un componente `"use client"` importado desde `page.tsx`. Para evitar un *fix overfitted* a ese vector exacto, introduje en su lugar un **Server Component en una ruta anidada nueva** (`src/app/audit-adversarial-leak-test/sub/page.tsx`), que interpola directamente el valor del canario en el HTML sin pasar por ningún componente cliente:

   ```tsx
   export default function AdversarialLeakTestPage() {
     const value = process.env["AUDIT_SEC005_CANARY_VALUE"] ?? "no-value-set";
     return <div data-adversarial-leak={value}>leak test</div>;
   }
   ```

   Build limpio (`rm -rf .next && AUDIT_SEC005_CANARY_VALUE=... pnpm build`) con esta ruta presente. Resultado real:

   ```
   $ grep -rlF "sec005-canary-7f1e4b9c-must-leak-only-here" .next/static .next/server
   .next/server/app/audit-adversarial-leak-test/sub.html
   .next/server/app/audit-adversarial-leak-test/sub.rsc
   .next/server/app/audit-sec005-canary.html
   .next/server/app/audit-sec005-canary.rsc
   ```

   Ejecuté el script del workflow **literalmente** (copiado carácter por carácter) contra este build:

   ```
   OK: el canario se detectó en su ubicación esperada — el chequeo es capaz de detectar una fuga real
   ::error::El valor no público apareció fuera de la ruta canario (fuga real):
   .next/server/app/audit-adversarial-leak-test/sub.html
   .next/server/app/audit-adversarial-leak-test/sub.rsc
   RESULTADO FINAL DEL CHEQUEO: FAIL_STEP2_LEAK_DETECTED
   ```

   **El chequeo detectó la fuga nueva, con un vector de introducción distinto al de la 2ª auditoría.** Esto confirma que la corrección no está sobreajustada a la reproducción específica del 2º auditor; generaliza al patrón real que SEC-005 debe prevenir (cualquier valor no público que termine en cualquier HTML/RSC servido al cliente).

   **Reversión inmediata:** `src/app/audit-adversarial-leak-test/` fue eliminado por completo tras la prueba (nunca commiteado ni pusheado). `git status --porcelain` confirmado limpio salvo el ruido preexistente de normalización CRLF/LF en `src/app/audit-sec005-canary/page.tsx` (diff de contenido vacío con `--ignore-space-at-eol`, no introducido por esta sesión).

5. **Log real del run de CI del commit exacto auditado** (`1194dd2`, push run `37145316208`, job `Pipeline`, paso "Verificación real de que ningún secreto llega al cliente (SEC-005)"). No me conformé con que el YAML "se vea bien": extraje las líneas de salida *ejecutada* (no solo el volcado del script):

   ```
   2026-10-03T18:44:55.7068248Z OK: el canario se detectó en su ubicación esperada — el chequeo es capaz de detectar una fuga real
   2026-10-03T18:44:55.7100361Z OK: ningún otro artefacto servido al cliente (.next/static ni .next/server) contiene el valor no público
   ```

   Ambas líneas son salida real de ejecución (tienen timestamp de `stdout`, distintas de las líneas con el volcado sintáctico del script que GitHub Actions también imprime). El paso concluyó `success`. Todos los 24 pasos del job `Pipeline` para este run concluyeron `success` (lint, formato, tipos, unitarias, migración vacía, integración real contra PostgreSQL, seguridad placeholder, build, SEC-005, E2E, verificación de trazabilidad).

6. **Búsqueda de formas de burlar el nuevo chequeo (punto 6 de la tarea), no bloqueantes para Fase 1 pero registradas como riesgo residual:**
   - **Assets binarios/comprimidos:** confirmé que `grep -rlF` sí detecta una cadena de texto plano incluso dentro de un archivo con bytes binarios arbitrarios (prueba propia con un archivo binario sintético). El riesgo real es distinto: si un secreto terminara **codificado** (base64, gzip, un sourcemap minificado que rompe la subcadena en más de una línea sin el flag multilínea, una fuente/imagen binaria que normalmente no contendría texto) el `grep -F` de cadena exacta no lo encontraría. **Hoy esto no aplica**: inspeccioné todo `.next/static` del build real de Fase 1 y confirmé que el 100% de los artefactos son texto plano (JS/CSS/manifests); no hay imágenes, fuentes, ni rutas API (`src/app/api` no existe todavía). Es un riesgo **latente para fases futuras** (cuando aparezcan imágenes, fuentes, o compresión en el pipeline de build), no un defecto actual.
   - **Rutas anidadas/dinámicas:** confirmado arriba (paso 4) que el chequeo sí cubre una ruta anidada nueva, no solo rutas de primer nivel.
   - **`.next/server/pages`:** no existe (proyecto 100% App Router, sin Pages Router); no aplica en Fase 1.
   - **Colisión de prefijo:** el `grep -v "^${CANARY_PATH_PREFIX}"` excluye *cualquier* ruta cuyo string empiece literalmente con `.next/server/app/audit-sec005-canary` — una ruta futura con un nombre que comparta ese prefijo exacto (p. ej. `audit-sec005-canary-admin`) quedaría también excluida de la detección de fugas por coincidencia de prefijo de string, no de límite de ruta. Es un diseño frágil en el margen, pero de explotación deliberada e inverosímil por accidente dado el nombre distintivo elegido; se registra como mejora recomendada, no bloqueante.

**Conclusión FND-01-09: CORREGIDO**, de forma sustantiva y verificada de manera independiente con un vector de prueba distinto al de la auditoría que lo originó.

---

### FND-01-10 (S4) — estado no canónico "Verificado parcialmente" — **CORREGIDO**

Diff real de `docs/execution/traceability-index.md` en `1194dd2`:

```diff
-| AC-01-09 | ... | **Verificado parcialmente** — PR obligatorio/CI requerido/... |
+| AC-01-09 | ... | **NO DEMOSTRADO** (sub-cláusula "≥1 revisión humana"; resto DEMOSTRADO: ...) — riesgo aceptado explícitamente por el RT, ver RSK-012 (FND-01-05/FND-01-10, auditoría) |
```

Esta es textualmente una de las dos alternativas que el propio informe de la 2ª auditoría propuso como corrección mínima aceptable. Formalmente cumple la letra de §10.2 (solo usa uno de los 3 estados canónicos). Ver sin embargo **FND-01-13** más abajo: esta misma redacción, leída de forma literal, introduce una tensión con §33 que merece discusión explícita (no es un defecto de esta corrección en sí, sino una ambigüedad preexistente en el propio plan maestro que esta corrección hace más visible).

**Conclusión FND-01-10: CORREGIDO.**

---

### FND-01-11 (S4) — `manifest.json` no actualizado — **CORREGIDO PARCIALMENTE**

Diff real de `docs/evidence/phase-01/manifest.json` en `1194dd2`: se añadieron `auditor-report.md`/`auditor-report-2.md` a `files`, y una sección `auditTrail` nueva con `audit1`, `corrections` y `audit2`, con rangos de commit, hallazgos y nombre de rama reales (verifiqué contra `gh pr view 22` que el nombre de rama `fix/audit-fnd-01-09-sec005-real-check` es real).

Lo que **no** se corrigió:
- `ciVerification.exampleGreenRun` sigue apuntando al run `37140373807`, que es **anterior a las tres rondas de corrección** (incluida la original `6d7f25b`). Debería apuntar como mínimo al run del commit corregido actual (`1194dd2` → run `37145316208`, confirmado real y verde en esta auditoría).
- `auditTrail.corrections.commit` registra `65b2fd1 (PR #19)` (la corrección de la 1ª auditoría) pero `additionalFix` (la corrección de FND-01-09/10/11) no incluye el SHA real (`1194dd2`) ni el run id de CI que la evidencia — solo el nombre de rama.

Esto es exactamente el mismo tipo de inconsistencia de trazabilidad documental que motivó FND-01-11 originalmente, ahora desplazada un nivel: se corrigió el síntoma más visible (ausencia total de referencia a los informes de auditoría) pero no la causa de fondo (el manifiesto no se regenera automáticamente tras cada corrección, sino que se edita a mano y queda desactualizado). No bloqueante (S4), igual que su clasificación original.

**Conclusión FND-01-11: CORREGIDO PARCIALMENTE.** Se registra el residuo como **FND-01-12** (nuevo).

---

## 2. Hallazgos nuevos

### FND-01-12 — S4 (Baja, no bloqueante): `manifest.json` sigue con referencias de CI desactualizadas tras la corrección de FND-01-11

**Descripción.** Ver análisis arriba. `docs/evidence/phase-01/manifest.json:27` (`ciVerification.exampleGreenRun`) sigue apuntando al run `37140373807`, generado antes de cualquiera de las tres correcciones de esta fase. `auditTrail.corrections.additionalFix` no registra el SHA del commit de corrección (`1194dd2`) ni el run id de CI (`37145316208`) que constituye la evidencia real de que el fix funciona.

**Ubicación.** `docs/evidence/phase-01/manifest.json:14-50`.

**Por qué importa.** No afecta el gate (la evidencia correcta existe y se verificó contra CI real en este informe y en el anterior), pero perpetúa el patrón de que el manifiesto de evidencia no es una fuente confiable de "cuál es el run de CI vigente" sin cruzar manualmente contra `phase-status.md` y el historial de PRs — exactamente el tipo de brecha de trazabilidad que el plan maestro (§10, §30.2) busca prevenir.

**Corrección mínima esperada (no bloqueante).** Actualizar `ciVerification.exampleGreenRun` al run real más reciente (`37145316208` o posterior) y añadir el SHA (`1194dd2802fd66f213346a3ccbe8f1b4b6adab48`) y el run id a `auditTrail.corrections.additionalFix`.

---

### FND-01-13 — S4 (Baja, no bloqueante, informativa): tensión de redacción entre la corrección de FND-01-10 y la letra literal de §33

**Descripción.** La corrección de FND-01-10 cambia la fila de AC-01-09 en `traceability-index.md` para que empiece textualmente con "**NO DEMOSTRADO**" (seguido de la aclaración "sub-cláusula...; resto DEMOSTRADO"). Esto cumple la letra de §10.2 (solo 3 estados canónicos) siguiendo exactamente una de las dos alternativas que el propio 2º informe de auditoría propuso.

Pero el plan maestro §33 dice, sin matices adicionales en el propio texto de la regla: *"un criterio de aceptación figura como NO DEMOSTRADO"* → rechazo automático. Leído de forma estrictamente literal y fuera de contexto, la fila de AC-01-09 ahora "figura como NO DEMOSTRADO", lo que activaría el rechazo automático por la letra de la regla — a pesar de que la sustancia subyacente (branch protection real, PR obligatorio, CI requerido, sin force-push, `enforce_admins`) no ha cambiado desde la 1ª auditoría, y a pesar de que **tanto la 1ª como la 2ª auditoría, de forma independiente**, trataron esta misma situación sustantiva como un riesgo S3 ya aceptado explícitamente por el RT con dueño y fecha (RSK-012) — exactamente el mecanismo que §6 define para riesgos S3 ("Puede aprobarse solo con aceptación explícita del RT, dueño y fecha") — y no como un disparador de §33.

**Por qué no bloquea esta auditoría.** Tres razones concurrentes:
1. **Precedente de dos auditorías independientes.** Ni la 1ª ni la 2ª auditoría contaron AC-01-09 entre los criterios que activaban §33 (la 1ª sí listó explícitamente 4 criterios NO DEMOSTRADOS que lo activaban — AC-01-07, AC-01-12, SEC-004, SEC-005 — y deliberadamente no incluyó AC-01-09 en esa lista, clasificándolo aparte como "DEMOSTRADO parcialmente" con un hallazgo S3 propio, FND-01-05).
2. **No hay regresión de sustancia.** La única diferencia entre esta ronda y las dos anteriores es de redacción (consecuencia directa de corregir FND-01-10, que ambas auditorías previas pidieron corregir). Rechazar la fase precisamente *por haber corregido* un hallazgo de forma literal, cuando la sustancia no cambió y ya estaba aceptada como riesgo, sería un resultado perverso e inconsistente con el propio informe que pidió la corrección.
3. **El riesgo de fondo (RSK-012) ya satisface el mecanismo de excepción que el propio plan maestro define para S3** (dueño: RT; fecha de revisión: antes de Fase 20; mitigación documentada: el Auditor IA actúa como revisor adicional manual).

**Corrección mínima recomendada (no bloqueante, para el RT).** Formalizar en el plan maestro (§10.2 o §33) que un criterio con una sub-cláusula aceptada explícitamente como riesgo S3 (con dueño y fecha) no activa §33 por sí solo, aunque la fila use literalmente la palabra "NO DEMOSTRADO" para esa sub-cláusula — o, alternativamente, adoptar en `traceability-index.md` un formato que separe visualmente el estado del criterio compuesto completo del estado de cada sub-cláusula (p. ej. una tabla de sub-criterios), para que ninguna fila necesite elegir entre violar §10.2 (estado no canónico) o generar una lectura literal ambigua con §33. Esto es una recomendación de gobierno del propio plan maestro, no una corrección de código de Fase 1.

---

## 3. Resultados de las fallas deliberadas introducidas en esta sesión

Todas ejecutadas sobre el working tree local del commit `966eec5` (HEAD de `main`), nunca commiteadas ni pusheadas. `git status --porcelain` confirmado limpio al final (solo la advertencia preexistente de normalización CRLF/LF en `src/app/audit-sec005-canary/page.tsx`, sin diff de contenido real con `--ignore-space-at-eol`).

| # | Falla introducida | Dónde | Vector (distinto al de la 2ª auditoría) | Resultado | ¿Detectada por el chequeo de CI tal como está escrito en `1194dd2`? |
|---|---|---|---|---|---|
| 1 (reproducción de línea base) | Build limpio con `AUDIT_SEC005_CANARY_VALUE` seteado, sin fuga adicional | `rm -rf .next && pnpm build` | — | Canario aparece solo en `.next/server/app/audit-sec005-canary.{html,rsc}` y en la carpeta homónima | **Sí** — el script reporta ambos "OK", confirmando que el detector funciona y no hay falso positivo |
| 2 (nueva, propia — la más relevante) | Server Component en ruta anidada nueva (`audit-adversarial-leak-test/sub/page.tsx`) que interpola el valor del canario directamente en HTML, sin componente cliente | Ruta anidada nueva, Server Component puro (no "use client", no importado desde `page.tsx`) | Build limpio con el marcador seteado | El valor apareció en `.next/server/app/audit-adversarial-leak-test/sub.html` y `.rsc`, fuera del prefijo del canario | **Sí** — el script reporta `::error::` y el `LEAKS` lista exactamente los dos archivos nuevos |
| 3 (binario, exploratoria) | Cadena del marcador embebida en un archivo binario sintético con bytes nulos | `/tmp/binary-test.bin` | — | `grep -lF` sí detecta la cadena de texto plano dentro de contenido binario | **Sí, en este caso** — pero ver FND-01-09 punto 6: una codificación (no solo bytes binarios crudos) rompería la coincidencia exacta; no aplica hoy porque no hay assets binarios/comprimidos en el build de Fase 1 |

Reversión: prueba 1 no modificó el árbol de fuentes (solo `.next/`, regenerado). Prueba 2: `src/app/audit-adversarial-leak-test/` eliminado por completo inmediatamente después, nunca trackeado por git. Prueba 3: archivo temporal fuera del repo, eliminado. `.next/` regenerado limpio al final (`pnpm build` sin la variable del canario) para dejar el entorno local en un estado normal.

---

## 4. Tabla de criterios: demostrado vs. no demostrado (final, esta auditoría)

| Criterio | Estado | Evidencia real verificada en esta sesión | Nota |
|---|---|---|---|
| AC-01-01 | **DEMOSTRADO** | `tsconfig.json` sin cambios; `pnpm typecheck` limpio localmente sobre `966eec5` | — |
| AC-01-02 | **DEMOSTRADO** | `package.json`/`.nvmrc`/`engines` sin cambios en este delta | — |
| AC-01-03 | **DEMOSTRADO** | `pnpm lint` limpio localmente; sin cambios en este delta | — |
| AC-01-04 | **DEMOSTRADO** | Run CI real `37145316208`, todos los pasos del job `Pipeline` en success | — |
| AC-01-05 | **DEMOSTRADO** | Paso "Pruebas de integración (PostgreSQL real)" success en el run real | — |
| AC-01-06 | **DEMOSTRADO** | 6 SHA de Actions sin cambios, confirmados por grep; `sbom.permissions.contents: read` confirmado en el YAML actual | — |
| AC-01-07 | **DEMOSTRADO** | Sin cambios en este delta; `pnpm test:unit` 1/1 local | — |
| AC-01-08 | **DEMOSTRADO** | Sin cambios | — |
| AC-01-09 | **NO DEMOSTRADO** (sub-cláusula "≥1 revisión humana"; resto DEMOSTRADO) | Branch protection real reconfirmada vía `gh api` (`required_approving_review_count: 0`, idéntico a auditorías previas) | Riesgo ya aceptado por el RT (RSK-012); no activa §33 — ver FND-01-13 para el razonamiento completo |
| AC-01-10 | **DEMOSTRADO** | Sin cambios | — |
| AC-01-11 | **DEMOSTRADO** | Sin cambios | — |
| AC-01-12 | **DEMOSTRADO** | Sin cambios en este delta | — |
| SEC-001 | **DEMOSTRADO** | Log real de `1194dd2`: `gitleaks detect` → "22 commits scanned" / "no leaks found" | — |
| SEC-002 | **DEMOSTRADO** | Dependabot activo; 2 alertas reales reconfirmadas (`drizzle-orm` alta #1, `vitest` media #2, ambas abiertas); PR #10 de Dependabot abierto | RSK-018 sigue abierto, no bloqueante |
| SEC-003 | **DEMOSTRADO** | Job `sbom` success en el run real; permisos `contents: read` confirmados | — |
| SEC-004 | **DEMOSTRADO** | Sin cambios en este delta | — |
| SEC-005 | **DEMOSTRADO** | Canario real + chequeo de dos pasos; reproducido localmente con dos builds reales (línea base + fuga deliberada con vector nuevo); log real de CI del commit auditado con salida "OK" genuina en ambos pasos | **FND-01-09 corregido** — ver §1 para el detalle completo de la verificación adversarial |
| NFR-008 | **DEMOSTRADO** | Orden de los 24 pasos del job `Pipeline` en el run real coincide con el pipeline mínimo (lint→formato→tipos→unitarias→migración→integración→seguridad→build→SEC-005→E2E→trazabilidad) | — |

**0 criterios NO DEMOSTRADOS en el sentido sustantivo del §33** (la única fila con esa etiqueta textual, AC-01-09, corresponde a un riesgo S3 ya aceptado por el RT sin cambio de sustancia desde la 1ª auditoría — ver FND-01-13).

---

## 5. Comandos ejecutados (con resultado real)

Todos ejecutados realmente en esta sesión contra el repositorio local y la API real de GitHub.

```text
git status ; git log --oneline -5
git log --oneline a64fbe9..966eec5                                           → 5 commits, incluido 1194dd2
git checkout -- src/app/audit-sec005-canary/page.tsx                         → limpieza de ruido CRLF preexistente (sin diff de contenido)
git show --stat 1194dd2                                                      → 5 archivos, diff completo revisado
git show 1194dd2 -- src/app/audit-sec005-canary/page.tsx                     → código del canario revisado línea por línea
git show 1194dd2 -- .github/workflows/ci.yml                                 → lógica del chequeo de dos pasos revisada
git diff 963e618..966eec5 -- .github/workflows/ci.yml                        → confirma que el único cambio de CI en el delta es el ya revisado
git log -p 963e618..966eec5 -- .github/workflows/ci.yml | grep "^commit"     → un solo commit toca el workflow en el delta
git diff 963e618..966eec5 -- docs/execution/risks.md                        → sin cambios (vacío)
gh auth status                                                                → autenticado, rjpython05
gh pr view 22 --json ...                                                     → MERGED, mergeCommitSha=1194dd2..., squash de 1 commit
gh pr view 23 --json ...                                                     → MERGED, mergeCommitSha=966eec5...
gh pr view 21 --json ...                                                    → PR de Dependabot abierto, no relacionado
gh pr list --state all ... mergedAt>=2026-10-03T18:00:00Z                    → confirma que no hay PRs mergeados fuera de los 4 ya conocidos (#19,#20,#22,#23)
gh run list --limit 40 --json ... | select headSha==1194dd2...              → identifica el run de push real 37145316208
gh run view 37145316208 --json jobs -q '.jobs[]|{name,conclusion}'           → Pipeline/SBOM/secret-scan success; SCA "skipped" (esperado, solo corre en pull_request)
gh run view 37145316208 --json jobs -q '.jobs[]|select(name=="Pipeline")|.steps[]' → 24 pasos, todos success
gh run view 37145316208 --log | grep -i "SEC-005|canario"                    → script completo impreso + salida real "OK" en ambos pasos
gh run view 37145316208 --log | grep -iE "gitleaks|leaks found"             → "22 commits scanned" / "no leaks found" reales
gh pr view 22 --json statusCheckRollup                                       → Pipeline/SCA/secret-scan SUCCESS, SBOM skipped (esperado en PR), Vercel SUCCESS
gh pr view 22 --json headRefOid,mergeCommit,commits                          → 1 commit, headRefOid=ae531a5..., mergeCommitSha=1194dd2...
gh pr view 22 --json headRefName                                             → "fix/audit-fnd-01-09-sec005-real-check" (coincide con manifest.json)
gh api .../branches/main/protection -q '{...}'                                → idéntico a las dos auditorías previas
gh api .../dependabot/alerts -q '...'                                         → drizzle-orm alta (#1) y vitest media (#2), ambas abiertas, sin cambios
gh pr view 10 --json ...                                                     → PR de Dependabot para drizzle-orm, abierto, sin mergear
git diff 1194dd2 -- docs/execution/traceability-index.md (vía git show)      → confirma redacción exacta de AC-01-09 y SEC-005
git show 1194dd2 -- docs/evidence/phase-01/manifest.json                     → confirma qué se corrigió y qué no (FND-01-12)
pnpm lint                                                                     → limpio
pnpm typecheck                                                                → limpio (tras limpiar artefacto .next obsoleto de mi propia prueba)
pnpm test:unit                                                                → 1/1 passed
rm -rf .next ; AUDIT_SEC005_CANARY_VALUE=... pnpm build                      → build limpio real, estructura de .next/server/app inspeccionada con find/ls
grep -rF "sec005-canary-..." .next/static .next/server                      → solo en archivos del canario (línea base)
mkdir + Write src/app/audit-adversarial-leak-test/sub/page.tsx              → fixture de prueba adversarial con vector distinto al de la 2ª auditoría
rm -rf .next ; AUDIT_SEC005_CANARY_VALUE=... pnpm build (con la fuga nueva) → build real con 3 rutas
grep -rlF "sec005-canary-..." .next/static .next/server                      → 4 archivos: 2 del canario + 2 de la fuga nueva
ejecución literal del script de ci.yml sobre ese build                       → detecta la fuga nueva, exit correspondiente a fallo (FAIL_STEP2_LEAK_DETECTED)
rm -rf src/app/audit-adversarial-leak-test                                   → reversión inmediata, nunca commiteado
find .next/static -type f | xargs file                                       → confirma que todo el bundle de Fase 1 es texto plano (sin binarios/comprimidos)
printf (bytes nulos + marcador) > archivo binario sintético ; grep -lF       → confirma que grep -F sí detecta texto plano embebido en contenido binario crudo
rm -rf .next ; pnpm build (build final limpio, sin fixtures)                 → confirma estado normal del repo
git status --porcelain (final)                                                → limpio salvo ruido CRLF preexistente, sin diff de contenido real
```

No ejecutado / no verificable en este entorno:

- No se ejecutó `pnpm test:int` ni `pnpm test:security` localmente (requieren PostgreSQL real vía Docker, no disponible en esta sesión). Se verificó en su lugar el log real de esos pasos en el run de CI del commit auditado (`37145316208`), ambos `success`.
- No se ejecutó `pnpm test:e2e` localmente (requiere navegadores de Playwright, no instalados en esta sesión); se verificó el paso "E2E" del run real de CI, `success`.
- No se intentó un push directo real ni un force-push real a `main` en esta sesión (acciones destructivas fuera del alcance de una auditoría de solo lectura sobre el repositorio real); se reconfirmó branch protection solo vía `gh api` de solo lectura.
- No se investigó si existe alguna diferencia de comportamiento de `grep`/bash entre el runner real de GitHub Actions (`ubuntu-latest`) y el entorno local de esta sesión (Windows con Git Bash) más allá de confirmar que la salida real de CI (con timestamps) coincide con la salida que reproduje localmente; no hay razón para sospechar una divergencia dado que el script no usa ninguna característica específica de shell no-POSIX.

---

## 6. Riesgos residuales

- **RSK-012** (CODEOWNER único, 0 revisiones humanas): sin cambios de sustancia; redacción de `traceability-index.md` ahora dice textualmente "NO DEMOSTRADO" para la sub-cláusula — ver **FND-01-13** (nuevo, no bloqueante) sobre la tensión de esta redacción con la letra de §33. Riesgo de fondo sigue abierto y aceptado por el RT, revisión antes de Fase 20.
- **RSK-018** (`drizzle-orm` alta severidad): sigue abierta (alerta #1 reconfirmada real vía `gh api`); PR de Dependabot #10 aún no mergeado. No bloqueante para Fase 1, revisar antes de Fase 4.
- **RSK-013** (credenciales reales del spike de Fase 0 pendientes de rotar): sin cambios, no verificable desde esta auditoría (fuera de alcance, paneles externos).
- **RSK-017** (repo público): sin cambios, aceptado por el RT; gitleaks reconfirma "no leaks found" sobre todo el historial (22 commits) en el run del commit auditado.
- Nuevo — **FND-01-12** (S4, no bloqueante): `manifest.json` sigue con referencias de CI desactualizadas (`exampleGreenRun` apunta a un run anterior a todas las correcciones).
- Nuevo — **FND-01-13** (S4, no bloqueante, de gobierno): tensión de redacción entre el formato "NO DEMOSTRADO (sub-cláusula X; resto DEMOSTRADO)" y la lectura literal de §33 del plan maestro; recomendado que el RT formalice la distinción entre "criterio compuesto parcialmente aceptado como riesgo S3" y "criterio NO DEMOSTRADO en sentido pleno" en una futura revisión del plan maestro.
- Nuevo — observación no bloqueante, de diseño: el mecanismo de exclusión por prefijo de string (`grep -v "^${CANARY_PATH_PREFIX}"`) excluiría también una ruta futura hipotética cuyo nombre comparta ese prefijo exacto; de explotación inverosímil por accidente, registrado como mejora recomendada para cuando la Fase 1 deje de ser el único consumidor de este patrón.
- Nuevo — observación no bloqueante, de alcance futuro: el chequeo de SEC-005 depende de `grep -F` sobre texto plano; en fases futuras con assets binarios (imágenes, fuentes) o artefactos comprimidos, una fuga codificada no sería detectada por este mecanismo. No aplica hoy (Fase 1 no tiene tales assets, confirmado por inspección real de `.next/static`).
- Preexistente, no introducido por este commit: el job `secret-scan` instala `gitleaks` vía `curl` sin verificación de checksum/firma (pin de versión `v8.24.3`, sin hash pinning). Fuera del delta auditado; observación para una futura revisión de cadena de suministro de herramientas de CI.

---

## 7. Nota sobre §7.2 (tres rechazos consecutivos)

El plan maestro establece que "tres rechazos consecutivos de la misma fase obligan a una revisión de causa raíz del proceso... antes del cuarto intento". Esta es la 3ª auditoría y el veredicto de esta sesión es **APPROVE**, por lo que esta regla no se activa. Se deja constancia de que, de haber recomendado REJECT en esta ronda, correspondería además abrir esa revisión de causa raíz antes de cualquier 4º intento de corrección.

---

## 8. Recomendación final

**APPROVE recomendado** por este auditor independiente. Esto **no** es una aprobación de fase: conforme a `/docs/execution/master-plan.md` §7.2, la transición `READY_FOR_AUDIT → APPROVED` es exclusiva del RT humano, quien debe además confirmar los riesgos residuales aceptados (en particular RSK-012, RSK-013, RSK-017, RSK-018, ya todos con dueño y fecha) y decidir si las correcciones no bloqueantes recomendadas (FND-01-12, FND-01-13) se atienden ahora o se registran como backlog de Fase 1 para una iteración posterior sin bloquear el avance a Fase 2.

Ningún documento de estado (`phase-status.md`, `traceability-index.md`) fue modificado por esta auditoría más allá de la escritura de este informe.
