# Módulo Abonos (Apartado / Fiado) — Documentación Backend Java

> Rama: `dev` — Fecha: 2026-06-27

---

## 1. Qué se modificó y qué se creó

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `entity/Pedido.java` | +3 campos: `tipoPedido`, `totalPedido`, `totalPagado` |
| `models/pedidos/PedidosDTOPedido.java` | +`tipoPedido` en el request de crear pedido |
| `service/PedidoServiceImpl.java` | `savePedido` calcula `totalPedido`; `updatePedido` bloquea APARTADO/FIADO; `deletePedidoById` bloquea estado PAGADO |
| `security/SecurityConfig.java` | Regla nueva: `/v1/abonos/**` → `hasRole("ADMIN")` |

### Archivos creados

| Archivo | Propósito |
|---|---|
| `entity/AbonoPedido.java` | Entidad de cada pago parcial |
| `repository/IAbonoRepository.java` | Queries de abonos + queries de reportes |
| `models/abonos/AbonoRequest.java` | DTO entrada al registrar abono |
| `models/abonos/AbonoResponse.java` | DTO salida de un abono |
| `models/abonos/EstadoCuentaDto.java` | DTO reporte de pedidos con saldo pendiente |
| `models/abonos/ReportePagadosDto.java` | DTO reporte de pedidos liquidados |
| `service/api/IAbonoService.java` | Interfaz del servicio |
| `service/AbonoServiceImpl.java` | Lógica de negocio completa |
| `controller/AbonoController.java` | 4 endpoints REST |
| `resources/static/migration_abonos_pedido.sql` | DDL — ejecutar en BD antes de arrancar |

---

## 2. DDL — qué se aplica en la base de datos

Archivo: `src/main/resources/static/migration_abonos_pedido.sql`

```sql
-- Campos nuevos en pedidos
ALTER TABLE pedidos
    ADD COLUMN tipo_pedido  VARCHAR(10)    NOT NULL DEFAULT 'NORMAL',
    ADD COLUMN total_pedido DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN total_pagado DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- Tabla de abonos
CREATE TABLE abono_pedido (
    id           INT            NOT NULL AUTO_INCREMENT,
    pedido_id    INT            NOT NULL,
    monto        DECIMAL(10, 2) NOT NULL,
    fecha_pago   DATE           NOT NULL,
    metodo_pago  VARCHAR(15)    NOT NULL DEFAULT 'EFECTIVO',
    nota         VARCHAR(200)   NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_abono_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
);
```

> Ejecutar en `inventario_key` (dev), repetir en `inventario_key_qa` y en producción.

---

## 3. Cambios en la entidad Pedido

```java
// Campos nuevos en Pedido.java
@Column(name = "tipo_pedido", length = 10)
private String tipoPedido = "NORMAL";   // NORMAL | APARTADO | FIADO

@Column(name = "total_pedido")
private Double totalPedido = 0.0;       // suma de subTotales del detalle

@Column(name = "total_pagado")
private Double totalPagado = 0.0;       // se incrementa con cada abono
```

`saldo` no se persiste — se calcula siempre como `totalPedido - totalPagado`.

---

## 4. Cambios en PedidoServiceImpl

### savePedido — cambios aplicados

```java
// 1. Toma tipoPedido del request (default "NORMAL")
String tipoPedido = requestG.getTipoPedido() != null ? requestG.getTipoPedido() : "NORMAL";
pedido.setTipoPedido(tipoPedido);
pedido.setTotalPagado(0.0);

// 2. Calcula totalPedido al armar el detalle
double totalPedido = detallePedido.stream()
        .mapToDouble(DetallePedido::getSubTotal).sum();
pedido.setTotalPedido(totalPedido);
```

> El stock **siempre** se descuenta al crear el pedido, tanto para APARTADO como para FIADO.
> La diferencia es solo cuándo el cliente recoge físicamente el producto.

### updatePedido — bloqueo de pedidos de crédito

```java
// No se puede confirmar por el flujo normal de Venta si es APARTADO o FIADO
if ("APARTADO".equals(pedido.getTipoPedido()) || "FIADO".equals(pedido.getTipoPedido())) {
    throw new RuntimeException("Los pedidos de tipo " + pedido.getTipoPedido()
            + " se liquidan mediante abonos, no por esta vía");
}
```

### deletePedidoById — bloqueo adicional

```java
// Agrega "PAGADO" a los estados que no se pueden cancelar
if ("cancelado".equals(pedido.getEstadoPedido())
        || "Entregado".equals(pedido.getEstadoPedido())
        || "PAGADO".equals(pedido.getEstadoPedido())) {
    throw new RuntimeException("No se puede cancelar un pedido en estado: " + pedido.getEstadoPedido());
}
```

