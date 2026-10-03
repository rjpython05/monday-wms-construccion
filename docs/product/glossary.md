# Glosario del dominio

Extiende el Anexo A de `/docs/execution/master-plan.md` con términos específicos del producto (blueprint). Única fuente de significado para estos términos en toda la documentación y el código.

| Término | Definición |
|---|---|
| **ABC (clasificación)** | Segmentación de ítems por valor de consumo acumulado (A = mayor valor, C = menor), recalculada periódicamente (Cron Job), usada para priorizar conteos cíclicos. |
| **Almacén (Warehouse)** | Ubicación física o lógica de almacenamiento, perteneciente a un único Centro de Costo. Tipos: principal, secundario, temporal. |
| **Almacén General** | Almacén/pool especial por tenant (`is_general_pool = true`), destino por defecto de remanentes al cerrar un Centro de Costo. |
| **ATP** (*Available To Promise*) | Cantidad que puede comprometerse: saldo disponible menos reservas activas y stock no disponible (cuarentena, vencido). |
| **BFLA** | *Broken Function Level Authorization*: acceso a una función no permitida para el rol del actor. |
| **BOLA** | *Broken Object Level Authorization*: acceso a un objeto ajeno manipulando su identificador. |
| **BOM** (*Bill of Materials*) | Lista de materiales requeridos por una Fase o Ítem compuesto. Funcionalidad posterior al piloto. |
| **Backorder** | Cantidad aprobada que no pudo despacharse por falta de stock disponible y queda pendiente de cumplimiento. |
| **Centro de Costo (Cost Center)** | Unidad de imputación de costos (etiqueta configurable por tenant, p. ej. "Proyecto/Obra"). Contiene Almacenes y, opcionalmente, Fases. |
| **Custom Object** | Feature del framework de apps de monday.com que permite que una vista viva de forma independiente en el menú lateral, a pantalla completa, sin atarse a un board. Es el tipo de feature elegido para este WMS. |
| **Entitlement** | Derecho de un tenant a usar una función según su plan comercial, verificado en el backend. |
| **Expand/contract** | Patrón de migración en pasos compatibles que evita cambios destructivos en un solo despliegue. |
| **FEFO** | *First Expired, First Out*: se consume primero el lote que vence antes. |
| **FIFO** | *First In, First Out*: se consume primero el lote que ingresó antes. |
| **Fase (Phase)** | Subdivisión opcional de un Centro de Costo (p. ej. etapa de obra), con presupuesto propio. No confundir con "fase" del plan de ejecución (Parte III del plan maestro). |
| **Gate** | Conjunto de condiciones verificables que deben cumplirse para aprobar una fase de ejecución. |
| **Idempotency key** | Identificador de una intención de operación que garantiza que reintentarla no duplica efectos. |
| **Ledger** | Registro append-only de movimientos de inventario (`InventoryTransaction`); fuente de verdad del stock y su valor. |
| **Lote (Lot)** | Conjunto de unidades de un ítem con mismo origen, costo (congelado) y, cuando aplica, fecha de vencimiento. |
| **Outbox** | Patrón que registra eventos en la misma transacción que el cambio de negocio, para entregarlos después de forma confiable a sistemas externos. |
| **PITR** | *Point-In-Time Recovery*: restauración de la base de datos a un instante específico. |
| **PurchaseOrder (PO)** | Orden de compra a un proveedor; ciclo borrador → enviada → recibida parcial/completa → cerrada/cancelada. |
| **Punto de reorden (Reorder point)** | Umbral de stock que, al cruzarse, sugiere generar una nueva compra. Fórmula dinámica, recalculada por Cron Job. |
| **Requisition (Solicitud)** | Solicitud de material; ciclo pendiente → aprobada (total/parcial) → en despacho → despachada (parcial/cerrada) → rechazada/cancelada. |
| **RLS** | *Row Level Security*: políticas de PostgreSQL que filtran y validan filas por contexto (tenant). |
| **RPO / RTO** | Pérdida máxima de datos aceptable / tiempo máximo de recuperación. |
| **Signed session token** | Token firmado que monday.com inyecta en el contexto del iframe en cada carga; identifica `accountId`, `userId` y metadatos. Se verifica en el servidor contra el **Client Secret** de la app (distinto del Signing Secret de webhooks — ver ADR-008). |
| **Signing Secret** | Secreto de la app usado para verificar la firma JWT de las peticiones de webhooks/integración (cabecera `Authorization`). Distinto del Client Secret. |
| **SLO** | Objetivo de nivel de servicio medible. |
| **SoD** | Segregación de funciones: una misma persona no puede ejecutar pasos incompatibles de un mismo proceso (p. ej. solicitar y aprobar). |
| **Tenant** | Cuenta de monday.com que instala la aplicación (`monday_account_id`); unidad de aislamiento de datos. |
| **Ubicación (Location)** | Nodo de un árbol jerárquico sin ciclos dentro de un Almacén; nivel más fino de localización de stock. |
| **UOM** (*Unit of Measure*) | Unidad de medida de un ítem; `UOMConversion` define factores de conversión hacia la unidad base. |
