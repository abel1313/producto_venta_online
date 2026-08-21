export interface ITicketArticulo {
  cantidad:       number;
  productoNombre: string;
  talla?:         string | null;
  subTotal:       number;
}

export interface ITicketAbonoItem {
  monto: number;
  fecha?: string | null;
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
  // Historial completo de abonos de este pedido, en orden (incluye el de hoy si ya se
  // registró). Si se manda, reemplaza las líneas agregadas "Abonos previos"/"Abono de
  // hoy" por un renglón "Abono N: fecha — monto" por cada uno, para que se vea en qué
  // fecha se dio cada pago, no solo el acumulado.
  abonos?:         ITicketAbonoItem[] | null;
  metodoPago:      string;
  montoDado?:      number | null;
  cambio?:         number | null;
  motivo?:         string | null;
  qrTienda?:       string | null;
  qrWhatsapp?:     string | null;
  qrFacebook?:     string | null;
  qrInstagram?:    string | null;
  qrTiktok?:       string | null;
}

const fmt = (n: number | null | undefined): string =>
  n != null ? `$${n.toFixed(2)}` : '';

/** dd/MM/yyyy — siempre 2 dígitos día y mes, 4 dígitos año */
function fmtFecha(raw?: string | null): string {
  const d = raw ? new Date(raw) : new Date();
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function generarHtmlTicket(d: ITicketData): string {
  const hoy = fmtFecha(d.fecha);

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
    : `<div class="fila"><span>MÉTODO:</span><span>${(d.metodoPago || 'N/A').toUpperCase()}</span></div>`;

  const filaTotal = d.total != null ? `<div class="fila total"><span>TOTAL:</span><span>${fmt(d.total)}</span></div>` : '';

  // Si hay historial completo, se listan los abonos uno por uno con su fecha ("Abono 1",
  // "Abono 2"...) en vez de solo el acumulado — así se ve en qué fecha se dio cada pago.
  const filaHistorialAbonos = (d.abonos && d.abonos.length)
    ? d.abonos.map((a, i) =>
        `<div class="fila"><span>Abono ${i + 1} (${fmtFecha(a.fecha)}):</span><span>${fmt(a.monto)}</span></div>`
      ).join('')
    : '';

  // Fallback (sin historial detallado): línea agregada, como antes. "Abonos previos" en
  // vez de "Ya pagado" — ese número es lo pagado ANTES del abono de hoy, no el total.
  const labelPagado     = d.tipo === 'abono' ? 'Abonos previos:' : 'Ya pagado:';
  const filaTotalPagado = !filaHistorialAbonos && d.totalPagado != null && d.tipo !== 'liquidado'
    ? `<div class="fila"><span>${labelPagado}</span><span>${fmt(d.totalPagado)}</span></div>` : '';
  const filaAbono       = !filaHistorialAbonos && d.abonoHoy != null
    ? `<div class="fila"><span>Abono de hoy:</span><span>${fmt(d.abonoHoy)}</span></div>` : '';

  const filaSaldo       = d.saldoPendiente != null && d.saldoPendiente > 0
    ? `<div class="fila"><span>Saldo pendiente:</span><span>${fmt(d.saldoPendiente)}</span></div>` : '';
  const filaLiquidado   = d.tipo === 'liquidado' ? `<div class="centro bold">✅ PAGADO COMPLETAMENTE</div>` : '';
  const filaMotivo      = d.motivo ? `<div>Motivo: ${d.motivo}</div>` : '';

  const qrUrl = (url: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=80x80&ecc=L&data=${encodeURIComponent(url)}`;

  const qrs: string[] = [];
  if (d.qrTienda)   qrs.push(`<div class="qr-item"><img src="${qrUrl(d.qrTienda)}" width="80" height="80"><div class="qr-label">Tienda</div></div>`);
  if (d.qrWhatsapp) qrs.push(`<div class="qr-item"><img src="${qrUrl(d.qrWhatsapp)}" width="80" height="80"><div class="qr-label">WhatsApp</div></div>`);
  if (d.qrFacebook) qrs.push(`<div class="qr-item"><img src="${qrUrl(d.qrFacebook)}" width="80" height="80"><div class="qr-label">Facebook</div></div>`);
  if (d.qrInstagram) qrs.push(`<div class="qr-item"><img src="${qrUrl(d.qrInstagram)}" width="80" height="80"><div class="qr-label">Instagram</div></div>`);
  if (d.qrTiktok)   qrs.push(`<div class="qr-item"><img src="${qrUrl(d.qrTiktok)}" width="80" height="80"><div class="qr-label">TikTok</div></div>`);
  const seccionQr = qrs.length
    ? `<div class="linea"></div><p class="centro" style="font-size:9px;margin:4px 0">Síguenos</p><div class="qr-row">${qrs.join('')}</div>`
    : '';

  return `
    <div class="titulo">NOVEDADES JADE</div>
    <div class="subtitulo">${encabezado}</div>
    <div class="linea"></div>
    <div class="fila"><span>Folio #${d.numero}</span><span>${hoy}</span></div>
    <div class="cliente">Cliente: ${d.cliente}</div>
    <div class="linea"></div>
    ${filasArticulos}
    <div class="linea"></div>
    ${filaTotal}${filaHistorialAbonos}${filaTotalPagado}${filaAbono}${filaSaldo}${filaLiquidado}${filaMotivo}
    <div class="linea"></div>
    ${filaPago}
    <div class="linea"></div>
    <div class="centro">¡Gracias por tu compra!</div>
    ${seccionQr}
  `;
}

export function generarTextoWhatsapp(d: ITicketData): string {
  const hoy = fmtFecha(d.fecha);
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
  const ventana = window.open('', '_blank', 'width=320,height=650');
  if (!ventana) return;
  ventana.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 4mm 3mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            width: 72mm;
            margin: 0 auto;
            padding: 0;
            color: #000;
            background: #fff;
          }
          .titulo   { text-align: center; font-weight: bold; font-size: 15px; margin: 2px 0; }
          .subtitulo{ text-align: center; font-weight: bold; font-size: 12px; margin: 2px 0; }
          .cliente  { font-size: 11px; margin: 2px 0; }
          .linea    { border: none; border-top: 1px dashed #000; margin: 5px 0; }
          .fila     { display: flex; justify-content: space-between; margin: 1px 0; }
          .total    { font-weight: bold; font-size: 12px; }
          .centro   { text-align: center; }
          .bold     { font-weight: bold; }
          .qr-row   { display: flex; justify-content: center; gap: 10px; padding: 5px 0; flex-wrap: wrap; }
          .qr-item  { display: flex; flex-direction: column; align-items: center; }
          .qr-label { font-size: 9px; text-align: center; margin-top: 2px; }
        </style>
      </head>
      <body>
        ${htmlTicket}
        <script>
          (function() {
            var imgs = document.querySelectorAll('img');
            if (!imgs.length) { window.print(); return; }
            var pending = imgs.length;
            function tryPrint() {
              pending--;
              if (pending <= 0) { setTimeout(function(){ window.print(); }, 100); }
            }
            for (var i = 0; i < imgs.length; i++) {
              if (imgs[i].complete) { tryPrint(); }
              else { imgs[i].onload = imgs[i].onerror = tryPrint; }
            }
          })();
        <\/script>
      </body>
    </html>
  `);
  ventana.document.close();
}
