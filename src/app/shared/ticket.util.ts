export interface ITicketArticulo {
  cantidad:       number;
  productoNombre: string;
  talla?:         string | null;
  subTotal:       number;
}

export interface ITicketData {
  tipo:            'venta' | 'abono' | 'liquidado' | 'cancelacion';
  numero:          number;
  fecha?:          string;
  cliente:         string;
  articulos:       ITicketArticulo[];
  total?:          number | null;
  totalPagado?:    number | null;
  saldoPendiente?: number | null;
  abonoHoy?:       number | null;
  metodoPago:      string;
  montoDado?:      number | null;
  cambio?:         number | null;
  motivo?:         string | null;
  // QR codes — se muestran al pie del ticket si están presentes
  qrTienda?:       string | null;
  qrWhatsapp?:     string | null;
  qrFacebook?:     string | null;
}

const fmt = (n: number | null | undefined): string =>
  n != null ? `$${n.toFixed(2)}` : '';

export function generarHtmlTicket(d: ITicketData): string {
  const hoy = d.fecha || new Date().toLocaleDateString('es-MX');

  let encabezado = '';
  if (d.tipo === 'venta')       encabezado = 'COMPROBANTE DE VENTA';
  if (d.tipo === 'abono')       encabezado = 'COMPROBANTE DE ABONO';
  if (d.tipo === 'liquidado')   encabezado = '¡APARTADO LIQUIDADO!';
  if (d.tipo === 'cancelacion') encabezado = 'CANCELACIÓN DE PEDIDO';

  const filasArticulos = d.articulos.map(a =>
    `<div class="fila"><span>${a.cantidad}x ${a.productoNombre}${a.talla ? ' ' + a.talla : ''}</span><span>${fmt(a.subTotal)}</span></div>`
  ).join('');

  const filaPago = (d.metodoPago ?? '').toUpperCase() === 'EFECTIVO'
    ? `<div class="fila"><span>ENTREGÓ:</span><span>${fmt(d.montoDado)}</span></div>
       <div class="fila"><span>CAMBIO:</span><span>${fmt(d.cambio)}</span></div>`
    : `<div class="fila"><span>MÉTODO:</span><span>TRANSFERENCIA</span></div>`;

  const filaTotal       = d.total != null ? `<div class="fila total"><span>TOTAL:</span><span>${fmt(d.total)}</span></div>` : '';
  const filaTotalPagado = d.totalPagado != null && d.tipo !== 'liquidado'
    ? `<div class="fila"><span>Ya pagado:</span><span>${fmt(d.totalPagado)}</span></div>` : '';
  const filaAbono       = d.abonoHoy != null ? `<div class="fila"><span>Abono de hoy:</span><span>${fmt(d.abonoHoy)}</span></div>` : '';
  const filaSaldo       = d.saldoPendiente != null && d.saldoPendiente > 0
    ? `<div class="fila"><span>Saldo pendiente:</span><span>${fmt(d.saldoPendiente)}</span></div>` : '';
  const filaLiquidado   = d.tipo === 'liquidado' ? `<div class="centro">✅ PAGADO COMPLETAMENTE</div>` : '';
  const filaMotivo      = d.motivo ? `<div>Motivo: ${d.motivo}</div>` : '';

  const qrUrl = (url: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=70x70&ecc=L&data=${encodeURIComponent(url)}`;

  const qrs: string[] = [];
  if (d.qrTienda)    qrs.push(`<div class="qr-item"><img src="${qrUrl(d.qrTienda)}" width="70" height="70"><div class="qr-label">Tienda</div></div>`);
  if (d.qrWhatsapp)  qrs.push(`<div class="qr-item"><img src="${qrUrl(d.qrWhatsapp)}" width="70" height="70"><div class="qr-label">WhatsApp</div></div>`);
  if (d.qrFacebook)  qrs.push(`<div class="qr-item"><img src="${qrUrl(d.qrFacebook)}" width="70" height="70"><div class="qr-label">Facebook</div></div>`);
  const seccionQr = qrs.length
    ? `<div class="linea"></div><div class="qr-row">${qrs.join('')}</div>`
    : '';

  return `
    <div class="titulo">NOVEDADES JADE</div>
    <div class="titulo">${encabezado}</div>
    <div class="linea"></div>
    <div class="fila"><span>Folio #${d.numero}</span><span>${hoy}</span></div>
    <div>Cliente: ${d.cliente}</div>
    <div class="linea"></div>
    ${filasArticulos}
    <div class="linea"></div>
    ${filaTotal}${filaTotalPagado}${filaAbono}${filaSaldo}${filaLiquidado}${filaMotivo}
    <div class="linea"></div>
    ${filaPago}
    <div class="linea"></div>
    <div class="centro">¡Gracias por tu compra!</div>
    ${seccionQr}
  `;
}

export function generarTextoWhatsapp(d: ITicketData): string {
  const hoy = d.fecha || new Date().toLocaleDateString('es-MX');
  const tipo = d.tipo;

  const lineas: string[] = [
    '🛍️ NOVEDADES JADE',
    tipo === 'venta'       ? 'Comprobante de venta' :
    tipo === 'abono'       ? 'Comprobante de abono' :
    tipo === 'liquidado'   ? '✅ Apartado liquidado' :
                             '❌ Cancelación de pedido',
    `Folio #${d.numero} — ${hoy}`,
    `Cliente: ${d.cliente}`,
    '─────────────────────',
    ...d.articulos.map(a =>
      `• ${a.cantidad}x ${a.productoNombre}${a.talla ? ' ' + a.talla : ''} — ${fmt(a.subTotal)}`
    ),
    '─────────────────────',
  ];

  if (d.total != null)                              lineas.push(`Total: ${fmt(d.total)}`);
  if (d.abonoHoy != null)                           lineas.push(`Abono de hoy: ${fmt(d.abonoHoy)}`);
  if (d.saldoPendiente != null && d.saldoPendiente > 0) lineas.push(`Saldo pendiente: ${fmt(d.saldoPendiente)}`);
  if (tipo === 'liquidado')                          lineas.push('✅ PAGADO COMPLETAMENTE');
  if (d.motivo)                                     lineas.push(`Motivo cancelación: ${d.motivo}`);

  lineas.push('─────────────────────');
  lineas.push(`Método: ${d.metodoPago}`);
  if ((d.metodoPago ?? '').toUpperCase() === 'EFECTIVO' && d.montoDado) {
    lineas.push(`Entregó: ${fmt(d.montoDado)}`);
    lineas.push(`Cambio: ${fmt(d.cambio)}`);
  }
  lineas.push('¡Gracias por tu compra! 🙏');

  return lineas.join('\n');
}

export function imprimirTicket(htmlTicket: string): void {
  const ventana = window.open('', '_blank', 'width=400,height=600');
  if (!ventana) return;
  ventana.document.write(`
    <html>
      <head>
        <title>Ticket</title>
        <style>
          body      { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 8px; }
          .titulo   { text-align: center; font-weight: bold; font-size: 14px; }
          .linea    { border-top: 1px dashed #000; margin: 4px 0; }
          .fila     { display: flex; justify-content: space-between; }
          .total    { font-weight: bold; }
          .centro   { text-align: center; }
          .qr-row   { display: flex; justify-content: center; gap: 12px; padding: 6px 0; flex-wrap: wrap; }
          .qr-item  { display: flex; flex-direction: column; align-items: center; }
          .qr-label { font-size: 9px; text-align: center; margin-top: 2px; }
          @media print { body { width: 100%; } }
        </style>
      </head>
      <body>
        ${htmlTicket}
        <script>window.print(); window.close();<\/script>
      </body>
    </html>
  `);
  ventana.document.close();
}
