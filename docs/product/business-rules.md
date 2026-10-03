# Reglas de negocio (BR)

Extraídas y formalizadas a partir de `monday-wms-construccion-blueprint.md`. Numeración según `/docs/execution/master-plan.md` §10.1. Las reglas marcadas **[PENDIENTE]** dependen de una ambigüedad bloqueante abierta en `/docs/phases/phase-00-blueprint-normalization.md` y no deben implementarse hasta su resolución (R-06, R-07 del plan maestro).

## Tenancy (TEN)

- **BR-TEN-001.** `tenant_id` = `monday_account_id` recibido en el OAuth de instalación; inmutable tras la creación del tenant.
- **BR-TEN-002.** La moneda base del tenant se define en onboarding y es **inmutable** una vez existe al menos una transacción de ledger en esa moneda.
- **BR-TEN-003.** Cada tenant define una etiqueta white-label para "Centro de Costo" (p. ej. "Proyecto/Obra", "Sucursal").
- **BR-TEN-004.** Cada tenant tiene exactamente un Almacén General (`is_general_pool = true`), creado automáticamente durante el onboarding.
- **BR-TEN-005.** Tras la desinstalación, los datos del tenant se retienen 30 días (`uninstalled_at` + 30 días) antes de la purga definitiva. Una reinstalación dentro de esa ventana reactiva el mismo tenant sin duplicarlo. Decidido 2026-10-03.

## Identidad y acceso (IAM)

- **BR-IAM-001.** Existen 9 roles predeterminados: Dueño/Admin de cuenta, Admin de Almacén, Gerente de Proyecto, Residente de Obra, Capataz, Almacenista, Control de Costos, Comprador, Contabilidad.
- **BR-IAM-002.** El rol Capataz únicamente crea solicitudes; nunca aprueba ni despacha.
- **BR-IAM-003.** El rol Control de Costos nunca aprueba ni despacha.
- **BR-IAM-004.** `requisition.requested_by != requisition.approved_by` (segregación de funciones, validada en el backend en cada mutación, no solo en UI).
- **BR-IAM-005.** `requisition.approved_by != requisition.dispatched_by` (segregación de funciones, validada en el backend).
- **BR-IAM-006.** El último usuario con rol de administrador (Dueño) de un tenant no puede removerse a sí mismo ese rol.

## Catálogo y estructura logística (CAT)

- **BR-CAT-001.** Un Almacén pertenece exactamente a un Centro de Costo.
- **BR-CAT-002.** Una Ubicación pertenece exactamente a un Almacén. Las Ubicaciones forman un árbol sin ciclos, verificado a nivel de base de datos (no solo en aplicación).
- **BR-CAT-003.** El SKU es único por tenant (`UNIQUE (tenant_id, sku)`). Normalización: mayúsculas, `trim`, solo caracteres alfanuméricos y guiones (`-`); cualquier otro carácter se rechaza al guardar. Decidido 2026-10-03.
- **BR-CAT-006.** `Item.allows_fractional` (booleano) determina si el ítem admite cantidades fraccionarias en UOM base; por defecto `false`. Decidido 2026-10-03.
- **BR-CAT-004.** Los factores de conversión de UOM son positivos; la conversión de ida y vuelta no pierde precisión más allá de la escala definida en ADR-002.
- **BR-CAT-005.** Las entidades referenciadas por transacciones (ítems, almacenes, proveedores) no se eliminan físicamente; se desactivan. Una entidad desactivada no puede usarse en documentos nuevos pero permanece visible en históricos.

## Inventario y ledger (INV)

