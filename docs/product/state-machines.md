# Máquinas de estado

Formalización de los ciclos de vida mencionados en el blueprint, con transiciones permitidas y explícitamente prohibidas (exigido por el DoR de Fase 0, plan maestro §8). Todo intento de transición no listada como permitida se rechaza (deny by default de estados).

## PurchaseOrder (PO)

```text
Estados: BORRADOR, ENVIADA, RECIBIDA_PARCIAL, RECIBIDA_COMPLETA, CERRADA, CANCELADA
```

| Desde | Hacia | Condición |
|---|---|---|
| BORRADOR | ENVIADA | Al menos una línea; permiso `po.create`/`po.send` |
| ENVIADA | RECIBIDA_PARCIAL | Recepción de alguna línea, cantidad < total de la línea |
| ENVIADA | RECIBIDA_COMPLETA | Recepción de todas las líneas por su cantidad total |
| RECIBIDA_PARCIAL | RECIBIDA_PARCIAL | Recepción adicional, aún incompleta |
| RECIBIDA_PARCIAL | RECIBIDA_COMPLETA | Última recepción pendiente completada |
| RECIBIDA_COMPLETA | CERRADA | Cierre administrativo (sin más acción esperada) |
| BORRADOR | CANCELADA | Antes de enviar |
| ENVIADA | CANCELADA | Permitido si no tiene recepciones (BR-PUR-005). Decidido 2026-10-03. |
| RECIBIDA_PARCIAL | CERRADA | El remanente no recibido se cierra administrativamente sin generar nueva recepción; lo ya recibido permanece en el ledger sin reversión (BR-PUR-005). Decidido 2026-10-03. |

**Prohibidas explícitamente:** RECIBIDA_COMPLETA → ENVIADA (no se "reabre" una PO completa); CERRADA → cualquier otro estado (una devolución a proveedor se registra con el tipo de transacción `devolucion_proveedor`, BR-INV-006, nunca reabriendo la PO); CANCELADA → cualquier otro estado; RECIBIDA_PARCIAL → CANCELADA (no existe esta transición: una PO con recepciones se **cierra**, no se cancela — ver fila anterior).

## Requisition (Solicitud)

```text
Estados: PENDIENTE, APROBADA_PARCIAL, APROBADA_TOTAL, EN_DESPACHO,
         DESPACHADA_PARCIAL, CERRADA, RECHAZADA, CANCELADA
```

| Desde | Hacia | Condición |
|---|---|---|
| PENDIENTE | APROBADA_TOTAL | Aprobador aprueba el 100 % de cada línea; `requested_by != approved_by` (BR-IAM-004) |
| PENDIENTE | APROBADA_PARCIAL | Aprobador aprueba menos del 100 % de al menos una línea |
| PENDIENTE | RECHAZADA | Rechazo con motivo obligatorio (BR-REQ-003) |
| PENDIENTE | CANCELADA | El propio solicitante cancela antes de cualquier aprobación |
| APROBADA_TOTAL / APROBADA_PARCIAL | EN_DESPACHO | Almacenista inicia el despacho; `approved_by != dispatched_by` (BR-IAM-005) |
| EN_DESPACHO | DESPACHADA_PARCIAL | Despacho menor a lo aprobado (stock insuficiente → backorder, BR-DSP-003) |
| EN_DESPACHO | CERRADA | Despacho igual a lo aprobado |
| DESPACHADA_PARCIAL | DESPACHADA_PARCIAL | Despacho adicional contra el backorder pendiente |
| DESPACHADA_PARCIAL | CERRADA | Backorder cumplido o cerrado manualmente |
| APROBADA_TOTAL / APROBADA_PARCIAL | CANCELADA | Cancelación del remanente no despachado, con motivo obligatorio; libera la reserva ATP en la misma transacción (BR-REQ-006). Decidido 2026-10-03. |
| DESPACHADA_PARCIAL | CANCELADA | Cancela el remanente de un backorder; no afecta lo ya despachado (BR-REQ-006). Decidido 2026-10-03. |

