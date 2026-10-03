# WMS para monday.com Marketplace (nombre de producto pendiente) — Blueprint

> Generado por The Architect el 2026-10-02
> Archetype: SaaS Web App (híbrido — app de marketplace embebida en monday.com con backend propio)

---

## 1. Project Overview

### Vision
Una aplicación de Gestión de Almacenes (WMS) de nivel empresarial, publicada en el Marketplace de monday.com, dirigida inicialmente al sector construcción (control de materiales por proyecto/obra) pero diseñada como producto horizontal para cualquier industria. Resuelve el problema de que los boards nativos de monday no modelan bien datos transaccionales de inventario (lotes, costos, multi-moneda, trazabilidad) — esta app aporta esa capa completa mientras monday sigue siendo el shell de identidad, navegación, notificaciones y cobro.

El diferenciador central no es solo "llevar inventario": es **control de costos reales por centro de costo/proyecto con segregación de funciones** (quién solicita material nunca es quien lo aprueba ni quien lo despacha) — un problema de control interno que la mayoría de apps de inventario genéricas no resuelven, y que es crítico en construcción por el riesgo real de desvío de material.

### Goals
- Publicar en el Marketplace de monday.com cumpliendo el proceso de revisión de 4 fases (producto, ingeniería, seguridad, privacidad)
- Ofrecer control de inventario multi-almacén, multi-moneda, con costeo por lote y trazabilidad completa, sin obligar a nadie a usar más complejidad de la que necesita (Fases y jerarquía de ubicaciones son opcionales/configurables)
- Prevenir fraude/pérdida de material mediante segregación de funciones aplicada a nivel de base de datos, no solo de UI
- Escalar de $0 a varios tenants sin re-arquitectura, empezando con la infraestructura más económica que cumple los requisitos de monday

### Success Metrics
- App aprobada en la revisión de monday.com en el primer intento (sin rechazos de seguridad)
- Cero incidentes de fuga de datos entre tenants (verificado con test suite dedicado de RLS)
- Tiempo de recepción/despacho de material en campo < 30 segundos con escaneo de código de barra

---

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 15 (App Router) | Un solo repo sirve las vistas embebidas en monday y toda la API/backend |
| Lenguaje | TypeScript estricto | No negociable dado el volumen de lógica financiera/transaccional |
| Integración monday | monday Apps SDK (`monday-sdk-js`) + feature **Custom Object** | Confirmado en la doc oficial: vive independiente en el menú lateral, a pantalla completa, sin atarse a un board — el feature correcto para un WMS complejo, no Board View/Item View |
| Autenticación | OAuth de instalación de monday + verificación de **signed session token** por request | monday ya es el proveedor de identidad; no se usa Clerk/NextAuth, evita superficie de ataque redundante |
| Autorización | RBAC propio (9 roles + alcance global/centro de costo/almacén) | Dominio de negocio propio; monday no conoce roles como "Almacenista" |
| Monetización | monday Monetization API (obligatoria desde jul-2024) + middleware de `apps_monetization_info` cacheado con TTL corto, invalidado por webhook | monday no revoca accesos automáticamente al vencer una suscripción; el backend debe verificarlo |
| Base de datos | PostgreSQL (Supabase) | RLS nativo + transacciones ACID estrictas para el ledger |
| Multi-tenencia | Esquema compartido + `tenant_id` (= account_id de monday) + Row-Level Security con `FORCE ROW LEVEL SECURITY` | Estándar probado en SaaS B2B a esta escala; evita la complejidad operativa de BD-por-cliente |
| ORM | **Drizzle** (no Prisma) | SQL casi puro para `SELECT...FOR UPDATE` (reservas ATP), CTEs recursivos (árbol de ubicaciones) y `DECIMAL` sin sorpresas |
| Conexión a BD | Supabase pooler, puerto 6543, **Transaction Mode**, `prepare: false` en Drizzle | Evita agotamiento de conexiones en funciones serverless — el fallo de producción más común en este stack |
| Jobs programados | Vercel Cron Jobs | Recalcular punto de reorden, clasificación ABC, tasas de cambio sugeridas, refresco de cache de entitlements |
| UI | Tailwind v4 + shadcn/ui | Estándar; tema claro forzado (ver Sección 7) |
| Hosting | Vercel Pro (no Hobby — prohibido para uso comercial) | $20/asiento/mes; Fluid Compute para reducir cold starts dentro del iframe |
| Rate limiting | Upstash Redis + middleware de Vercel | Protección de abuso desde el día uno, no "después" |
| Observabilidad | Sentry | Errores en producción + alertas de fallo silencioso en Cron Jobs |
| Package Manager | pnpm | Estándar, rápido |

---

## 3. Directory Structure