- **BR-INV-001.** El ledger (`InventoryTransaction`) es append-only; toda corrección es una transacción nueva que referencia la original, nunca un `UPDATE`/`DELETE`.
- **BR-INV-002.** El saldo derivado (`qty_remaining` de un Lote) debe ser en todo momento igual a la suma de los movimientos del ledger de ese lote (NFR-004: cualquier diferencia es S1).
- **BR-INV-003.** `unit_cost_base` de un Lote se congela (snapshot) al momento de la recepción; nunca se recalcula retroactivamente aunque cambie la tasa de cambio o el costo del proveedor.
- **BR-INV-004.** Stock negativo está **prohibido siempre**: ningún saldo derivado puede quedar por debajo de cero en ningún instante confirmado (constraint de base de datos, no solo verificación de aplicación). Decidido 2026-10-03; cualquier excepción futura por tipo de ítem requiere un ADR de reemplazo.
- **BR-INV-005.** Selección de consumo de lotes: **FEFO** si el ítem tiene `expiry_date` definido; **FIFO** si no lo tiene. Override manual permitido con `override_reason` obligatorio y permiso `lot.override.fifo_fefo`. Decidido 2026-10-03.
- **BR-INV-006.** Las devoluciones a proveedor se registran con tipo de transacción de ledger `devolucion_proveedor`, referenciando la PO y el Lote de origen. Decidido 2026-10-03.
- **BR-INV-007.** Las devoluciones desde obra/centro de costo (material sobrante que regresa a inventario) se registran con tipo de transacción `devolucion_obra`, referenciando la Requisition de origen. Decidido 2026-10-03.
- **BR-INV-008.** Las correcciones del ledger solo pueden emitirse con el permiso atómico `ledger.correct`, restringido a los roles Dueño/Admin de Almacén y Contabilidad (distinto del flujo de ajuste de conteo). Decidido 2026-10-03.
- **BR-INV-009.** Un Lote en `CUARENTENA` solo puede liberarse (`BUENO`) o rechazarse (`RECHAZADO`) mediante el permiso `lot.quarantine.release`; nunca automáticamente. Decidido 2026-10-03.

## Compras (PUR)

- **BR-PUR-001.** Una Orden de Compra sigue el ciclo: borrador → enviada → recibida parcial → recibida completa → cerrada/cancelada.
- **BR-PUR-002.** Toda recepción referencia obligatoriamente una línea de PO (`po_line_id`); no existe recepción sin PO en el MVP.
- **BR-PUR-003.** `unit_cost_base = unit_cost_original × fx_rate_at_receipt`, con `fx_rate_at_receipt` congelada al momento de la recepción.
- **BR-PUR-004.** Tolerancia de sobre-recepción: 2 % configurable por tenant. Dentro de esa tolerancia, la recepción se confirma sin aprobación adicional; por encima, se bloquea y exige aprobación explícita. Decidido 2026-10-03.
- **BR-PUR-005.** Una PO en estado `ENVIADA` sin recepciones puede cancelarse directamente. Una PO con `RECIBIDA_PARCIAL` no se cancela: el remanente no recibido se cierra administrativamente (lo ya recibido permanece en el ledger sin reversión). Decidido 2026-10-03.
- **BR-PUR-006.** Si la cantidad recibida difiere de la esperada más allá de la tolerancia de BR-PUR-004, la recepción se confirma igualmente y la línea queda marcada `con_discrepancia` para revisión posterior; no bloquea la operación de campo. Decidido 2026-10-03.
- **BR-PUR-007.** La tasa de cambio es ingresada manualmente por el usuario en cada recepción (sin integración con una fuente externa); el campo se presenta vacío o con la última tasa usada para ese par de monedas como referencia, editable siempre. Decidido por el PO 2026-10-03.
- **BR-PUR-008.** La numeración de documentos de compra (`PO-0001`, etc.) es secuencial simple por tenant, sin requisito de régimen fiscal específico (confirmado: no aplica NCF ni comprobante fiscal especial para el mercado objetivo inicial). No se garantiza "sin huecos" salvo que una fase posterior lo requiera por otro motivo. Decidido por el PO 2026-10-03.

## Solicitudes (REQ)

- **BR-REQ-001.** Una Requisition sigue el ciclo: pendiente → aprobada (total/parcial) → en despacho → despachada (parcial/cerrada) → rechazada/cancelada.
- **BR-REQ-002.** La cantidad aprobada por línea nunca puede superar la cantidad solicitada.
- **BR-REQ-003.** El rechazo de una Requisition exige un motivo registrado.
- **BR-REQ-004.** ATP = saldo disponible físico − reservas activas − stock no disponible (cuarentena, vencido), calculado en vivo contra el ledger (nunca cacheado).
- **BR-REQ-005.** Al aprobar una línea se reserva ATP sin afectar el stock físico; al despachar, la reserva se consume junto con el stock físico en la misma transacción; al cancelar o rechazar, la reserva se libera en la misma transacción.
- **BR-REQ-006.** Una Requisition `APROBADA_*` o `DESPACHADA_PARCIAL` puede cancelarse sobre su remanente no despachado, con motivo obligatorio; libera la reserva ATP del remanente en la misma transacción. Lo ya despachado no se revierte. Decidido 2026-10-03.
- **BR-REQ-007.** Las reservas ATP expiran a las 72 horas de creadas si la Requisition no avanza a despacho; se liberan mediante un job idempotente. Decidido 2026-10-03.

