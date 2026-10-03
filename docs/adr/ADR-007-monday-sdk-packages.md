# ADR-007: Paquetes del SDK de monday.com

## Estado
Aprobado

## Fecha y decisores
2026-10-02 (propuesto) · 2026-10-03 (aprobado) · Analista de Fase 0 (propone) · rjpython05@gmail.com (RT, aprueba)

## Contexto
El blueprint lista `monday-sdk-js` como dependencia (§2, §11) pero el comando de instalación de §10 referencia `@monday/apps-sdk`, un paquete que **no existe** en el registro npm (verificado por búsqueda contra la documentación/ecosistema oficial vigente, octubre 2026). Además, el SDK server-side (método `api()`) incluido históricamente en `monday-sdk-js` está deprecado; monday.com recomienda `@mondaydotcomorg/api` para llamadas GraphQL desde Node.js. Ver CHG-002.

## Decisión
1. **Contexto de cliente dentro del iframe** (lectura de `accountId`, `userId`, tema, signed session token): `monday-sdk-js` (paquete client-side, vigente).
2. **Llamadas GraphQL server-side** (verificación de entitlements, consultas a la API de monday desde rutas `api/*`): `@mondaydotcomorg/api`, no el método `api()` deprecado de `monday-sdk-js`.
3. Se elimina cualquier referencia a `@monday/apps-sdk` de la documentación y del comando de instalación de Fase 1.

## Alternativas
- **Usar solo `monday-sdk-js` para todo, incluido server-side**: descartado — su SDK server-side está deprecado y será removido; construir sobre código deprecado desde el inicio es deuda técnica innecesaria evitable con información ya disponible.

## Consecuencias
- Dos dependencias de monday en `package.json` en vez de una; debe documentarse claramente en el `CLAUDE.md` del proyecto cuál se usa dónde, para evitar que una implementación futura mezcle ambas incorrectamente.

## Verificación
`pnpm install --frozen-lockfile` exitoso en Fase 1 (criterio de rechazo automático si el build falla por dependencia inexistente).

## Evidencia
Documentación oficial de monday.com (developer.monday.com, npm registry) consultada el 2026-10-02; ver fuentes citadas en `phase-00-blueprint-normalization.md` §Spikes.

## Revisión
Reevaluar si monday.com retira por completo el SDK server-side de `monday-sdk-js` (actualmente en proceso de deprecación) antes del inicio de Fase 1.
