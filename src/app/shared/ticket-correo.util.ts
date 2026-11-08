/**
 * El ticket para el CORREO. `generarHtmlTicket` arma el de la impresora térmica con clases CSS (`.fila`, `.total`…) que solo existen en la ventana de
 * impresión; en un correo esas clases no existen y todo sale como texto suelto. Esta función toma ese mismo HTML y lo rehace con estilos EN LÍNEA y
 * tablas (lo único que los correos respetan), con los colores de la marca. El ticket que se imprime y el texto de WhatsApp no cambian.
 *
 * Los QR («Síguenos») siguen siendo `<img src="https://api.qrserver.com/…">`: el servidor los convierte en imágenes incrustadas del correo.
 */
const VERDE = '#00875A';
const VERDE_SUAVE = '#EAF6F0';
const GRIS = '#6b7280';
const LINEA = '#e5e7eb';
const TEXTO = '#1f2937';
const FUENTE = 'Arial,Helvetica,sans-serif';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Convierte el HTML del ticket de impresión en uno apto para correo. Si algo no se puede leer, devuelve el original (nunca se pierde el ticket). */
export function htmlTicketParaCorreo(htmlImpresion: string): string {
  try {
    if (!htmlImpresion || !/class="(fila|titulo|subtitulo|linea)/.test(htmlImpresion)) return htmlImpresion;   // ya viene diseñado (o no es de ticket)
    const cuerpo = new DOMParser().parseFromString(`<body>${htmlImpresion}</body>`, 'text/html').body;
    const filas: string[] = [];
    Array.from(cuerpo.children).forEach(el => { const f = filaDeCorreo(el as HTMLElement); if (f) filas.push(f); });
    if (!filas.length) return htmlImpresion;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-family:${FUENTE};color:${TEXTO};font-size:14px;line-height:1.5;">${filas.join('')}</table>`;
  } catch {
    return htmlImpresion;
  }
}

function tr(contenido: string, estiloTd = ''): string {
  return `<tr><td style="padding:3px 0;${estiloTd}">${contenido}</td></tr>`;
}

function filaDeCorreo(el: HTMLElement): string {
  const c = el.classList;
  const texto = (el.textContent ?? '').trim();

  if (c.contains('titulo')) return '';                       // el encabezado de marca ya lo pone la plantilla del correo
  if (c.contains('subtitulo')) {
    return tr(`<div style="text-align:center;font-size:18px;font-weight:700;color:${VERDE};letter-spacing:.4px;padding:2px 0 6px;">${esc(texto)}</div>`);
  }
  if (c.contains('linea')) {
    return `<tr><td style="padding:6px 0;"><div style="border-top:1px solid ${LINEA};height:0;line-height:0;font-size:0;">&nbsp;</div></td></tr>`;
  }
  if (c.contains('cliente')) {
    const nombre = texto.replace(/^Cliente:\s*/i, '');
    return tr(`<span style="color:${GRIS};font-size:12px;">Cliente</span><br><strong style="font-size:15px;">${esc(nombre)}</strong>`);
  }
  if (c.contains('fila')) {
    const hijos = Array.from(el.children) as HTMLElement[];
    const izq = hijos[0]?.textContent?.trim() ?? '';
    const der = hijos[1]?.innerHTML ?? '';
    const derTexto = hijos[1]?.textContent?.trim() ?? '';
    const chica = (el.getAttribute('style') ?? '').includes('font-size:9px');     // la línea de «Precio de campaña» bajo un artículo
    if (c.contains('total')) {
      return `<tr><td style="padding:6px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:${VERDE_SUAVE};border-radius:8px;"><tr>`
        + `<td style="padding:12px 14px;font-size:15px;font-weight:700;color:${VERDE};">${esc(izq.replace(/:$/, ''))}</td>`
        + `<td align="right" style="padding:12px 14px;font-size:22px;font-weight:700;color:${VERDE};white-space:nowrap;">${esc(derTexto)}</td></tr></table></td></tr>`;
    }
    if (chica) {
      return `<tr><td style="padding:0 0 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;"><tr>`
        + `<td style="font-size:12px;color:${VERDE};font-weight:700;">${esc(izq)}</td>`
        + `<td align="right" style="font-size:12px;color:${GRIS};white-space:nowrap;">${der}</td></tr></table></td></tr>`;
    }
    // renglón normal: «2x NOMBRE» a la izquierda, el importe a la derecha
    const esArticulo = /^\d+x\s/i.test(izq);
    return `<tr><td style="padding:4px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;"><tr>`
      + `<td style="font-size:${esArticulo ? 14 : 13}px;${esArticulo ? 'font-weight:600;' : `color:${GRIS};`}">${esc(izq)}</td>`
      + `<td align="right" style="font-size:${esArticulo ? 14 : 13}px;font-weight:700;white-space:nowrap;padding-left:10px;">${esc(derTexto)}</td></tr></table></td></tr>`;
  }
  if (c.contains('qr-row')) {
    const items = Array.from(el.querySelectorAll('.qr-item')) as HTMLElement[];
    const celdas = items.map(it => {
      const img = it.querySelector('img');
      const etiqueta = it.querySelector('.qr-label')?.textContent?.trim() ?? '';
      return `<td align="center" style="padding:6px 8px;">${img ? `<img src="${esc(img.getAttribute('src') ?? '')}" width="80" height="80" alt="QR ${esc(etiqueta)}" style="display:block;border:1px solid ${LINEA};border-radius:6px;">` : ''}`
        + `<div style="font-size:11px;color:${GRIS};margin-top:4px;">${esc(etiqueta)}</div></td>`;
    }).join('');
    return `<tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>${celdas}</tr></table></td></tr>`;
  }
  if (c.contains('centro')) {
    const chico = (el.getAttribute('style') ?? '').includes('font-size:9px');
    if (!texto) return '';
    if (c.contains('bold')) return tr(`<div style="text-align:center;font-weight:700;color:${VERDE};font-size:15px;">${esc(texto)}</div>`);
    if (chico && /^Síguenos$/i.test(texto)) return tr(`<div style="text-align:center;font-size:13px;color:${GRIS};padding-top:2px;">${esc(texto)}</div>`);
    if (chico) return tr(`<div style="text-align:center;font-size:11px;color:${GRIS};">${el.innerHTML.replace(/<br\s*\/?>/gi, '<br>')}</div>`);
    return tr(`<div style="text-align:center;font-size:16px;font-weight:700;padding-top:2px;">${esc(texto)}</div>`);
  }
  if (el.tagName === 'P') {
    return /^Síguenos$/i.test(texto) ? tr(`<div style="text-align:center;font-size:13px;color:${GRIS};padding-top:2px;">${esc(texto)}</div>`) : (texto ? tr(`<div style="text-align:center;font-size:11px;color:${GRIS};">${esc(texto)}</div>`) : '');
  }
  return texto ? tr(`<div style="font-size:13px;color:${GRIS};">${esc(texto)}</div>`) : '';
}