```
monday-wms/
  src/
    app/
      (embedded)/                   # Vistas servidas dentro del iframe de monday (Custom Object)
        dashboard/page.tsx          # Resumen: ATP, alertas de stock bajo, desviaciones de presupuesto
        catalogo/
          page.tsx                 # Lista de SKUs
          [itemId]/page.tsx        # Detalle de ítem + historial de costos
        almacenes/
          page.tsx                 # Lista de Centros de Costo → Almacenes
          [warehouseId]/page.tsx   # Árbol de ubicaciones, stock por ubicación
        solicitudes/
          page.tsx                 # Bandeja de Requisition (por rol: crear/aprobar/despachar)
          [requisitionId]/page.tsx
        compras/
          page.tsx                 # PurchaseOrder — lista y creación
          [poId]/page.tsx
        conteos/page.tsx           # Conteos cíclicos (ABC)
        reportes/
          valorizacion/page.tsx
          presupuesto-vs-real/page.tsx
        configuracion/
          page.tsx                 # Setup wizard (moneda base, jerarquía, roles)
          usuarios/page.tsx
        layout.tsx                 # Shell embebido: lee contexto del SDK, fuerza tema claro
      onboarding/page.tsx          # Primer arranque tras instalación (seed data, wizard)
      api/
        monday/
          oauth/route.ts           # Callback de instalación OAuth
          webhooks/route.ts        # Verificación JWT (HS256) de eventos de monday
        entitlements/check/route.ts # Middleware de verificación de suscripción
        requisitions/
          route.ts                 # POST crear
          [id]/approve/route.ts
          [id]/dispatch/route.ts
        receiving/route.ts         # Recepción contra PO → genera Lote
        purchase-orders/route.ts
        cycle-counts/[id]/adjust/route.ts  # Requiere segunda aprobación si excede tolerancia
        reports/
          valuation/route.ts       # Sirve desde vista materializada, no cálculo en vivo
          abc-classification/route.ts
        import/route.ts            # Importación de catálogo/proveedores/stock inicial
        export/route.ts            # Exportación CSV/Excel para el tenant
      layout.tsx                   # Root layout — CSP frame-ancestors, fuentes Montserrat
    components/
      ui/                         # shadcn/ui primitives
      inventario/                 # Lotes, ubicaciones, ATP widgets
      solicitudes/                # Flujo Requisition
      reportes/
      shared/
    lib/
      db/
        client.ts                 # Cliente Drizzle con pooler de Supabase (prepare:false)
        schema/                   # Un archivo por dominio (tenants, catalogo, inventario, compras, rbac)
        rls-policies.sql          # Políticas RLS + FORCE ROW LEVEL SECURITY (migración raw SQL)
        tenant-context.ts         # Helper: envuelve cada query en BEGIN + SET LOCAL app.tenant_id + COMMIT
      monday/
        sdk.ts                    # Wrapper del monday-sdk-js
        session-token.ts          # Verificación del signed session token
        webhook-jwt.ts            # Verificación JWT (HS256) de webhooks de monday
        entitlements.ts           # Cliente de apps_monetization_info con cache + invalidación por webhook
      costing/
        fifo-fefo.ts              # Motor de consumo de lotes
        fx.ts                     # Costeo multi-moneda, snapshot de tasa
        atp.ts                    # Cálculo de Disponible-para-Prometer
        reorder-point.ts          # Fórmula dinámica de punto de reorden
        abc-classification.ts     # Clasificación ABC por valor de consumo
      audit/
        ledger.ts                 # Escritura al InventoryTransaction (inmutable)
        admin-audit.ts            # Log de acciones administrativas (distinto del ledger de negocio)
      rbac/
        permissions.ts            # Definición de permisos atómicos
        check-scope.ts            # Verificación de BOLA: pertenencia a tenant + alcance en cada request
      utils.ts
    types/
      index.ts
  drizzle/
    migrations/                   # Migraciones versionadas — siempre nullable-first en BD compartida
  public/
    manifest.json                 # PWA — para escaneo offline-resiliente en campo
  middleware.ts                    # Verifica signed session token + CSP frame-ancestors
```

---

## 4. Data Model

### Entidades principales (resumen — ver esquema completo más abajo)

**Tenant** (= cuenta de monday instalada)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| monday_account_id | text | único, viene del OAuth de instalación |
| base_currency | text (ISO 4217) | configurado en onboarding |
| plan | enum | free / pro / enterprise — define entitlements |
| cost_center_label | text | etiqueta white-label ("Proyecto/Obra", "Sucursal", etc.) |
| installed_at | timestamptz | |
| uninstalled_at | timestamptz nullable | dispara política de retención de 30-90 días antes de purga |

**AppUser**
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK, RLS scope |
| monday_user_id | text | |
| name, email | text | |
| status | enum | activo/desactivado |

**Role / Permission / UserRoleAssignment**
Modelo RBAC con permisos atómicos (`requisition.create`, `requisition.approve`, `material.dispatch`, `material.receive`, `po.create`, `report.valuation.view`, `cost_center.close`, etc.) agrupados en 9 roles por defecto (Dueño, Admin de Almacén, Gerente de Proyecto, Residente de Obra, Capataz, Almacenista, Comprador, Contabilidad, Gerencia). Cada asignación tiene `scope_type` (global/cost_center/warehouse) y `scope_id`.

**CostCenter** (etiqueta configurable — "Proyecto/Obra" por defecto)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK |
| name, client, budget | | |
| status | enum | activo/cerrado |
| is_general_pool | bool | true solo para el "Almacén General" por tenant |

**Phase** (opcional, nullable en transacciones)
`cost_center_id`, `name`, `budget`, `status`

**Warehouse**
`cost_center_id` (FK obligatoria — un almacén pertenece a un solo centro de costo), `name`, `type` (principal/secundario/temporal), `address`

**Location** (árbol genérico, sin profundidad fija)
`warehouse_id`, `parent_location_id` (self-ref nullable), `name`, `type`

**Item (SKU)**
`tenant_id`, `sku_code`, `name`, `base_uom`, `abc_class` (recalculado cada 6 meses), `reorder_point` (calculado), `hazmat` (bool)

**UOMConversion**
`item_id`, `uom_code`, `factor_to_base`

**BOMComponent** (lista de materiales por fase/ítem)
`parent_id` (phase_id o item_id), `component_item_id`, `qty_required`