---

## 5. Entidad AbonoPedido

```java
@Entity
@Table(name = "abono_pedido")
public class AbonoPedido extends BaseId {

    @ManyToOne
    @JoinColumn(name = "pedido_id", nullable = false)
    @JsonBackReference
    private Pedido pedido;

    private Double monto;
    private LocalDate fechaPago;

    @Column(name = "metodo_pago", length = 15)
    private String metodoPago;   // EFECTIVO | TRANSFERENCIA | TARJETA

    @Column(length = 200)
    private String nota;
}
```

---

## 6. Lógica de negocio — AbonoServiceImpl

### registrarAbono (núcleo)

```
1. Buscar pedido — 404 si no existe
2. Validar que tipoPedido sea APARTADO o FIADO — error si es NORMAL
3. Validar que estadoPedido no sea PAGADO ni cancelado
4. Crear AbonoPedido con monto, fecha (default hoy), metodoPago, nota
5. Actualizar pedido.totalPagado += monto
6. Si totalPagado >= totalPedido:
     → estadoPedido = "PAGADO"
     → Si tipo = APARTADO: fechaRecogida = hoy  (el producto se entrega hoy)
7. Guardar abono y pedido en una misma transacción (@Transactional)
```

### reporteEstadoCuenta

- Query: `tipoPedido IN ('APARTADO','FIADO') AND estadoPedido NOT IN ('PAGADO','cancelado')`
- Devuelve: `totalPedido`, `totalPagado`, `saldo`, historial de abonos de cada pedido

### reportePagados

- Query: `tipoPedido IN ('APARTADO','FIADO') AND estadoPedido = 'PAGADO'`
- Devuelve: cliente, total, fecha del último pago, historial de abonos

---

## 7. Estados válidos de estadoPedido

| Valor | Descripción |
|---|---|
| `PENDIENTE` | Pedido normal sin confirmar (flujo existente) |
| `APARTADO` | Reservado, abonando, sin entregar |
| `FIADO` | Entregado de entrada, abonando |
| `PAGADO` | Liquidado — cierre automático al alcanzar totalPedido |
| `Entregado` | Confirmado por flujo normal de Venta (ya existía) |
| `cancelado` | Cancelado (ya existía) |

---

## 8. Flujos completos

### APARTADO (paga primero, entrega al liquidar)

```
POST /v1/pedidos/savePedido  { tipoPedido: "APARTADO", estadoPedido: "APARTADO" }
   → stock se descuenta (reservado)
   → totalPedido = suma detalle, totalPagado = 0

POST /v1/abonos/{id}  { monto: 100 }
   → totalPagado = 100, saldo = 250

POST /v1/abonos/{id}  { monto: 250 }
   → totalPagado = 350 >= totalPedido = 350
   → estadoPedido = "PAGADO", fechaRecogida = hoy  ← cliente recoge
```

### FIADO (entrega primero, paga después)

```
POST /v1/pedidos/savePedido  { tipoPedido: "FIADO", estadoPedido: "FIADO" }
   → stock se descuenta, cliente lleva el producto

POST /v1/abonos/{id}  { monto: 200 }
   → totalPagado = 200, saldo = 150

POST /v1/abonos/{id}  { monto: 150 }
   → totalPagado = 350 >= totalPedido = 350
   → estadoPedido = "PAGADO"  ← deuda saldada
```

---

## 9. Endpoints del módulo

| Método | URL | Auth | Descripción |
|---|---|---|---|
| `POST` | `/v1/pedidos/savePedido` | ADMIN | Ya existía — acepta `tipoPedido` |
| `POST` | `/v1/abonos/{pedidoId}` | ADMIN | Registrar un abono |
| `GET` | `/v1/abonos/{pedidoId}` | ADMIN | Historial de abonos del pedido |
| `GET` | `/v1/abonos/reporte/estado-cuenta` | ADMIN | Pedidos con saldo pendiente |
| `GET` | `/v1/abonos/reporte/pagados` | ADMIN | Pedidos liquidados |

---

## 10. Consideraciones para QA y producción

- Ejecutar el DDL **antes** de deployar el JAR.
- Los pedidos `NORMAL` existentes quedan con `tipo_pedido = 'NORMAL'`, `total_pedido = 0`, `total_pagado = 0` — no se ven afectados en ningún flujo.
- Si un pedido APARTADO se cancela antes de liquidar, el stock ya fue devuelto por el `deletePedidoById` existente. Los abonos registrados quedan como registro histórico (no se borran en cascada).
