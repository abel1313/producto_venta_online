# Cobro desde la card de Mis pedidos (2026-10-06)

Un formulario por caso, sin `if (esGrupo)` / `if (esApartado)` mezclados: pedir algo para uno no toca
a los demás (decisión del dueño). Lo que es igual en todos vive en la herencia:

```
FormularioCobroBase            método, monto recibido y cambio, validaciones comunes, guardar()
├── CobroPedidoBase            POST /v1/abonos/{pedidoId}: detalle, fecha, ticket, correo, ramo urgente
│   ├── LiquidarApartadoComponent   💵 Liquidar (Apartado suelto): monto fijo = lo que debe
│   └── DarAbonoComponent           💳 Dar abono (Ir pagando suelto): monto libre
└── CobroGrupoBase             POST /v1/grupos-pedido/{grupoId}/abonos: saldo y pedidos del grupo
    ├── LiquidarGrupoComponent      💵 Liquidar (Apartados unidos): monto fijo = saldo del grupo
    └── AbonarGrupoComponent        💵 Abonar al grupo (Ir pagando unido): monto libre
```

`CampoPagoComponent` es la parte de pantalla que se repite (efectivo / transferencia y monto recibido
con su cambio). `cobro.scss` es el estilo común (el mismo aspecto que el modal de Créditos / Abonos).

Créditos / Abonos y el detalle del pedido **no** usan estos formularios todavía (siguen con el suyo).
Reglas: skill `reglas-pedidos` (2.1 Apartado sin dinero, 2.2 abono y cambio, sección 4 grupos).
