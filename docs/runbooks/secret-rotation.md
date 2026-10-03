# Runbook: rotación de secretos

Aplica a `MONDAY_CLIENT_SECRET`, `MONDAY_SIGNING_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`/`DIRECT_DATABASE_URL` (contraseña del rol de aplicación) y `UPSTASH_REDIS_TOKEN`.

## Cuándo rotar

- Programada: cada 90 días (no bloqueante, buena práctica).
- Forzada e inmediata: sospecha o confirmación de exposición (p. ej. commit accidental, log con el valor, credencial vista por un tercero). Ver RSK-013: las credenciales reales del spike de Fase 0 (Supabase y monday.com) están en este estado — rotación pendiente antes de generar secretos nuevos para Fase 2.

## Procedimiento

1. **monday.com** (`MONDAY_CLIENT_SECRET`, `MONDAY_SIGNING_SECRET`): Developer Center → la app → Basic Information → regenerar el secreto correspondiente. Actualizar inmediatamente en todos los entornos (local vía `.env.local`, CI vía secret de GitHub Actions, producción vía variables de entorno de Vercel) antes de que expire la sesión de quien rota, para evitar una ventana de verificación fallida.
2. **Supabase** (`DATABASE_URL`/`DIRECT_DATABASE_URL`): Database → Connection pooling / Database password → regenerar. Igual que el punto 1: actualizar en todos los entornos en la misma operación.
3. **Upstash** (`UPSTASH_REDIS_TOKEN`): panel de Upstash → regenerar token del namespace usado.
4. Verificar que el secreto anterior fue invalidado (un intento de uso del valor viejo debe fallar).
5. Registrar la rotación en `/docs/execution/change-control.md` si fue forzada por exposición (motivo, alcance, fecha, quién la ejecutó).
6. Si la rotación fue forzada por exposición, actualizar el riesgo correspondiente en `/docs/execution/risks.md` a "Mitigado" con la fecha.

## Quién puede ejecutar esto

Solo el RT, dado que ningún otro revisor humano tiene acceso a los paneles de Supabase/monday.com/Vercel/Upstash (ver RSK-012, RSK-016: CODEOWNER único / bus factor = 1).

## Nunca

- Nunca commitear el valor nuevo ni el anterior en texto plano, ni en el mensaje de commit del CHG.
- Nunca dejar el secreto anterior activo "por si acaso" más de lo necesario para verificar el corte.
