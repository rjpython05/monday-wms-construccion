## Qué cambia y por qué

<!-- Resumen en 1-3 frases. Enlaza al ID de fase/tarea (p. ej. T7 de phase-01-engineering-controls.md). -->

## Fase y tarea

- Fase: <!-- 01 -->
- Tarea(s): <!-- T7 -->

## Checklist de Definition of Done (§9 del plan maestro)

- [ ] Lint, typecheck, build en verde
- [ ] Pruebas unitarias en verde
- [ ] Pruebas de integración contra PostgreSQL real en verde (si aplica)
- [ ] Pruebas de seguridad (RLS/BOLA) en verde (si aplica)
- [ ] Sin `any`/`@ts-ignore`/`@ts-expect-error` nuevos sin comentario+ticket
- [ ] Sin secretos en el diff (verificado por el escaneo de CI)
- [ ] Matriz de trazabilidad actualizada si este PR cierra un AC/SEC/NFR
- [ ] Ningún test fue eliminado, debilitado o marcado `skip`/`only`/`todo` para pasar en verde

## Evidencia

<!-- Enlace al run de CI. Si corresponde, ruta a /docs/evidence/phase-NN/ -->

## Riesgos / rollback

<!-- Cómo revertir este cambio si algo falla en producción -->