**Supplier**
`tenant_id`, `name`, `contact`, `default_lead_time_days`

**Lot**
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| item_id, warehouse_id, location_id | uuid | FK |
| lot_number | text | |
| qty_received, qty_remaining | numeric(18,4) | **nunca float** |
| unit_cost_original | numeric(18,4) | |
| currency_original | text | |
| fx_rate_at_receipt | numeric(18,8) | snapshot congelado |
| unit_cost_base | numeric(18,4) | snapshot, no recalculable |
| expiry_date | date nullable | |
| status | enum | bueno/cuarentena/rechazado |
| po_line_id | uuid nullable | |
| received_at | timestamptz | |

**InventoryTransaction** (ledger inmutable — nunca UPDATE, solo INSERT)
`tenant_id`, `type` (recepcion/despacho/transferencia/ajuste/conteo), `lot_id`, `item_id`, `qty_delta`, `unit_cost_snapshot`, `warehouse_id`, `cost_center_id`, `phase_id` nullable, `reference_doc`, `performed_by`, `idempotency_key` (único), `created_at`

**Requisition / RequisitionLine**
Estados: pendiente → aprobada (total/parcial) → en despacho → despachada parcial/cerrada → rechazada/cancelada. `requested_by` ≠ `approved_by` (constraint de aplicación, no solo convención).

**PurchaseOrder / PurchaseOrderLine**
Estados: borrador → enviada → recibida parcial → recibida completa → cerrada/cancelada.

**CycleCount / CycleCountLine**
`abc_class`, `expected_qty`, `counted_qty`, `variance`, `adjustment_status` (pendiente_aprobacion si excede tolerancia, requiere segunda persona).

**AdminAuditLog** (distinto del ledger de negocio)
`tenant_id`, `actor_user_id`, `action`, `target_entity`, `target_id`, `before`, `after`, `created_at`

**EntitlementCache**
`tenant_id`, `plan`, `status`, `last_verified_at`

### Relaciones clave
- Tenant 1→N CostCenter 1→N Warehouse 1→N Location (árbol recursivo)
- CostCenter 1→N Phase (opcional)
- Warehouse+Location 1→N Lot
- Item 1→N Lot, Item 1→N UOMConversion
- Requisition 1→N RequisitionLine; cada línea referencia un Item y acumula despachos contra Lotes vía InventoryTransaction
- PurchaseOrder 1→N PurchaseOrderLine; cada recepción crea un Lot referenciando su línea de PO

### Esquema (Drizzle, fragmento representativo)
```typescript
// lib/db/schema/inventario.ts
export const lots = pgTable('lots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  itemId: uuid('item_id').notNull().references(() => items.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  locationId: uuid('location_id').references(() => locations.id),
  lotNumber: text('lot_number').notNull(),
  qtyReceived: numeric('qty_received', { precision: 18, scale: 4 }).notNull(),
  qtyRemaining: numeric('qty_remaining', { precision: 18, scale: 4 }).notNull(),
  unitCostOriginal: numeric('unit_cost_original', { precision: 18, scale: 4 }).notNull(),
  currencyOriginal: text('currency_original').notNull(),
  fxRateAtReceipt: numeric('fx_rate_at_receipt', { precision: 18, scale: 8 }).notNull(),
  unitCostBase: numeric('unit_cost_base', { precision: 18, scale: 4 }).notNull(),
  expiryDate: date('expiry_date'),
  status: text('status', { enum: ['bueno', 'cuarentena', 'rechazado'] }).default('bueno'),
  poLineId: uuid('po_line_id'),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow(),
});

export const inventoryTransactions = pgTable('inventory_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  type: text('type', { enum: ['recepcion', 'despacho', 'transferencia', 'ajuste', 'conteo'] }).notNull(),
  lotId: uuid('lot_id').notNull().references(() => lots.id),
  qtyDelta: numeric('qty_delta', { precision: 18, scale: 4 }).notNull(),
  unitCostSnapshot: numeric('unit_cost_snapshot', { precision: 18, scale: 4 }).notNull(),
  costCenterId: uuid('cost_center_id').notNull(),
  phaseId: uuid('phase_id'),
  referenceDoc: text('reference_doc'),
  performedBy: uuid('performed_by').notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

### RLS (migración raw SQL — Drizzle no gestiona esto)
```sql
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots FORCE ROW LEVEL SECURITY; -- obligatorio: sin esto, el dueño de la tabla bypassea la RLS
CREATE POLICY tenant_isolation ON lots
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
-- Repetir ENABLE + FORCE + POLICY para TODAS las tablas con tenant_id.
-- El rol de conexión de la app NUNCA debe ser el dueño de las tablas ni tener BYPASSRLS.
```
```typescript
// lib/db/tenant-context.ts — usar SIEMPRE, nunca una query suelta
export async function withTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.tenant_id = ${tenantId}`); // SET LOCAL, nunca SET a secas
    return fn(tx);
  });
}
```

---

## 5. API Design

