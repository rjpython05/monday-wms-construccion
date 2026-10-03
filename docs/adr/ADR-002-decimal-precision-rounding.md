# ADR-002: Precisión decimal y modo de redondeo

## Estado
Aprobado

## Fecha y decisores
2026-10-02 (propuesto) · 2026-10-03 (aprobado) · Analista de Fase 0 (propone) · rjpython05@gmail.com (RT, aprueba)

## Contexto
El plan maestro (§14.1) exige fijar precisión y modo de redondeo en un ADR de Fase 0, implementados en un único módulo de dominio. El blueprint ya usa `NUMERIC(18,4)` para cantidades y costos, y `NUMERIC(18,8)` para tasas de cambio, pero no define el modo de redondeo ni dónde se redondea (por línea o por total).

## Decisión
1. Escalas heredadas del blueprint, ratificadas: cantidades y costos `NUMERIC(18,4)`; tasas de cambio `NUMERIC(18,8)`.
2. Modo de redondeo propuesto: **ROUND_HALF_UP** (redondeo comercial estándar), aplicado exclusivamente por `src/domain/decimal.ts` usando `decimal.js` configurado con `Decimal.set({ rounding: Decimal.ROUND_HALF_UP })`. Ningún otro módulo invoca operaciones de redondeo directamente.
3. Punto de redondeo: **por línea**, no por total. El total de un documento es la suma de líneas ya redondeadas; el residuo de redondeo acumulado (si lo hay al valorizar) se registra explícitamente como una línea de ajuste de redondeo visible, nunca se absorbe silenciosamente en el costo del último ítem.
4. Serialización JSON de todo campo decimal como `string`, nunca como `number`, para evitar pérdida de precisión en el cliente (ya indicado en `CLAUDE.md`).

## Alternativas
- **ROUND_HALF_EVEN (bankers' rounding)**: más neutral estadísticamente pero menos intuitivo para usuarios no técnicos conciliando manualmente; descartado como default, puede reconsiderarse si el RT/PO lo prefiere.
- **Redondeo por total en vez de por línea**: descartado — dificulta la trazabilidad de cada movimiento individual del ledger contra su propio costo exacto.

## Consecuencias
- Un cambio posterior del modo de redondeo requiere un ADR de reemplazo y revisión de todo reporte de valorización histórico (no se recalculan retroactivamente, por BR-INV-003).
- El residuo de redondeo visible añade una línea adicional en reportes de valorización; debe comunicarse al PO como comportamiento esperado, no como error.

## Verificación
Pruebas unitarias de propiedades (`fast-check`) sobre `src/domain/decimal.ts`: conservación de suma tras redondeo por línea, conversión de UOM ida y vuelta dentro de la escala acordada.

## Evidencia
`master-plan.md` §14.1; `blueprint` §4 (esquema Drizzle con `numeric(18,4)` y `numeric(18,8)`).

## Revisión
Reevaluar si un cliente piloto en un país con convención de redondeo distinta (p. ej. redondeo a la unidad de moneda más pequeña en circulación) lo requiere explícitamente.
