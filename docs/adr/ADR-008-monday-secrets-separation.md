# ADR-008: Separación de secretos — Client Secret vs. Signing Secret

## Estado
Aprobado

## Fecha y decisores
2026-10-02 (propuesto) · 2026-10-03 (aprobado) · Analista de Fase 0 (propone) · rjpython05@gmail.com (RT, aprueba)

## Contexto
El blueprint (§10) documenta un único secreto, `MONDAY_SIGNING_SECRET`, descrito como usado para "verificación JWT de webhooks y session tokens". La documentación oficial vigente de monday.com (verificada el 2026-10-02) indica que son mecanismos distintos: el signed session token que monday inyecta en el contexto del iframe se verifica con el **Client Secret** de la app (`jwt.verify(token, CLIENT_SECRET)`); la cabecera `Authorization` de webhooks/peticiones de integración se verifica con el **Signing Secret**. Ver CHG-002, RSK-002.

## Decisión
1. Se definen dos variables de entorno distintas: `MONDAY_CLIENT_SECRET` (verificación de session tokens, `src/lib/monday/session-token.ts`) y `MONDAY_SIGNING_SECRET` (verificación de webhooks/Authorization header, `src/lib/monday/webhook-jwt.ts`).
2. Cada verificador rechaza explícitamente un token válido pero firmado con el secreto equivocado (no basta con que `jwt.verify` no lance excepción con *algún* secreto probado; se usa el secreto correspondiente exacto a cada mecanismo, sin fallback entre ambos).
3. Ambos secretos se obtienen de Basic Information en el Developer Center de monday.com, se almacenan solo server-side y nunca se registran en logs (§18.1 del plan maestro).
4. Se verifica explícitamente el algoritmo esperado (`HS256`) y se rechaza `alg: none` u otro algoritmo no permitido, en ambos verificadores (ya exigido por §13 del plan maestro, aquí se aplica a los dos secretos por separado).

## Alternativas
- **Intentar verificar con ambos secretos y aceptar si alguno funciona**: descartada explícitamente — debilitaría la garantía de que un session token nunca sea aceptado como si fuera un webhook válido (caso obligatorio de Fase 3: "Webhook usado como sesión → rechazado").

## Consecuencias
- Dos secretos a gestionar y rotar (ver §20 del plan maestro, rotación de secretos) en vez de uno; debe documentarse en el runbook de rotación cuál verificador usa cuál.

## Verificación
Casos obligatorios de Fase 3 (ya en `CLAUDE.md`/plan maestro): "Webhook usado como sesión → rechazado", "Sesión usada como webhook → rechazada" — estas pruebas deben construirse firmando deliberadamente con el secreto incorrecto y verificando el rechazo.

## Evidencia
Documentación oficial de monday.com (developer.monday.com/apps/docs/integration-authorization, developer.monday.com/apps/docs/authorization-header) consultada el 2026-10-02; ver fuentes citadas en `phase-00-blueprint-normalization.md` §Spikes.

## Revisión
Reevaluar si monday.com unifica el mecanismo de firma en una futura versión de su plataforma de apps.

## Addendum (verificación empírica 2026-10-03)
Spike real ejecutado contra una app instalada: un signed session token real, verificado con `MONDAY_CLIENT_SECRET`, resultó válido (`{"valid":true,"claims":{"exp":...}}`). Se confirma el patrón de este ADR para session tokens. **Hallazgo adicional**: el JWT del session token real no incluye `accountId`/`userId` como claims — solo `exp`/`iat`. La Fase 3 debe leer `accountId`/`userId` del contexto del SDK (`monday.get('context')`), no del payload del session token; el session token solo sirve para probar legitimidad y vigencia de la sesión.

## Corrección (2026-10-03): webhooks de ciclo de vida de la app también usan Client Secret
Contrario a lo asumido originalmente en este ADR (que generalizaba "webhooks → Signing Secret"), la documentación oficial (`developer.monday.com/apps/docs/webhooks-1`) y la verificación empírica confirman que **los webhooks de ciclo de vida de la app** (eventos `install`, `uninstall`, `app_subscription_*`, configurados en Developer Center → Crear → Webhooks → "Webhook de eventos de aplicación") se firman con el **Client Secret**, igual que los session tokens — NO con el Signing Secret. El Signing Secret aplica a webhooks de board/integración (creados vía API, no al webhook de eventos de aplicación del Developer Center). Confirmado con eventos reales `install`/`uninstall` verificados exitosamente con `MONDAY_CLIENT_SECRET`. La Fase 3 debe implementar dos verificadores distintos según el origen del webhook: ciclo de vida de la app → Client Secret; webhooks de board/integración → Signing Secret.