### Routes Overview
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/monday/oauth/callback | Callback de instalación OAuth | público (validado por monday) |
| POST | /api/monday/webhooks | Eventos de monday (instalación, suscripción) | JWT HS256 (Signing Secret) |
| GET | /api/entitlements/check | Verifica plan/suscripción activa | sesión |
| POST | /api/requisitions | Crear solicitud de material | rol: `requisition.create` |
| POST | /api/requisitions/:id/approve | Aprobar (total/parcial) | rol: `requisition.approve`, scope = cost_center; valida `requested_by != actor` |
| POST | /api/requisitions/:id/dispatch | Despachar contra lotes (FIFO/FEFO sugerido) | rol: `material.dispatch`, scope = warehouse |
| POST | /api/receiving | Recepción contra línea de PO → crea Lote | rol: `material.receive` |
| POST | /api/purchase-orders | Crear PO | rol: `po.create` |
| POST | /api/purchase-orders/:id/send | Enviar a proveedor | rol: `po.create` |
| POST | /api/cycle-counts/:id/adjust | Aplicar ajuste de conteo | requiere 2do aprobador si excede tolerancia |
| GET | /api/reports/valuation | Valorización de inventario (vista materializada) | rol: `report.valuation.view` |
| GET | /api/reports/budget-vs-actual | Presupuesto vs. real por centro de costo/fase | rol scope-aware |
| POST | /api/import | Importar catálogo/proveedores/stock inicial | rol: Admin |
| GET | /api/export | Exportar CSV/Excel | scope-aware |
| POST | /api/cost-centers/:id/close | Cerrar centro de costo (bloquea si stock > 0) | rol: Gerente de Proyecto |

### Detalle de endpoints críticos

**POST /api/requisitions/:id/approve**
- Valida BOLA: la requisición pertenece al tenant del actor Y a un cost_center dentro del alcance del actor
- Valida SOD: `requisition.requested_by !== actor.id` (hard constraint, no solo UI)
- Permite aprobar cantidad ≤ solicitada por línea (nunca mayor)
- Al aprobar, crea la reserva ATP (resta de "disponible", no del stock físico)
- Respuesta: `{ requisition, atp_impact: [{item_id, reserved_qty}] }`

**POST /api/requisitions/:id/dispatch**
- Requiere `idempotency_key` en el header — reintentos de red no duplican el despacho
- Dentro de una transacción con `SELECT ... FOR UPDATE` sobre los lotes candidatos (evita condiciones de carrera entre dos despachos simultáneos)
- Sugiere lote por FIFO/FEFO; el Almacenista puede elegir otro con `override_reason` obligatorio
- Si `qty_disponible < qty_aprobada`: despacha lo disponible, deja el remanente como backorder en la línea, evalúa si dispara sugerencia de PO (vs. reorder_point)

**POST /api/receiving**
- Referencia obligatoria a `po_line_id`
- Calcula `unit_cost_base = unit_cost_original * fx_rate_at_receipt` (tasa sugerida automáticamente, editable manualmente)
- Crea el Lote + la transacción de ledger `recepcion` en una sola transacción DB

**POST /api/cycle-counts/:id/adjust**
- Si `abs(variance) / expected_qty > tolerance_threshold` (configurable, default 5%): estado queda `pendiente_aprobacion`, requiere un segundo usuario distinto del que contó
- Solo al aprobar se escribe la transacción `ajuste` en el ledger

**POST /api/cost-centers/:id/close**
- Bloquea si cualquier Lot de sus almacenes tiene `qty_remaining > 0`
- Ofrece transferir a otro cost_center activo o al "Almacén General" del tenant (reutiliza el endpoint de transferencia, no lógica especial)

---

## 6. Frontend Architecture

### Pages / Routes (dentro del Custom Object embebido)
| Route | Page | Description |
|-------|------|-------------|
| /dashboard | Dashboard | ATP global, alertas de stock bajo, desviaciones de presupuesto, accesos rápidos por rol |
| /catalogo | Catálogo | Lista de SKUs con ABC class, UOMs, reorder point sugerido |
| /almacenes/:id | Almacén | Árbol de ubicaciones + stock por ubicación |
| /solicitudes | Bandeja | Vista filtrada por rol: Capataz ve "mis solicitudes", Residente ve "pendientes de aprobar" |
| /compras | Órdenes de compra | Lista + creación, sugerencias automáticas de reabastecimiento |
| /conteos | Conteos cíclicos | Calendario generado por clasificación ABC |
| /reportes/valorizacion | Reporte | Valorización histórica, exportable |
| /reportes/presupuesto-vs-real | Reporte | Por centro de costo/fase |
| /configuracion | Setup | Wizard de onboarding + ajustes del tenant |

### Component Hierarchy (ejemplo: flujo de Solicitud)
```
SolicitudesPage
  ├── RequisitionFilterBar (por estado, por centro de costo)
  ├── RequisitionList
  │     └── RequisitionCard (muestra ATP de cada línea en vivo)
  └── RequisitionDetailDrawer
        ├── RequisitionLineTable (editable solo si rol = aprobador)
        ├── ApproveButton (deshabilitado si actor === requested_by)
        └── DispatchPanel (sugerencia FIFO/FEFO + override con motivo)
```

### State Management
- Server Components para lectura inicial (sin round-trip de API)
- TanStack Query para mutaciones + revalidación on-focus (no WebSockets en v1 — polling ligero suficiente dado el volumen de usuarios simultáneos esperado)
- Reportes agregados (ABC, valorización histórica) se sirven desde vistas materializadas refrescadas por Cron Jobs — nunca recalculados en cada request
- Saldos/ATP siempre en vivo contra el ledger — nunca cacheados

---

## 7. Design System

Principios extraídos del skill `ui-ux-pro-max` (no instalado en esta sesión de diseño — principios incorporados directamente): soft-UI premium minimalista, sombras suaves, profundidad sutil, formas orgánicas, sin gradientes neón ni efectos agresivos. **Tema claro forzado, sin excepción** — se anula el toggle de tema oscuro del SDK de monday.

