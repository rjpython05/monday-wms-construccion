# Alcance del producto

Fuente: `monday-wms-construccion-blueprint.md` §24.4 (plan maestro) y Build Order del blueprint. Este documento es el contrato de "qué entra y qué no" para el MVP comercial. Cualquier adición debe pasar por `CHG` (ver `/docs/execution/change-control.md`).

## MVP vendible (fases 0–16, 18)

Instalación y OAuth · Onboarding mínimo · Multi-tenencia con RLS forzada · RBAC con 9 roles y alcance (global/centro de costo/almacén) · Catálogo (ítems, UOM, proveedores) · Centros de Costo · Almacenes y Ubicaciones (árbol) · Órdenes de Compra · Recepción con generación de Lotes · Solicitudes (Requisition) · Aprobaciones con segregación de funciones · ATP · Despachos con FIFO/FEFO sugerido · Backorders · Transferencias básicas y cierre de Centro de Costo · Conteo cíclico y ajuste con tolerancia y segunda aprobación · Ledger inmutable · Valorización multi-moneda por lote · Auditoría administrativa · Importación de catálogo/proveedores/saldos iniciales · Reportes esenciales (existencia, valorización, histórico, presupuesto vs. real, backorders) · Exportación autorizada · Escaneo básico de código de barras (cámara + lector HID) · Planes comerciales simples (monetización nativa de monday).

**Fases opcionales/configurables dentro del MVP** (no se eliminan, pero no son obligatorias de usar): jerarquía de Fases (WBS) dentro de un Centro de Costo; profundidad del árbol de Ubicaciones (puede operarse con una sola ubicación por almacén si el tenant no necesita más granularidad).

## Explícitamente fuera del MVP (posterior al piloto — Fase 17 y backlog)

- Transferencias avanzadas (reglas de aprobación multi-nivel, transferencias programadas).
- Conteos ABC programados automáticamente (más allá del cálculo de clasificación).
- Reabastecimiento automático (generación automática de PO desde punto de reorden; en el MVP solo se **sugiere**, no se genera sola).
- Escaneo GS1 avanzado (más allá de códigos de barra estándar).
- **Resiliencia offline / cola local** (Fase 17): requiere evidencia de uso real del escaneo en el piloto (Fase 20) antes de iniciarse. No se construye código de esta fase durante el MVP.
- BOM (lista de materiales) como funcionalidad activa — el campo de datos puede existir en el modelo, pero no hay flujo de consumo automático de componentes en el MVP.
- Reportes secundarios no listados en Fase 15.
- Planes comerciales complejos (tiers con reglas de uso métricas, add-ons).
- Automatizaciones adicionales más allá de las descritas en el build order.
- Devoluciones formales, transferencias con estado "en tránsito", y otros puntos listados como ambigüedades bloqueantes en `/docs/phases/phase-00-blueprint-normalization.md` **permanecen fuera de alcance hasta que el PO decida su tratamiento**; no se implementan por defecto ni se asume su ausencia — ver ese documento.

## Criterio de secuencia (no de alcance)

Por dependencias técnicas, la Fase 17 (offline) se ejecuta *después* del piloto (Fase 20) aunque conceptualmente sea parte de la robustez de campo — no porque sea de menor prioridad de negocio, sino porque su diseño depende de datos de uso real del escaneo (Fase 16).

## Regla de cambio de alcance

Ninguna de las listas anteriores se modifica por conveniencia de implementación. Un ítem que parezca "fácil de agregar ya que se está tocando el código relacionado" sigue fuera de alcance salvo `CHG` aprobado (R-03, R-04 del plan maestro).
