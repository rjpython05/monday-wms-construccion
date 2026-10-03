# Modelo de amenazas inicial (STRIDE)

Primera pasada sobre el contexto del sistema, exigida por el gate de Fase 0. Se actualiza en cada fase para la superficie que añade (plan maestro §24.3) y se revisa por completo en Fase 19.

## Activos críticos

1. Aislamiento entre tenants (datos de inventario, costos, usuarios de un cliente).
2. Integridad del ledger (`InventoryTransaction`) y de los saldos derivados.
3. Credenciales: `MONDAY_CLIENT_SECRET`, `MONDAY_SIGNING_SECRET`, tokens de acceso de cuentas de monday, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`.
4. Identidad de usuario y cuenta (signed session token, OAuth).
5. Datos personales de usuarios (`AppUser.name`, `email`).
6. Disponibilidad del servicio (SLO NFR-001).

## Análisis por componente

### OAuth de instalación

| STRIDE | Amenaza | Mitigación |
|---|---|---|
| Spoofing | Callback falsificado sin `state` válido | `state` anti-CSRF vinculado a la sesión, redirect URI exacta registrada (§13 plan maestro) |
| Tampering | Manipulación de `account_id` en el callback | `account_id` se obtiene del intercambio OAuth server-to-server, nunca del query string del cliente sin validar |
| Information disclosure | Exposición de `MONDAY_CLIENT_SECRET` en logs o cliente | Secreto solo server-side; sanitización de logs (§18.1) |
| Repudiation | Instalación/reinstalación sin registro | Auditoría de instalación/desinstalación en `AdminAuditLog` |

### Signed session token / Webhooks (ver ADR-008)

| STRIDE | Amenaza | Mitigación |
|---|---|---|
| Spoofing | Token falsificado o firmado con secreto incorrecto | Verificación `jwt.verify` con el secreto correcto según el tipo de token (Client Secret para session token, Signing Secret para Authorization header de webhooks/integración) — **riesgo real detectado**: el blueprint original conflacionaba ambos secretos (ver CHG-002) |
| Spoofing | Algoritmo `none` o algoritmo no esperado aceptado | Verificación explícita de `alg` esperado (HS256), rechazo de `none` |
| Replay | Reenvío de un webhook capturado | Ventana temporal + deduplicación por ID de evento (§13 plan maestro) |
| Tampering | `accountId`/`userId` tomados de un campo no verificado del payload | Se usan únicamente los claims del JWT verificado, nunca un campo libre del body |

### Multi-tenencia / RLS

| STRIDE | Amenaza | Mitigación |
|---|---|---|
| Information disclosure | Fuga de datos entre tenants por ausencia de `WITH CHECK` o por rol con `BYPASSRLS` | `FORCE ROW LEVEL SECURITY` + políticas `USING`+`WITH CHECK` en toda tabla con `tenant_id`; rol de aplicación sin `BYPASSRLS` ni propiedad de tablas (ADR-001) — **riesgo real detectado**: el blueprint original solo definía `USING` (ver CHG-001) |
| Information disclosure | Fuga de contexto de tenant entre requests por pooler en modo transacción | `set_config(..., true)` parametrizado dentro de una transacción explícita (`withTenant()`); prueba de concurrencia obligatoria en Fase 4 (spike aún no ejecutable sin infraestructura real) |
| Elevation of privilege | BOLA: acceso a un recurso de otro tenant mediante ID adivinado | Verificación de pertenencia a tenant en cada endpoint antes de cualquier otra lógica (§16) |

### Ledger e integridad financiera

| STRIDE | Amenaza | Mitigación |
|---|---|---|
| Tampering | `UPDATE`/`DELETE` sobre `InventoryTransaction` | `REVOKE` de esos privilegios al rol de aplicación + trigger de rechazo (defensa en profundidad, Fase 8) |
| Repudiation | Movimiento sin autor identificable | `performed_by` obligatorio y auditado en cada transacción |
| Denial of service | Reintentos sin límite agotando conexiones durante contención de locks | `lock_timeout`/`statement_timeout` en el rol de aplicación; reintentos acotados con backoff (§15.2) |

### Monetización / Entitlements

| STRIDE | Amenaza | Mitigación |
|---|---|---|
| Elevation of privilege | Manipulación directa de la API para ejecutar función bloqueada por plan | Verificación de entitlement como último paso de la cadena de autorización, no solo en UI (Fase 18) |
| Tampering | Cache de entitlement envenenado o no invalidado tras cambio de plan | TTL corto + invalidación por webhook verificado (JWT) |

### Importación / Exportación

| STRIDE | Amenaza | Mitigación |
|---|---|---|
| Tampering | Inyección de fórmulas en CSV/Excel exportado | Neutralización de celdas que inicien con `=`, `+`, `-`, `@` (BR-RPT-002) |
| Denial of service | Archivo de importación de tamaño/filas excesivo | Límite de tamaño y filas, validación antes de staging (Fase 14) |
| Tampering | Importación parcialmente aplicada que deja datos inconsistentes | Confirmación atómica por lote de importación (BR-IMP-002) |

### Escaneo / Cámara en iframe

| STRIDE | Amenaza | Mitigación / estado |
|---|---|---|
| Denial of service (funcional) | monday.com no otorga el permiso `camera` en el iframe que embebe el Custom Object, inutilizando el escaneo por cámara | **Riesgo abierto, no mitigado**: requiere spike real (ver RSK-001 en `risks.md`) con una app instalada; se documentó evidencia de que el atributo `allow="camera"` debe ser otorgado por quien embebe el iframe (monday.com), no por esta app — ver fuentes en `phase-00-blueprint-normalization.md` §Spikes |

### Repositorio y CI/CD (Fase 1)

| STRIDE | Amenaza | Mitigación |
|---|---|---|
| Tampering | Dependencia comprometida (ataque de cadena de suministro) inyecta código malicioso durante `pnpm install` o build | Lockfile congelado (`--frozen-lockfile`), SCA en cada PR, Renovate/Dependabot con agrupación y revisión, SBOM por release (§20 plan maestro) |
| Spoofing | Workflow de GitHub Actions ejecutado desde un PR de un fork obtiene acceso a secretos del repositorio | Permisos mínimos explícitos (`permissions:`) por workflow, secretos nunca expuestos a `pull_request` desde forks, acciones de terceros fijadas por SHA (no por tag mutable) |
| Information disclosure | Secreto commiteado por error (código, historial completo, o evidencia en `/docs/evidence`) | Escaneo de secretos en cada PR y sobre el historial completo del repositorio, incluida `/docs/evidence` (§30.2) |
| Information disclosure | Claude Code lee `.env` real o usa credenciales de producción durante una sesión de implementación | `.claude/settings.json` con `deny` explícito sobre `Read(./.env*)` salvo `.env.example`, `Bash(git push --force:*)`, `Bash(vercel --prod:*)` — demostrado con un intento real, no solo configurado (criterio de gate de Fase 1) |
| Repudiation | Cambio a `main` sin trazabilidad clara a un PR y un autor | Trunk-based con ramas cortas, PR obligatorio, Conventional Commits, squash merge, `CODEOWNERS` |
| Denial of service | Job de CI sin límite de tiempo consume minutos indefinidamente ante un error de configuración | `timeout-minutes` explícito en cada job |
| Elevation of privilege | `any`/`@ts-ignore`/`@ts-expect-error` usados para evitar resolver un error de tipos reintroduce una clase de bug que TypeScript `strict` debía prevenir | Lint cuenta ocurrencias y la CI falla si aumentan (gate explícito de §19); exige comentario con causa y referencia a ticket |

## Amenazas pendientes de spike real (no verificables en esta sesión)

- Confirmación práctica de que `set_config('app.tenant_id', $1, true)` no gotea contexto entre requests bajo el pooler de Supabase en modo transacción, con carga concurrente real.
- Confirmación práctica de que el Custom Object (a diferencia de Item View, donde sí hay un bug documentado en iOS WKWebView) permite `getUserMedia()` para cámara.
- Comportamiento real de `apps_monetization_info` ante cuenta sin suscripción activa.

Estas amenazas permanecen **abiertas** hasta que exista una cuenta de desarrollador de monday y un entorno de staging desplegado (Fase 2–3) para ejecutar los spikes reales.