### Colors
| Role | Hex | Usage |
|------|-----|-------|
| Primary | #2F6F4E | Acciones principales, acentos (verde construcción/industrial, no genérico SaaS) |
| Secondary | #4A7FA6 | Acciones secundarias |
| Background | #FAFAF8 | Fondo de página — nunca blanco puro, reduce fatiga visual bajo luz solar |
| Surface | #FFFFFF | Tarjetas, paneles |
| Text | #1A1D1B | Texto principal, alto contraste para uso en campo |
| Muted | #6B7268 | Texto secundario, bordes |
| Destructive | #C0392B | Errores, rechazos, variaciones de conteo fuera de tolerancia |
| Success | #27804F | Confirmaciones, aprobaciones |
| Warning | #B8860B | Stock bajo, backorders |

### Typography
| Role | Font | Size | Weight |
|------|------|------|--------|
| Headings | Montserrat | 24-32px | 700 |
| Subheadings | Montserrat | 18-20px | 600 |
| Body | Montserrat | 15-16px | 400-500 |
| Código/datos técnicos (SKU, lotes) | Montserrat (tabular nums) | 14px | 500 |

### Spacing & Layout
- Spacing scale: 4px base — 4, 8, 12, 16, 24, 32, 48, 64
- Border radius: 10px default, 16px cards, full para avatares/badges
- Max content width: 1280px (dentro del iframe de monday se adapta al ancho disponible)
- Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px
- **Objetivos táctiles mínimo 48x48px** — uso real con guantes de trabajo en campo

### Component Style
Minimalista con profundidad sutil: tarjetas con sombra suave (`0 2px 8px rgba(0,0,0,0.06)`), bordes redondeados consistentes, micro-interacciones discretas en hover/focus (nunca animaciones agresivas), estados de foco siempre visibles (accesibilidad), nunca color como único indicador de estado (siempre ícono + texto + color).

---

## 8. Authentication & Authorization

### Auth Flow
1. Admin de la cuenta de monday instala la app → OAuth de monday entrega `account_id` + token de API
2. Cada carga del Custom Object recibe un **signed session token** vía el SDK (contexto: accountId, userId, tema)
3. Middleware de Next.js verifica la firma del token en cada request antes de tocar cualquier ruta
4. Si es la primera vez que se ve este `account_id` → redirige a `/onboarding` (wizard de setup)
5. Si no → cae directo a `/dashboard` con el RBAC del `userId` ya resuelto

### Protected Routes
Todo bajo `/(embedded)/*` requiere token de sesión válido + tenant resuelto. `/api/monday/webhooks` usa verificación JWT separada (no sesión de usuario).

### Roles & Permissions
| Rol | Alcance | Puede hacer |
|-----|---------|-------------|
| Dueño/Admin de cuenta | Global | Todo, incluida configuración y facturación |
| Admin de Almacén | Global | Catálogos, almacenes, UOMs, usuarios |
| Gerente de Proyecto | 1+ cost centers asignados | Aprobar excepciones, cerrar proyecto, decidir destino de sobrante |
| Residente de Obra | 1 cost center | Aprobar solicitudes operativas del día a día |
| Capataz | Su frente de trabajo | Solo crear solicitudes — **nunca** aprobar ni despachar |
| Almacenista | 1+ almacenes asignados | Recibir, despachar (solo contra aprobada), conteos físicos |
| Control de Costos | Global o por proyecto | Conciliar, reportar desviaciones — **nunca** aprobar ni despachar |
| Comprador | Global | Proveedores, órdenes de compra |
| Contabilidad | Global, solo lectura | Valorización, costos históricos |

Constraint de aplicación (no solo de UI): `requisition.requested_by != approver.id` y `requisition.approved_by != dispatcher.id` se validan en el backend en cada mutación.

### Session Management
Sin cookies de sesión tradicionales — el signed session token de monday es la fuente de verdad, re-verificado en cada request (no se cachea la validez más allá del tiempo de vida del token). Si en el futuro se agrega cualquier cookie propia (preferencias de UI), debe usar `SameSite=None; Secure` porque el contexto es un iframe cross-site.

---

## 9. Build Order

**Paso 1 — Scaffolding y cuenta de desarrollador**
Crear cuenta en el Developer Center de monday, registrar la app, obtener Client ID/Secret/Signing Secret. `npx create-next-app@latest`, Tailwind v4, shadcn/ui, pnpm.

**Paso 2 — Infraestructura base**
Crear proyecto Supabase (Pro desde el día uno, no Free — ver Sección 12), configurar Vercel Pro, variables de entorno separadas por ambiente (nunca `NEXT_PUBLIC_` en secretos).

**Paso 3 — OAuth + verificación de sesión**
Implementar callback OAuth de instalación, middleware de verificación de signed session token, feature **Custom Object** registrado en el Developer Center.

**Paso 4 — Modelo de datos core + RLS**
Tablas de Tenant, AppUser, CostCenter, Warehouse, Location (árbol recursivo), Item/UOM. Migraciones Drizzle + migración raw SQL de `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` + políticas, en TODAS las tablas con `tenant_id`. Conectar la app con un rol de BD dedicado, no dueño, sin `BYPASSRLS`. Helper `withTenant()` con `SET LOCAL` envuelto en transacción.

**Paso 5 — Wizard de onboarding**
Setup de moneda base, plantilla de jerarquía de ubicaciones, creación del primer Centro de Costo/Almacén, invitación de equipo y asignación de roles. Seed data: Almacén General del tenant, roles por defecto.

