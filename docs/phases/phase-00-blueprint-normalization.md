# Fase 0: Normalización del blueprint y spikes de viabilidad

## Estado
**APPROVED** (2026-10-03, por el RT). Las 16 ambigüedades de negocio están resueltas (§5), la matriz RBAC está aprobada por el PO, los 8 ADR + 2 CHG están ratificados por el RT, y los 5 spikes de viabilidad fueron ejecutados con evidencia real contra infraestructura real (Supabase, Vercel, monday.com Developer Center) — ver §6. Riesgo residual aceptado: confirmar `getUserMedia()` en un dispositivo móvil real antes de iniciar la Fase 16 (no bloqueante para el resto del proyecto). **Esta aprobación habilita el inicio de la Fase 1** (Repositorio y controles de ingeniería). Formato de análisis según `/docs/execution/master-plan.md` §32.2.

## Metadatos
Versión 1 · Responsable: RT (pendiente de asignar formalmente) · Revisión: RT + PO (🔒 según mapa de fases) · Fecha de este análisis: 2026-10-02

---

## 1. Estado actual del repositorio relevante para la fase

```text
/CLAUDE.md                                    — creado
/docs/execution/master-plan.md                — copia íntegra del documento rector
/docs/execution/phase-status.md               — tabla de estado de las 23 fases
/docs/execution/risks.md                      — creado en esta sesión
/docs/execution/change-control.md             — creado en esta sesión (CHG-001, CHG-002)
/docs/execution/decisions.md                  — índice de ADR, creado en esta sesión
/docs/adr/ADR-001..008-*.md                   — creados en esta sesión, todos "Propuesto"
/docs/product/glossary.md                     — creado en esta sesión
/docs/product/scope.md                        — creado en esta sesión
/docs/product/business-rules.md               — creado en esta sesión
/docs/product/state-machines.md               — creado en esta sesión
/docs/product/roles-and-permissions.md        — creado en esta sesión
/docs/product/non-functional-requirements.md  — creado en esta sesión
/docs/architecture/threat-model.md            — creado en esta sesión (inicial)
/monday-wms-construccion-blueprint.md         — sin cambios (documento fuente, no normativo por sí solo)
```

No existe código de producto (`src/`), no existe `package.json`, no existe repositorio git inicializado (confirmado: "Is a git repository: false"). La Fase 1 (controles de ingeniería) no ha comenzado. Esto es coherente con el estado `NOT_STARTED`/`IN_ANALYSIS` de todas las fases.

## 2. Verificación de dependencias

La Fase 0 no depende de ninguna otra fase (raíz del grafo). No aplica verificación de dependencias previas.

## 3. Hallazgos de verificación: blueprint vs. plan maestro

El usuario indicó explícitamente que el plan maestro **rige** sobre el blueprint. Se compararon ambos documentos y se encontraron contradicciones técnicas concretas, ya corregidas documentalmente (ADR + CHG) en esta sesión:

| ID | Hallazgo | Severidad (si llegara a código) | Resuelto en |
|---|---|---|---|
| FND-00-01 | `withTenant()` del blueprint interpola el `tenantId` directamente en el SQL de `SET LOCAL`, en vez de usar `set_config(..., true)` parametrizado como exige §12.1 del plan maestro. | S1 potencial (criterio de rechazo automático §33 si se implementa así) | CHG-001, ADR-001 |
| FND-00-02 | La política RLS de ejemplo del blueprint define solo `USING`, sin `WITH CHECK` — permitiría insertar filas con `tenant_id` de otro tenant. | S1 potencial | CHG-001, ADR-001 |
| FND-00-03 | El blueprint documenta `SUPABASE_SERVICE_ROLE_KEY` como variable general de la app, señalando que "bypasea RLS" — contradice el mandato de rol de aplicación sin `BYPASSRLS` (§12.1). | S1 potencial si se usara en el camino tenant-scoped | CHG-001, ADR-001 |
| FND-00-04 | El blueprint conflaciona el secreto de verificación de session tokens con el de webhooks bajo una sola variable `MONDAY_SIGNING_SECRET`. La documentación oficial vigente de monday.com distingue Client Secret (session tokens) de Signing Secret (webhooks/Authorization header). | S2 potencial (fallo de autenticación o verificación laxa) | CHG-002, ADR-008 |
| FND-00-05 | El blueprint referencia el paquete npm `@monday/apps-sdk`, que no existe en el registro actual; además el SDK server-side de `monday-sdk-js` está deprecado. | Bloquea build (Fase 1) si no se corrige | CHG-002, ADR-007 |
| FND-00-06 | El blueprint no define `lock_timeout`/`statement_timeout`/`idle_in_transaction_session_timeout` en el rol de aplicación, exigidos por §2 y §15.2 del plan maestro. | Gap, no contradicción — a incorporar en la especificación de Fase 2 | Pendiente de incorporar en phase-02 |
| FND-00-07 | El blueprint no define modo de redondeo ni punto de redondeo para los cálculos decimales, exigido por §14.1. | Gap | ADR-002 (propuesto) |
| FND-00-08 | El blueprint no define "sin huecos" vs. huecos permitidos en la numeración de documentos (PO-0001), exigido por §14.4. | Gap, además de una pregunta de negocio (ambigüedad #16) | Ambigüedad #16 |

**Conclusión de esta sección:** no se encontró ninguna contradicción de alcance o de modelo de datos entre blueprint y plan maestro — las contradicciones son todas de implementación técnica de seguridad/aislamiento, ya resueltas documentalmente a favor del plan maestro (como indicó el usuario), y quedan pendientes de **ratificación formal del RT** (ningún ADR se autoaprueba, R-20).

## 4. Requisitos exactos de la fase (según el plan maestro, Fase 0)

| Entregable exigido por el gate | Estado en esta sesión |
|---|---|
| Lista cerrada de decisiones críticas, con referencia | **No cerrada** — 16 ambigüedades bloqueantes listadas en §5, ninguna puede cerrarse sin el PO (R-06) |
| Estados y transiciones definidos, incluidas las prohibidas | Entregado: `docs/product/state-machines.md` |
| Matriz RBAC y SoD aprobada por el PO | Entregado el borrador: `docs/product/roles-and-permissions.md` — **aprobación del PO pendiente** |
| MVP separado de mejoras posteriores | Entregado: `docs/product/scope.md` |
| NFR confirmados con valores numéricos | Entregado parcialmente: `docs/product/non-functional-requirements.md` — volumetría pendiente (ambigüedad #15) |
| Spikes de monday completados, ninguna capacidad crítica sin confirmar | **Parcialmente completados** — ver §6. Ninguno de los spikes que requieren una app instalada y backend desplegado pudo ejecutarse en esta sesión. |
| Modelo de amenazas inicial y registro de riesgos creados | Entregado: `docs/architecture/threat-model.md`, `docs/execution/risks.md` |
| ADR fundacionales aprobados | Entregados como **Propuesto** (8 ADR) — aprobación del RT pendiente |

## 5. Ambigüedades bloqueantes (R-08: entrega agrupada, sin decidir por el PO)

**Actualización 2026-10-03.** El PO autorizó explícitamente en sesión que el Analista resuelva las ambigüedades usando las recomendaciones propuestas, reservándose las que requerían información que solo el PO tiene. Resultado: **13 de 16 decididas** por el Analista bajo esa autorización, y **las 3 restantes respondidas directamente por el PO** en esta misma sesión:
- **#10 (fuente de FX):** manual, ingresada por el usuario en cada recepción — sin integración externa.
- **#15 (volumetría de diseño):** placeholder pequeño confirmado (500 SKUs, 50 ubicaciones, 200 mov/día, 10 usuarios concurrentes, 50 tenants a 12 meses).
- **#16b (numeración fiscal):** no aplica régimen fiscal especial; numeración secuencial simple por tenant.

**Las 16 ambigüedades de negocio de la Fase 0 están cerradas.** Todas incorporadas ya en `business-rules.md`, `state-machines.md` y `non-functional-requirements.md`.

Cada una indica impacto, opciones y la decisión adoptada o pendiente.

1. **[DECIDIDO 2026-10-03] Selección de consumo de lotes (FIFO/FEFO/manual) por tipo de ítem.** Impacto: motor de costeo de Fase 11, valorización, UX de despacho. Opciones: (a) FEFO si el ítem tiene `expiry_date`, FIFO si no, con override manual registrado; (b) configurable por ítem; (c) siempre manual con sugerencia. Recomendación: (a).

2. **[DECIDIDO 2026-10-03] Devoluciones** (a proveedor y desde obra/centro de costo). Impacto: nuevo tipo de movimiento de ledger, afecta ATP y valorización; no modelado en el blueprint. Opciones: (a) tipos de transacción explícitos `devolucion_proveedor`/`devolucion_obra`; (b) reutilizar el tipo `ajuste` genérico. Recomendación: (a), por trazabilidad y reportes.

3. **[DECIDIDO 2026-10-03] Transferencias: directas vs. con estado "en tránsito".** Impacto: diseño de datos de Fase 12 (ubicación virtual). Opciones: (a) siempre en tránsito; (b) directa si es inmediata, en tránsito si cruza almacenes distantes; (c) configurable por tenant. Recomendación: (b) como default, con (a) disponible por configuración.

4. **[DECIDIDO 2026-10-03] Correcciones del ledger: quién puede emitirlas.** Impacto: SoD de Fase 8. Opciones: (a) permiso atómico nuevo `ledger.correct`, restringido a Admin de Almacén/Contabilidad; (b) cualquier rol con permiso de ajuste estándar. Recomendación: (a).

5. **[DECIDIDO 2026-10-03] Cancelaciones después de aprobación o despacho parcial** (PO y Requisition). Impacto: máquinas de estado de Fase 9–11 (ver `state-machines.md`, transiciones marcadas PENDIENTE). Opciones: (a) no permitir, solo "cerrar" el remanente; (b) permitir cancelar el remanente liberando la reserva, con motivo obligatorio. Recomendación: (b).

6. **[DECIDIDO 2026-10-03] Sobrantes y sobre-recepción (tolerancia).** Impacto: Fase 9. Opciones: (a) tolerancia porcentual configurable por tenant que no requiere aprobación extra, exceso bloquea; (b) cualquier exceso bloquea siempre. Recomendación: (a).

7. **[DECIDIDO 2026-10-03] Cantidades fraccionarias, escalas, redondeo y residuos de negocio** (distinto del redondeo contable de ADR-002). Impacto: Fase 7 (catálogo), Fase 9 (conversiones). Opciones: habilitar fracciones por ítem vía atributo de configuración. Recomendación: modelarlo como atributo de `Item` (`allows_fractional: boolean`); no bloquea Fase 0, puede resolverse en la especificación de Fase 7.

8. **[DECIDIDO 2026-10-03] Diferencias de recepción fuera de tolerancia.** Impacto: Fase 9. Opciones: (a) bloquear recepción y exigir excepción aprobada; (b) recibir y marcar la línea como "con discrepancia" para revisión posterior. Recomendación: (b), para no bloquear la operación de campo.

9. **[DECIDIDO 2026-10-03] Lotes rechazados o en cuarentena: flujo de decisión posterior** (devolver, destruir, reclasificar). Impacto: Fase 9/11, `state-machines.md`. Opciones: (a) cuarentena solo bloquea ATP sin flujo formal (simplificado para MVP); (b) flujo formal con permiso `lot.quarantine.release`. Recomendación: (b), ya reflejado en `roles-and-permissions.md`, pero puede simplificarse a (a) si el PO prioriza velocidad de entrega.

10. **[DECIDIDO 2026-10-03, por el PO] Fuente, vigencia y corrección de tasas de cambio.** Decisión: tasa manual ingresada por el usuario en cada recepción, sin integración con fuente externa (BR-PUR-007).

11. **[DECIDIDO 2026-10-03] Política de stock negativo.** Impacto: crítico — invariante I-7 del ledger, Fase 8. Opciones: (a) prohibido siempre, por constraint de base; (b) permitido solo para tipos de ítem marcados explícitamente, con alerta. Recomendación: (a) como default seguro para construcción.

12. **[DECIDIDO 2026-10-03] Vencimiento de reservas ATP.** Impacto: Fase 10. Opciones: (a) sin vencimiento; (b) TTL configurable (p. ej. 72 h) liberado por job idempotente. Recomendación: (b).

13. **[DECIDIDO 2026-10-03] Retención y purga de datos tras desinstalación.** Impacto: Fase 3/19, cumplimiento de privacidad. Opciones: 30, 60 o 90 días (rango que el propio blueprint deja abierto). Recomendación: 30 días (más protector de privacidad).

14. **[DECIDIDO 2026-10-03] Capacidades por plan comercial y comportamiento ante fallo de verificación de entitlement.** Impacto: Fase 18. La dirección general (degradación a solo-lectura, no fail-closed total) ya está fijada por el gate de Fase 18 del plan maestro; falta el detalle operativo. Opciones de TTL de cache: 5, 15 o 30 minutos. Recomendación: 15 minutos, invalidado antes por webhook de cambio de plan.

15. **[DECIDIDO 2026-10-03, por el PO] Volumetría de diseño.** Confirmado el placeholder pequeño: 500 SKUs, 50 ubicaciones, 200 movimientos/día, 10 usuarios concurrentes por tenant, 50 tenants a 12 meses (tabla en `non-functional-requirements.md`).

16. **[DECIDIDO 2026-10-03] Normalización exacta de SKU y numeración de documentos.** 16a Normalización: mayúsculas + trim + solo alfanumérico y guiones (BR-CAT-003). 16b Numeración fiscal (decidido por el PO): no aplica régimen fiscal especial; numeración secuencial simple por tenant (BR-PUR-008).

## 6. Resultados de los spikes de viabilidad

Según lo exige la Fase 0 del plan maestro, "verificado contra documentación oficial vigente, no contra suposiciones" (§5). Se ejecutó investigación documental (WebSearch) contra fuentes oficiales de monday.com el 2026-10-02. **Ningún spike que requiera una app instalada, un backend desplegado o una base de datos con pooler real pudo ejecutarse en esta sesión** — se reporta explícitamente como NO EJECUTADO, conforme a R-15.

| Spike | Resultado | Estado |
|---|---|---|
| Existencia y comportamiento del feature "Custom Object" | Confirmado vigente: permite que una vista viva independiente en el menú lateral, a pantalla completa, sin atarse a un board. Fuente: developer.monday.com/apps/docs/custom-objects | **Verificado documentalmente** |
| Mecanismo de verificación del signed session token | Confirmado: se firma y verifica con el **Client Secret** de la app (`jwt.verify(token, CLIENT_SECRET)`), distinto del Signing Secret. Blueprint corregido vía ADR-008/CHG-002. Fuente: developer.monday.com/apps/docs/integration-authorization, comunidad de desarrolladores de monday | **Verificado documentalmente**; prueba de ejecución real **NO EJECUTADA** (requiere app registrada) |
| Mecanismo de verificación de webhooks | Confirmado: JWT (HS256) en cabecera `Authorization`, firmado con el Signing Secret; no es HMAC sobre el body (coincide con lo que ya afirmaba el blueprint). Fuente: developer.monday.com/apps/docs/integration-authorization | **Verificado documentalmente**; prueba real **NO EJECUTADA** |
| Requisito de monetización nativa obligatoria desde jul-2024 | Confirmado: aplica a apps nuevas sometidas al Marketplace desde el 1 de julio de 2024. Coincide con el blueprint. Fuente: developer.monday.com/apps/changelog/new-monetization-requirements-for-marketplace-approval | **Verificado documentalmente** |
| Comportamiento real de `apps_monetization_info` ante cuenta sin suscripción | No ejecutado | **NO EJECUTADO** — requiere app instalada en una cuenta de prueba |
| Restricciones de cámara en el iframe (`getUserMedia`) | Documentado un riesgo real: el frame que embebe la app debe recibir el permiso (`allow="camera"` / Permissions-Policy) desde quien lo embebe — en este caso, monday.com. Existe un bug conocido y documentado para apps de **Item View** en iOS WKWebView; no hay confirmación específica para **Custom Object** (el feature elegido). Registrado como RSK-001. Fuentes: blog.addpipe.com, MDN Permissions-Policy, community.monday.com | **Parcialmente verificado**; prueba real con Custom Object **NO EJECUTADA** |
| Límites de API (complejidad, tasa) | Confirmado: presupuesto de complejidad de 5M puntos/minuto para tokens de app, ventana deslizante de 60s, límites adicionales por IP/concurrencia/llamadas diarias. Fuente: developer.monday.com/api-reference/docs/rate-limits | **Verificado documentalmente** |
| Paquetes del SDK (`monday-sdk-js` vs. paquete inexistente del blueprint) | Confirmado: `monday-sdk-js` vigente para cliente, SDK server-side deprecado; `@mondaydotcomorg/api` es el reemplazo recomendado para GraphQL server-side. `@monday/apps-sdk` no existe. Corregido vía ADR-007/CHG-002. Fuente: npmjs.com, github.com/mondaycom/monday-sdk-js | **Verificado documentalmente** |
| Compatibilidad de `set_config(..., true)` con el pooler de Supabase en modo transacción, bajo concurrencia real | **EJECUTADO** | **EJECUTADO 2026-10-03** — `node scripts/tenant-pooler-test.mjs` contra el proyecto real `monday-wms-construccion` (us-east-1, Postgres 17): 200 transacciones concurrentes alternando 2 tenants, 0 fugas de contexto detectadas. RSK-004 cerrado. |

**Actualización 2026-10-03 — código de spikes listo y verificado localmente.** El código desechable de los 5 spikes vive en `/spikes/phase-00-viability/` (fuera de `main`, fuera del futuro repo de producto). Antes de depender de él, se ejecutó una verificación local real (sin datos de monday.com, con secretos simulados) del módulo que verifica signed session tokens (`api/verify-session-token.js`):

```text
$ node -e "... jwt.sign/verify con CLIENT_SECRET y SIGNING_SECRET simulados ..."
OK caso 1 (secreto correcto): claims = {"accountId":"123","userId":"456",...}
OK caso 2 (secreto incorrecto rechazado correctamente): invalid signature
OK caso 3 (alg=none rechazado): jwt signature is required
```

Esto confirma que la **lógica** de ADR-008 (rechazar el secreto cruzado, rechazar `alg=none`) está correctamente implementada. **Actualización 2026-10-03 (continuación).** La app `wms-spike-fase0` fue creada en el Developer Center de monday.com (cuenta de la organización real del propietario del proyecto, App ID 12300475), con el feature Custom Object. El spike se desplegó en Vercel: **https://phase-00-viability.vercel.app** (proyecto `punto-shop/phase-00-viability`). Se confirmó end-to-end que `MONDAY_CLIENT_SECRET` subido a Vercel coincide con el real: un JWT firmado localmente con el secreto real fue verificado correctamente por la función desplegada (`{"valid":true,...}`). Esto confirma que el despliegue está listo para la prueba real; **aún falta**: configurar la URL del Custom Object en el Developer Center apuntando a esta URL, instalar la app en una cuenta, y abrir el Custom Object para generar un signed session token real desde dentro del iframe (en vez del JWT sintético usado para esta verificación de despliegue).

**Actualización 2026-10-03 (resultado real) — app instalada y Custom Object abierto dentro de monday.com.**

La app `wms-spike-fase0` fue instalada en una cuenta real de monday.com (vía el link de instalación oficial, `response_type=install`) y el Custom Object se abrió dentro del iframe real. Resultado real capturado de la página:

```json
{
  "account": { "id": "37172166" },
  "user": { "id": "118448551", "isAdmin": true, "countryCode": "DO" },
  "appFeature": { "type": "AppFeatureObject", "name": "Object función" },
  "appVersion": { "status": "live" }
}
```

**Spike de signed session token — EJECUTADO, resultado real:**
```json
{ "valid": true, "claims": { "exp": 1791087382 }, "note": "Verificado con MONDAY_CLIENT_SECRET..." }
```
Confirma ADR-008 (el session token se verifica con `MONDAY_CLIENT_SECRET`) contra un token real emitido por monday.com. **Hallazgo nuevo**: el JWT del session token real **no** trae `accountId`/`userId` como claims propios (solo `exp`/`iat`); esos datos se obtienen del contexto del SDK (`monday.get('context')`), no del payload del token. La especificación de Fase 3 debe reflejar esto: el session token prueba *que la sesión es legítima y vigente*, no es la fuente de `accountId`/`userId` — esos se leen del contexto ya autenticado por el SDK dentro del iframe.

**Spike de cámara (RSK-001) — EJECUTADO, resultado real:** `getUserMedia()` se activó correctamente dentro del iframe del Custom Object en navegador de escritorio. RSK-001 cerrado para desktop; queda pendiente confirmar en un dispositivo móvil real antes de Fase 16.

**Spike de webhook de ciclo de vida — EJECUTADO, resultado real (tras corrección).** Causa raíz de los intentos fallidos anteriores: (a) la URL del webhook quedó guardada en una versión de la app que no era la "live" realmente activa — fue necesario crear una nueva versión, agregar la URL ahí, y publicarla explícitamente; (b) el código de verificación usaba `MONDAY_SIGNING_SECRET`, pero la documentación oficial (`developer.monday.com/apps/docs/webhooks-1`) confirma que los webhooks de **ciclo de vida de la app** (install/uninstall/subscription) se firman con el **Client Secret**, no el Signing Secret (distinto de los webhooks de board/integración). Tras corregir ambos puntos y redesplegar, se recibieron y verificaron correctamente dos eventos reales:

```
uninstall → verified: true, verifiedWith: 'client_secret'
  data: {"app_id":12300475,"account_id":37172166,"account_name":"rjpython05's Team",
         "user_id":118448551,"user_email":"rjpython05@gmail.com","user_country":"DO",
         "version_data":{"major":1,"minor":3,"patch":0,"number":4,"type":"minor"},
         "timestamp":"2026-10-03T12:34:50.816+00:00"}
install   → verified: true, verifiedWith: 'client_secret'
```

**Correcciones confirmadas para Fase 3** (actualizar `ADR-008` y la especificación): (1) los webhooks de ciclo de vida se verifican con `MONDAY_CLIENT_SECRET`, igual que los session tokens — NO con `MONDAY_SIGNING_SECRET`; (2) el formato real del payload es plano: `{type, data: {app_id, app_name, user_id, user_email, user_name, user_cluster, account_tier, account_max_users, account_id, account_name, account_slug, version_data, timestamp, user_country}}`, sin anidar bajo "event"; (3) cualquier cambio a la configuración de webhooks de una app con versión "live" requiere crear y publicar una nueva versión — no es editable in-place sobre la versión activa.

**Spike de monetización — EJECUTADO, resultado real:**
```json
{ "apps_monetization_info": { "seats_count": 1 }, "app_subscription": null }
```
con error `USER_UNAUTHORIZED` (403) en `app_subscription`. **Hallazgos para Fase 18:**
1. El modelo de datos de monetización cambió respecto al blueprint: `AppsMonetizationInfo` (versión de API 2025-10) solo expone `seats_count`; ya no existe la estructura anidada `subscription.{plan_id, is_trial, days_left}` que asumía el blueprint colgando de ese mismo tipo.
2. Los detalles de plan/suscripción viven en un campo separado, `app_subscription` (`plan_id`, `is_trial`, `days_left`, `billing_period`, `max_units`, `renewal_date`, `pricing_version`), confirmado por introspección real del schema.
3. **Un token personal de API no tiene autorización para leer `app_subscription`** (403 `USER_UNAUTHORIZED`). La verificación de entitlement de Fase 18 debe usar el token de acceso propio de la app (obtenido vía OAuth en la instalación), no un token personal — esto debe quedar explícito en la especificación de Fase 18 y en `lib/monday/entitlements.ts`.

**Ninguna capacidad crítica fue descartada por los spikes documentales** (no se encontró evidencia de que monday.com no soporte algo que el blueprint asume). El único riesgo elevado a seguimiento activo es la cámara en iframe (RSK-001), que no bloquea el MVP porque el escaneo con lector HID ya está previsto como alternativa en la Fase 16.

## 7. Riesgos identificados

Ver `/docs/execution/risks.md` (RSK-001 a RSK-009). Ninguno tiene exposición que, por sí sola, detenga el proyecto según §35 del plan maestro; RSK-005 (ambigüedades de negocio sin cerrar) tiene la exposición más alta (16) y es la razón del estado `BLOCKED` de esta fase.

## 8. Amenazas nuevas para threat-model.md

Incorporadas directamente en `/docs/architecture/threat-model.md` (primera versión, por ser Fase 0). Se actualizará en cada fase siguiente conforme añada superficie (plan maestro §24.3).

## 9. Plan mínimo de tareas restantes para cerrar la Fase 0

Las 16 ambigüedades de negocio están resueltas (§5), la matriz RBAC está aprobada y los 8 ADR + 2 CHG están ratificados (2026-10-03). Resta una única categoría de trabajo, y es de ejecución real, no documental:

1. **[RT, requiere cuenta de Developer Center de monday.com y un entorno mínimo desplegado]** Ejecutar los spikes marcados `NO EJECUTADO` en §6:
   - Verificación real de un signed session token contra un backend desplegado.
   - Recepción y verificación real de un webhook de ciclo de vida (instalación/desinstalación).
   - Confirmación de que el Custom Object permite `getUserMedia()` (cámara) en un dispositivo real.
   - Llamada real a `apps_monetization_info` contra una cuenta sin suscripción activa.
   - ~~Prueba de concurrencia real de `set_config('app.tenant_id', $1, true)` con el pooler de Supabase en modo transacción~~ — **EJECUTADO 2026-10-03** (ver §6).
2. **[RT]** Registrar el resultado de cada spike en este documento (§6) y en `risks.md` (cerrar o ajustar RSK-001, RSK-004). Si algún spike falla, aplica el criterio de parada §35.7 del plan maestro ("monday.com no admite una capacidad fundamental asumida") antes de continuar.
3. **[RT]** Marcar la Fase 0 como `APPROVED` en `phase-status.md` solo cuando los puntos 1–2 estén completos, habilitando el inicio de la Fase 1.

## 10. Archivos creados en esta sesión

Todos los listados en §1 bajo "creado en esta sesión". Ninguno fue creado fuera de este alcance (sin preparación de fases futuras, R-03).

## 11. Migraciones requeridas

Ninguna — la Fase 0 no toca base de datos.

## 12. Matriz de trazabilidad inicial

| Requisito del gate de Fase 0 | Evidencia | Estado |
|---|---|---|
| Lista cerrada de decisiones críticas | §5 de este documento | DEMOSTRADO (16/16 resueltas, 13 por el Analista con autorización del PO, 3 directamente por el PO) |
| Estados y transiciones definidos | `docs/product/state-machines.md` | DEMOSTRADO (todas las transiciones antes marcadas pendientes ya resueltas) |
| Matriz RBAC y SoD aprobada por el PO | `docs/product/roles-and-permissions.md` | DEMOSTRADO (aprobada 2026-10-03) |
| MVP separado de mejoras posteriores | `docs/product/scope.md` | DEMOSTRADO |
| NFR confirmados con valores numéricos | `docs/product/non-functional-requirements.md` | DEMOSTRADO (volumetría confirmada por el PO 2026-10-03) |
| Spikes de monday completados | §6 de este documento | **DEMOSTRADO**: 5/5 ejecutados con evidencia real (pooler, session token, cámara desktop, monetización, webhook de ciclo de vida). Pendiente únicamente confirmar cámara en dispositivo móvil antes de Fase 16 (no bloqueante para Fase 0). |
| Modelo de amenazas inicial y registro de riesgos | `docs/architecture/threat-model.md`, `docs/execution/risks.md` | DEMOSTRADO |
| ADR fundacionales aprobados | `docs/adr/ADR-001..008` | DEMOSTRADO (ratificados 2026-10-03) |

## 13. Evidencia que se producirá al cerrar la fase

Respuestas documentadas del PO a §5 (se recomienda registrarlas como actualización de este mismo archivo, sección nueva "Decisiones cerradas", con fecha y firma); ratificación de ADR en `decisions.md` (cambio de estado a "Aprobado"); decisión de CHG-001/CHG-002 en `change-control.md`; actualización de `phase-status.md`.

## 14. Criterio objetivo para recomendar APPROVE o REJECT de este análisis

Este análisis se considera **completo para su propósito** (no para el cierre de la fase) si el RT confirma que: (a) no falta ningún hallazgo de contradicción blueprint/plan-maestro relevante, (b) las 16 ambigüedades cubren efectivamente todas las decisiones de negocio no resueltas, y (c) los ADR propuestos son técnicamente correctos. La fase en sí **no puede cerrarse (`APPROVED`)** hasta que el PO responda §5 y el RT ratifique los ADR — eso no es una limitación de este análisis, es el diseño intencional del gate (plan maestro §38: "ninguna fase se cierra porque el código compila" — aquí, análogamente, ninguna fase de normalización se cierra porque el análisis esté completo sin decisión humana).

## 15. Evaluación de Definition of Ready

No aplica en sentido estricto a la Fase 0 (la DoR de §8 del plan maestro se diseñó para fases de implementación posteriores que dependen de que la Fase 0 esté `APPROVED`). La Fase 0 está en curso y bloqueada por las razones de §5.