**Prohibidas explícitamente:** RECHAZADA → cualquier estado activo (requiere una Requisition nueva); CERRADA → cualquier otro estado; una misma persona no puede ejecutar la transición PENDIENTE→APROBADA_* si es la autora de la solicitud (verificado en backend, no solo bloqueado en UI); EN_DESPACHO no puede ser ejecutado por el mismo usuario que aprobó (BR-IAM-005).

## Lot (Lote)

```text
Estados: BUENO, CUARENTENA, RECHAZADO
```

| Desde | Hacia | Condición |
|---|---|---|
| BUENO | CUARENTENA | Hallazgo de calidad o vencimiento inminente |
| CUARENTENA | BUENO | Liberación mediante permiso `lot.quarantine.release` (BR-INV-009). Decidido 2026-10-03. |
| CUARENTENA | RECHAZADO | Decisión de rechazo definitivo mediante `lot.quarantine.release` |
| BUENO | RECHAZADO | No permitido directo: todo rechazo pasa primero por `CUARENTENA` (flujo formal, BR-INV-009). Decidido 2026-10-03. |

**Prohibidas explícitamente:** RECHAZADO → cualquier otro estado (un lote rechazado no vuelve a estar disponible; su destino — devolución a proveedor o destrucción — es la ambigüedad #2/#9, no una reactivación del mismo lote). Un lote en CUARENTENA o RECHAZADO nunca cuenta en ATP (BR-REQ-004).

## CycleCount (Conteo cíclico)

```text
Estados: ABIERTO, CONTADO, PENDIENTE_APROBACION, APLICADO, CANCELADO
```

| Desde | Hacia | Condición |
|---|---|---|
| ABIERTO | CONTADO | `expected_qty` congelado al abrir (BR-CNT-001); se registra `counted_qty` |
| CONTADO | APLICADO | Variación dentro de tolerancia → ajuste automático al ledger |
| CONTADO | PENDIENTE_APROBACION | Variación fuera de tolerancia (BR-CNT-002) |
| PENDIENTE_APROBACION | APLICADO | Segunda aprobación de usuario distinto del contador; ajuste escrito al ledger |
| PENDIENTE_APROBACION | CANCELADO | Aprobador rechaza el ajuste; requiere re-conteo |
| ABIERTO | CANCELADO | Conteo abandonado antes de registrar cantidad |

**Prohibidas explícitamente:** APLICADO → cualquier otro estado (una corrección posterior es un conteo/ajuste nuevo, nunca una reapertura, por BR-INV-001); el mismo usuario no puede estar en `counted_by` y `approved_by` de un mismo conteo con ajuste pendiente de aprobación (SoD).

## CostCenter (Centro de Costo)

```text
Estados: ACTIVO, CERRADO
```

| Desde | Hacia | Condición |
|---|---|---|
| ACTIVO | CERRADO | Sin `qty_remaining > 0` en ningún lote de sus almacenes (BR-TRF-002); sin reservas activas; sin documentos abiertos (PO/Requisition en estado no terminal) |

**Prohibida explícitamente:** ACTIVO → CERRADO si existe cualquier saldo, reserva o documento abierto (bloqueo duro, no advertencia). CERRADO → ACTIVO **no está contemplado en el blueprint**; si el negocio lo necesita (reapertura de un proyecto), es una decisión de negocio nueva, no asumida aquí.

## Tenant (ciclo de instalación)

```text
Estados: INSTALADO, DESINSTALADO (con retención), PURGADO
```

| Desde | Hacia | Condición |
|---|---|---|
| INSTALADO | DESINSTALADO | Webhook de desinstalación verificado; `uninstalled_at` se registra |
| DESINSTALADO | INSTALADO | Reinstalación dentro de la ventana de retención (no duplica tenant — caso obligatorio de Fase 3) |
| DESINSTALADO | PURGADO | Vencida la ventana de retención de 30 días (BR-TEN-005). Decidido 2026-10-03. |

**Prohibida explícitamente:** PURGADO → cualquier estado (la purga es irreversible por definición).