**Paso 6 — RBAC**
Tablas de Role/Permission/UserRoleAssignment, los 9 roles por defecto, helper de verificación de alcance (`check-scope.ts`) usado en cada endpoint para prevenir BOLA.

**Paso 7 — Ledger de inventario + costeo**
Tabla `InventoryTransaction` (inmutable, con `idempotency_key` único), motor de costeo multi-moneda (`fx.ts`), motor FIFO/FEFO sugerido con override + motivo.

**Paso 8 — Lotes y ATP**
Tabla `Lot`, cálculo de Disponible-para-Prometer en vivo, reservas al aprobar una Requisition.

**Paso 9 — Flujo Requisition**
Estados completos, constraint de SOD (`requested_by != approved_by`), manejo de backorder parcial.

**Paso 10 — PurchaseOrder + Recepción**
Ciclo de vida de PO, recepción contra línea de PO → genera Lote con costo y moneda.

**Paso 11 — Importación de datos para onboarding de clientes reales**
Endpoint `/api/import` — catálogo, proveedores, saldos de apertura de inventario (como "recepción inicial" documentada en el ledger).

**Paso 12 — Reabastecimiento + ABC + conteos cíclicos**
Fórmula dinámica de punto de reorden, clasificación ABC recalculada cada 6 meses (Cron Job), calendario de conteo cíclico por clase, flujo de ajuste con tolerancia + segunda aprobación.

**Paso 13 — Escaneo (cámara/GS1)**
PWA con lectura de códigos de barra estándar (no solo QR propios), cola local de envíos pendientes con reintento automático (resiliencia ante cortes de conectividad).

**Paso 14 — Reportes**
Valorización histórica y presupuesto vs. real servidos desde vistas materializadas refrescadas por Cron Job.

**Paso 15 — Monetización nativa de monday**
Integración con monday Monetization API, definición mínima de planes/tiers (qué feature gatea cada plan), middleware de entitlements con cache + invalidación por webhook (verificación JWT HS256, no HMAC).

**Paso 16 — Auditoría administrativa**
Tabla `AdminAuditLog` separada del ledger de negocio — registra cambios de rol, configuración, desactivación de usuarios.

**Paso 17 — Seguridad endurecida**
CSP `frame-ancestors https://*.monday.com`, rate limiting (Upstash), escaneo de dependencias (SCA) en CI, suite de tests de cruce entre tenants (BOLA).

**Paso 18 — Desinstalación y retención**
Webhook de desinstalación → política de retención (30-90 días) antes de purga definitiva de datos del tenant.

**Paso 19 — Documentos legales (gate obligatorio)**
Esqueleto de Política de Privacidad y Términos de Uso con la estructura definida en Sección 16 — **marcado explícitamente como pendiente de revisión por un abogado antes de someter a monday**. No se publica sin este paso.

**Paso 20 — Pulido**
Estados vacíos, loading skeletons, paginación en toda tabla/listado grande, responsive, alto contraste verificado bajo luz solar simulada, objetivos táctiles ≥48px.

**Paso 21 — Testing**
Unitarios (costeo/FIFO/ATP), integración (Requisition→PO→Recepción), E2E (Playwright) de los flujos críticos, suite de BOLA/RLS.

**Paso 22 — Deploy y submission**
Deploy a Vercel Pro, submission al Developer Center de monday (checklist de las 4 fases de revisión), demo link, soporte/contacto.

---

## 10. Environment Setup

### Prerequisites
- Node.js 20+
- pnpm
- Cuenta de Developer Center de monday.com
- Cuenta Supabase (Pro)
- Cuenta Vercel (Pro)
- Cuenta Upstash (rate limiting)
- Cuenta Sentry

### Environment Variables
| Variable | Description | Where to Get |
|----------|-------------|---------------|
| `MONDAY_CLIENT_ID` | OAuth client ID de la app | Developer Center de monday |
| `MONDAY_CLIENT_SECRET` | OAuth client secret — **solo server-side** | Developer Center de monday |
| `MONDAY_SIGNING_SECRET` | Verificación JWT de webhooks y session tokens | Developer Center de monday |
| `DATABASE_URL` | Conexión **pooler puerto 6543, Transaction Mode** | Supabase — Connection Pooling settings |
| `DIRECT_DATABASE_URL` | Conexión directa puerto 5432, **solo para migraciones** | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasea RLS — **solo server-side, nunca en bundle de cliente** | Supabase |
| `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` | Rate limiting | Upstash |
| `SENTRY_DSN` | Observabilidad de errores | Sentry |
| `NEXT_PUBLIC_MONDAY_CLIENT_ID` | Única variable segura de exponer al cliente (es pública por diseño en el flujo OAuth) | — |