## Despacho (DSP)

- **BR-DSP-001.** El despacho requiere una Requisition aprobada; los lotes candidatos se bloquean (`SELECT ... FOR UPDATE`) en orden determinístico (p. ej. `id` ascendente) antes de consumirse.
- **BR-DSP-002.** Un override del lote sugerido por FIFO/FEFO exige `override_reason` obligatorio y un permiso específico distinto del permiso de despacho estándar.
- **BR-DSP-003.** Si la cantidad disponible es menor que la aprobada, se despacha lo disponible y el remanente queda registrado como backorder en la línea.

## Transferencias y cierre (TRF)

- **BR-TRF-001.** Modelo de transferencia: directa (confirmación inmediata) por defecto; "en tránsito" (ubicación virtual con saldo propio) cuando cruza almacenes de distinta ubicación física, o siempre que el tenant lo configure explícitamente. Decidido 2026-10-03.
- **BR-TRF-002.** El cierre de un Centro de Costo se bloquea mientras exista `qty_remaining > 0` en cualquier Lote de sus Almacenes.
- **BR-TRF-003.** Al cerrar un Centro de Costo, el remanente se transfiere a otro Centro de Costo activo o al Almacén General del tenant (reutilizando el flujo estándar de transferencia).

## Conteos y ajustes (CNT)

- **BR-CNT-001.** Un conteo cíclico congela `expected_qty` como snapshot al momento de abrirse.
- **BR-CNT-002.** Si `abs(variance) / expected_qty` supera el `tolerance_threshold` configurable (default propuesto: 5 %, pendiente de ratificación del PO), el ajuste requiere una segunda aprobación de un usuario distinto de quien contó.
- **BR-CNT-003.** El ajuste se escribe exclusivamente como transacción de ledger (tipo `ajuste`), y solo tras su aprobación cuando excede tolerancia.

## Importación (IMP)

- **BR-IMP-001.** Los saldos iniciales se registran como transacciones de ledger identificables (tipo `OPENING_BALANCE`); nunca como una modificación directa de un saldo.
- **BR-IMP-002.** Una importación es atómica por lote de importación (entra completa o no entra nada) e idempotente por hash de archivo.

## Reportes (RPT)

- **BR-RPT-001.** Todo reporte respeta el alcance (scope) del usuario que lo solicita; un usuario de un almacén no ve datos de otro fuera de su alcance.
- **BR-RPT-002.** Las exportaciones CSV/Excel neutralizan inyección de fórmulas (celdas que comiencen con `=`, `+`, `-`, `@`).

## Monetización (BIL)

- **BR-BIL-001.** El plan comercial del tenant determina los permisos habilitados (entitlement); se verifica en el backend como el último paso de la cadena de autorización (§16 del plan maestro).
- **BR-BIL-002.** Ante fallo de verificación de entitlement, el tenant degrada a modo solo-lectura (el inventario existente sigue consultable; nunca se pierden datos por impago, per gate de Fase 18). TTL de cache de entitlement: 15 minutos, invalidado antes por webhook de cambio de plan. Decidido 2026-10-03.

## Regla transversal

Ninguna regla marcada **[ABIERTO]** se implementa como supuesto por defecto. Si una fase posterior la necesita y sigue sin resolver, esa fase se detiene (R-07) y se escala, no se decide por conveniencia de implementación. Las reglas marcadas "Decidido 2026-10-03" fueron resueltas por el Analista bajo autoridad delegada explícitamente por el PO en sesión (ver `/docs/phases/phase-00-blueprint-normalization.md` §Decisiones cerradas); quedan sujetas a corrección por `CHG` si el PO las revisa y no está de acuerdo.
