# Control de cambios

Formato según `/docs/execution/master-plan.md` §27. Registra correcciones al blueprint detectadas durante la normalización de Fase 0, porque el blueprint es anterior al plan maestro y en algunos puntos técnicos no lo cumple. Por indicación explícita del usuario en esta sesión, **el plan maestro rige sobre el blueprint**: donde haya contradicción técnica ya resuelta por el texto del plan maestro, se corrige el blueprint, no al revés.

---

```text
CHG-001
Fecha: 2026-10-02
Solicitante: Analista (Sesión de normalización de Fase 0)
Problema: El blueprint (§4, "RLS (migración raw SQL)" y "lib/db/tenant-context.ts") define
  un patrón de aislamiento multi-tenant que contradice el plan maestro §12.1 en tres puntos:
  1. La función withTenant() usa `SET LOCAL app.tenant_id = ${tenantId}` con el valor
     interpolado directamente en el string SQL, en vez de un parámetro.
  2. La política RLS de ejemplo define solo `USING`, sin `WITH CHECK` — permite leer con
     aislamiento pero no impide insertar/actualizar filas con tenant_id ajeno.
  3. `SUPABASE_SERVICE_ROLE_KEY` se documenta como variable de entorno general de la
     aplicación, describiéndose explícitamente como que "bypasea RLS" — contradice el
     mandato de que la aplicación se conecte con un rol no propietario, sin BYPASSRLS.
Justificación: El plan maestro (documento rector, §12.1) exige explícitamente
  `SELECT set_config('app.tenant_id', $1, true)` parametrizado "evita interpolar el valor
  en SQL", políticas con `USING` + `WITH CHECK`, y un rol de aplicación sin BYPASSRLS.
  El patrón del blueprint, si se implementara tal cual, sería un hallazgo de severidad
  crítica (S1) en la auditoría de Fase 4 (criterio de rechazo automático, plan maestro §33).
Impacto funcional: Ninguno — el patrón corregido es funcionalmente equivalente desde la
  perspectiva del usuario.
Impacto técnico: Afecta `src/lib/db/tenant-context.ts`, `src/lib/db/rls-policies.sql` y la
  lista de variables de entorno. Debe implementarse así desde el primer commit de Fase 4;
  no es una refactorización posterior.
Impacto en seguridad: Alto — es la corrección de la vulnerabilidad de aislamiento entre
  tenants más significativa detectada en esta normalización.
Impacto en datos y migraciones: Ninguno (Fase 4 aún no se ha implementado).
Impacto en fases aprobadas: Ninguna fase está aprobada todavía; no aplica REOPENED.
Impacto en cronograma: Ninguno — la corrección se incorpora directamente en la
  especificación de Fase 4, sin trabajo adicional.
Alternativas consideradas: Mantener el patrón del blueprint tal cual — descartada por
  violar directamente R-16/§12.1 del documento rector y constituir un criterio de rechazo
  automático de fase.
Decisión: Aprobado (2026-10-03).
Aprobado por: rjpython05@gmail.com (RT)
Fase afectada: Fase 4 (Multi-tenencia y RLS)
Documentos actualizados: docs/adr/ADR-001-tenant-context-rls-pattern.md,
  docs/architecture/threat-model.md, docs/execution/risks.md (RSK-003)
```

---