### Initial Setup Commands
```bash
pnpm create next-app@latest monday-wms --typescript --tailwind --app
cd monday-wms
pnpm add drizzle-orm postgres @monday/apps-sdk pino zod
pnpm add -D drizzle-kit
pnpm dlx shadcn@latest init
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

---

## 11. Dependencies

### Core
| Package | Purpose |
|---------|---------|
| next | Framework full-stack |
| drizzle-orm, postgres | ORM + driver (con `prepare: false` para pooler) |
| monday-sdk-js | Contexto e integración con el iframe de monday |
| jose | Verificación de JWT (session tokens y webhooks) |
| zod | Validación de input en cada endpoint |
| @tanstack/react-query | Estado de servidor en cliente |
| @upstash/ratelimit, @upstash/redis | Rate limiting |
| decimal.js | Aritmética decimal donde Drizzle/Postgres NUMERIC no sea suficiente en el cliente |
| @sentry/nextjs | Observabilidad |

### Dev
| Package | Purpose |
|---------|---------|
| drizzle-kit | Migraciones |
| vitest | Tests unitarios |
| playwright | Tests E2E |
| @types/node | Tipos |

---

## 12. Deployment Strategy

### Hosting
**Vercel Pro desde el día uno** — Hobby está explícitamente prohibido para uso comercial. $20/asiento/mes con créditos flexibles. Habilitar Fluid Compute para reducir cold starts dentro del iframe de monday.

### Base de datos
**Supabase Pro desde el lanzamiento comercial** ($25/mes) — el plan Free se pausa tras 7 días de inactividad, inaceptable para clientes reales pagando. Costo de arranque realista: **~$45-50/mes**, escalando por asiento/uso sin re-arquitectura. Solo se evalúa mover trabajo pesado a un worker dedicado (Railway) o Supabase Team ($599/mes) cuando el ingreso lo justifique.

### CI/CD
GitHub Actions: build + lint + tests unitarios/integración + **suite de BOLA/cruce de tenants** en cada PR; migración de schema solo tras aprobación manual en producción (nunca automática en un push).

### Environments
Development (local, Supabase branch de desarrollo) → Preview (Vercel preview deploys por PR, Supabase branch temporal) → Production (Vercel Pro + Supabase Pro, con point-in-time recovery activado).

---

## 13. Testing Strategy

### Unit Tests (Vitest)
Motor de costeo FIFO/FEFO, cálculo de ATP, fórmula de punto de reorden, clasificación ABC — estas son las partes donde un bug cuesta dinero real a un cliente.

### Integration Tests
Flujo completo Requisition → Aprobación → Despacho/Backorder → PO → Recepción → Lote → Ledger, contra una base de datos de prueba real (nunca mockeada — un mock que pasa y una migración real que falla es exactamente el tipo de divergencia que hay que evitar).

**Suite dedicada de seguridad**: intentos deliberados de cruce entre tenants (BOLA) y verificación de que `SET LOCAL app.tenant_id` nunca persiste entre requests bajo pooling de transacción.

### E2E Tests (Playwright)
Flujo de instalación + onboarding, creación y aprobación de una solicitud por dos usuarios con roles distintos, escaneo de código de barra en recepción.

---

## 14. Skills to Use During Build

| Skill | When to Use | Why |
|-------|-------------|-----|
| `/frontend-design` | Pasos 5, 9, 13, 20 (wizard, flujo de solicitud, escaneo, pulido) | UI production-grade distintiva |
| `/shadcn-ui` | Paso 1 (scaffolding) | Setup y personalización de componentes |
| `/ui-ux-pro-max` | Sección 7 (Design System) — **si está instalado en el entorno del builder** | Principios de soft-UI minimalista ya incorporados arriba; si el skill está disponible, úsalo para refinar paletas/tipografía adicionales |
| `/playwright-cli` | Paso 21 (testing) | Automatización de los E2E críticos |

---

## 15. CLAUDE.md for Target Project

```markdown
# Monday WMS (nombre pendiente)

WMS multi-tenant embebido en monday.com Marketplace, para gestión de almacenes de construcción (horizontal a cualquier sector). Centro de Costo → Almacén → Ubicación, costeo por lote multi-moneda, RBAC con segregación de funciones.

## Commands

- `pnpm dev` — Servidor de desarrollo
- `pnpm build` — Build de producción
- `pnpm lint` — Linter
- `pnpm test` — Tests unitarios (Vitest)
- `pnpm test:e2e` — Tests E2E (Playwright)
- `pnpm drizzle-kit generate` — Generar migración desde el schema
- `pnpm drizzle-kit migrate` — Aplicar migraciones

## Tech Stack

Next.js 15 (App Router) + TypeScript estricto + Tailwind v4/shadcn/ui + PostgreSQL (Supabase, pooler Transaction Mode) + Drizzle ORM + monday Apps SDK (Custom Object) + Vercel Pro

## Architecture

### Directory Structure
- `src/app/(embedded)/` — Vistas servidas dentro del iframe de monday
- `src/app/api/` — Rutas de API (mutaciones, webhooks, reportes)
- `src/lib/db/` — Cliente Drizzle, schema, helper de tenant context, políticas RLS
- `src/lib/monday/` — SDK wrapper, verificación de session token y webhooks JWT
- `src/lib/costing/` — FIFO/FEFO, multi-moneda, ATP, reorder point, ABC
- `src/lib/rbac/` — Permisos atómicos, verificación de alcance (anti-BOLA)

### Data Flow
Cliente (dentro del iframe de monday) → signed session token verificado en middleware → Server Component/API route → `withTenant()` (SET LOCAL + transacción) → Drizzle → Postgres con RLS forzada.

### Key Patterns
1. **Toda query de negocio pasa por `withTenant()`** — nunca una query directa fuera de ese wrapper.
2. **El ledger (`InventoryTransaction`) es append-only** — nunca UPDATE ni DELETE sobre filas existentes.
3. **Toda mutación crítica lleva `idempotency_key`** — recepción, despacho, ajuste de conteo.
4. **Server Components por defecto**; "use client" solo donde hay interactividad real.
5. **Verificación de alcance (BOLA) en cada endpoint**, no solo chequeo de rol — pertenencia a tenant + cost_center/warehouse del actor.

## Code Organization Rules

1. **Un componente por archivo.** Máximo 300 líneas.
2. **Alias de rutas:** usar `@/` para `src/`.
3. **Sin barrel exports.** Importar directo del archivo fuente.
4. **Server Components por defecto.**
5. **Cantidades y costos siempre `numeric`/`DECIMAL`, nunca `float`/`double`.**

## Design System

### Colors
Primary `#2F6F4E` · Secondary `#4A7FA6` · Background `#FAFAF8` · Surface `#FFFFFF` · Text `#1A1D1B` · Muted `#6B7268` · Destructive `#C0392B` · Success `#27804F` · Warning `#B8860B`

### Typography
- Headings: Montserrat 700, 24-32px
- Body: Montserrat 400-500, 15-16px
- **Tema claro forzado siempre** — anular el toggle de tema oscuro del SDK de monday

### Style
Border radius 10px (16px cards) · sombras suaves `0 2px 8px rgba(0,0,0,0.06)` · spacing base 4px · objetivos táctiles ≥48px (uso con guantes en campo) · alto contraste (uso bajo sol directo)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONDAY_CLIENT_ID` / `MONDAY_CLIENT_SECRET` / `MONDAY_SIGNING_SECRET` | OAuth + verificación JWT |
| `DATABASE_URL` | Pooler Supabase, puerto 6543, Transaction Mode |
| `DIRECT_DATABASE_URL` | Puerto 5432, solo migraciones |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasea RLS — solo server-side |
| `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` | Rate limiting |
| `SENTRY_DSN` | Observabilidad |

## Reglas No Negociables

1. **Nunca usar `SET` a secas para el tenant context — siempre `SET LOCAL` dentro de una transacción explícita.** Con pooling en modo transacción, olvidar `LOCAL` filtra el tenant de una request a la siguiente.
2. **`FORCE ROW LEVEL SECURITY` en toda tabla con `tenant_id`**, y la app se conecta con un rol no-dueño, sin `BYPASSRLS`.
3. **Nunca prefijar un secreto con `NEXT_PUBLIC_`.** Revisar esto en cada PR antes de merge.
4. **Conexión de aplicación siempre vía el pooler (puerto 6543, Transaction Mode, `prepare: false`)** — nunca el puerto directo 5432 fuera de migraciones.
5. **Toda cantidad/costo es `NUMERIC`/`DECIMAL`, nunca `float`/`double`.**
6. **El ledger es inmutable** — correcciones son transacciones nuevas que referencian la original, nunca UPDATE/DELETE.
7. **`requested_by != approved_by` y `approved_by != dispatched_by`** se valida en el backend, no solo se sugiere en la UI.
8. **Verificación de webhooks de monday es JWT (HS256) contra el Signing Secret — no HMAC sobre el body.**
9. **CSP `frame-ancestors https://*.monday.com`** — nunca `'none'` (rompería el embedding) ni abierto a cualquier dominio.
10. **No se somete la app al Developer Center sin que Política de Privacidad y Términos de Uso hayan pasado revisión legal profesional.**
```

---

## 16. Reglas No Negociables

1. **Nunca usar `SET` a secas para el tenant context — siempre `SET LOCAL` dentro de una transacción explícita** (ver Sección 4, migración RLS). Es la diferencia entre aislamiento real entre tenants y una fuga silenciosa de datos.
2. **`FORCE ROW LEVEL SECURITY`** en toda tabla con `tenant_id`, con la app conectada bajo un rol dedicado no-dueño, sin `BYPASSRLS`.
3. **Conexión de base de datos siempre vía pooler en Transaction Mode (puerto 6543)**, `prepare: false` en Drizzle — el puerto directo 5432 es exclusivo de migraciones.
4. **Toda cantidad y costo usa tipos `NUMERIC`/`DECIMAL`.** Nunca `float`/`double` en ningún cálculo financiero o de conversión de UOM.
5. **El ledger de inventario (`InventoryTransaction`) es append-only.** Ninguna corrección se hace con UPDATE/DELETE — siempre una transacción nueva referenciando la original.
6. **Segregación de funciones aplicada en el backend**: `requested_by != approved_by`, `approved_by != dispatched_by` son constraints de aplicación, no solo botones ocultos en la UI.
7. **Verificación de BOLA en cada endpoint que recibe un ID**: pertenencia a tenant + alcance del actor (cost_center/warehouse asignado), nunca solo verificación de rol.
8. **Nunca exponer un secreto con el prefijo `NEXT_PUBLIC_`.** La service role key de Supabase es exclusivamente server-side.
9. **Webhooks de monday se verifican con JWT (HS256) contra el Signing Secret** — no es un patrón HMAC como Stripe.
10. **CSP `frame-ancestors https://*.monday.com`** en todas las páginas embebidas — ni `'none'` ni abierto.
11. **Idempotency key obligatoria** en recepción, despacho y ajuste de conteo.
12. **Paginación obligatoria en cualquier listado** — ninguna tabla carga "todo" sin límite, sin importar qué tan pequeño parezca el tenant hoy.
13. **No se publica en el Marketplace sin que Política de Privacidad y Términos de Uso hayan pasado revisión de un abogado** — el gate del Paso 19 es bloqueante, no opcional.
14. **Vercel Hobby y Supabase Free están prohibidos para el ambiente de producción** — Pro en ambos desde el lanzamiento comercial.
15. **Objetivos táctiles mínimo 48x48px y contraste alto** en toda la UI de campo (recepción, despacho, escaneo) — se usa al sol, a veces con guantes.