```text
CHG-002
Fecha: 2026-10-02
Solicitante: Analista (Sesión de normalización de Fase 0)
Problema: Dos imprecisiones de dependencias/secretos en el blueprint, verificadas contra
  documentación oficial vigente de monday.com (plan maestro §5: la documentación oficial
  prevalece sobre la memoria del modelo):
  1. El blueprint lista `MONDAY_SIGNING_SECRET` como el secreto usado para "verificación
     JWT de webhooks y session tokens" (§10, tabla de variables de entorno). La
     documentación oficial vigente indica que el signed session token del iframe se verifica
     con el Client Secret de la app, mientras que el Signing Secret se usa para la cabecera
     Authorization de webhooks/integración — son mecanismos y secretos distintos.
  2. El blueprint instala `@monday/apps-sdk` (paso 1, Initial Setup Commands) — este paquete
     no existe en el registro npm actual. El paquete de contexto cliente correcto es
     `monday-sdk-js`; para llamadas GraphQL server-side, el SDK server-side de
     `monday-sdk-js` está deprecado y monday.com recomienda `@mondaydotcomorg/api`.
Justificación: Implementar la verificación de sesión con el secreto incorrecto puede
  producir fallos de autenticación en producción o, en una implementación permisiva,
  aceptar tokens verificados con el secreto equivocado — ambos son defectos de seguridad
  de autenticación. El paquete inexistente bloquearía el build desde la Fase 1.
Impacto funcional: Ninguno.
Impacto técnico: Afecta `src/lib/monday/session-token.ts`, `src/lib/monday/webhook-jwt.ts`,
  la tabla de variables de entorno (se agrega `MONDAY_CLIENT_SECRET` como variable
  explícita, distinta de `MONDAY_SIGNING_SECRET`) y `package.json`.
Impacto en seguridad: Medio-alto (autenticación).
Impacto en datos y migraciones: Ninguno.
Impacto en fases aprobadas: Ninguna.
Impacto en cronograma: Ninguno.
Alternativas consideradas: Confiar en la memoria del modelo sin verificar — descartada
  explícitamente por el plan maestro §5.
Decisión: Aprobado (2026-10-03).
Aprobado por: rjpython05@gmail.com (RT)
Fase afectada: Fase 1 (dependencias), Fase 3 (autenticación)
Documentos actualizados: docs/adr/ADR-007-monday-sdk-packages.md,
  docs/adr/ADR-008-monday-secrets-separation.md, docs/execution/risks.md (RSK-002, RSK-009)
```

---

```text
CHG-003
Fecha: 2026-10-03
Solicitante: Implementador (sesión de implementación de Fase 1)
Problema: La Ambigüedad 2 del análisis de Fase 1 (ver phase-01-engineering-controls.md §5)
  había resuelto repositorio privado en GitHub. Al intentar activar branch protection en
  `main` (AC-01-09) se verificó en vivo contra la API real de GitHub (no memoria, plan
  maestro §5) que tanto el branch protection clásico como el sistema de rulesets devuelven
  403 "Upgrade to GitHub Pro or make this repository public to enable this feature" para
  repos privados de cuenta individual en el plan gratuito.
Justificación: Se presentaron 3 opciones al RT (actualizar a GitHub Pro, hacer el repo
  público, u omitir branch protection documentando el riesgo). El RT eligió explícitamente
  hacer el repositorio público para evitar el costo de GitHub Pro y conservar branch
  protection real y verificable.
Impacto funcional: Ninguno.
Impacto técnico: Visibilidad del repositorio `rjpython05/monday-wms-construccion` cambiada
  de privado a público. Branch protection (required status checks: Pipeline, Escaneo de
  secretos, Auditoría de dependencias; PR obligatorio; sin force-push; sin borrado) aplicada
  y verificada con un intento real de push directo, rechazado por GitHub (GH006).
Impacto en seguridad: Medio — el repositorio (documentación de gobierno, ADRs, reglas de
  negocio, arquitectura) queda visible públicamente. Se confirmó que no contiene secretos
  reales (escaneado con gitleaks en CI, ver job "Escaneo de secretos"). No cambia la
  exigencia de nunca commitear credenciales reales (invariante #17 de CLAUDE.md).
Impacto en datos y migraciones: Ninguno.
Impacto en fases aprobadas: Ninguna fase está `APPROVED` todavía salvo Fase 0 (no afectada).
Impacto en cronograma: Ninguno.
Alternativas consideradas: GitHub Pro (descartada por costo, decisión del RT); omitir branch
  protection (descartada, el RT prefirió mantener el control técnico real).
Decisión: Aprobado (2026-10-03).
Aprobado por: rjpython05@gmail.com (RT)
Fase afectada: Fase 1 (Repositorio y controles de ingeniería)
Documentos actualizados: docs/phases/phase-01-engineering-controls.md (§5, Ambigüedad 2),
  docs/execution/risks.md (nuevo riesgo de exposición pública), docs/execution/phase-status.md
```
