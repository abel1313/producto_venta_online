import Swal from 'sweetalert2';
import { Observable } from 'rxjs';

/**
 * Pago y entrega son dos cosas (dominio entrega, back 2026-10-06; skill reglas-pedidos 2.4).
 * Lo comparten la card de Mis pedidos, el detalle, Créditos / Abonos y la venta.
 */

export type EstadoPago = 'PAGADO' | 'FALTA_PAGAR' | 'CANCELADO';

/** Texto y color de las dos etiquetas de la card. */
export interface EtiquetaCard { texto: string; clase: 'ok' | 'falta' | 'neutro'; icono: string; }

export function etiquetaPago(pago: EstadoPago, falta?: number | null): EtiquetaCard {
  if (pago === 'CANCELADO') return { texto: 'Cancelado', clase: 'neutro', icono: 'pi-times-circle' };
  if (pago === 'PAGADO') return { texto: 'Pagado', clase: 'ok', icono: 'pi-check-circle' };
  const monto = falta && falta > 0.005
    ? ' ' + falta.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : '';
  return { texto: 'Falta pagar' + monto, clase: 'falta', icono: 'pi-clock' };
}

export function etiquetaEntrega(entregado: boolean): EtiquetaCard {
  return entregado
    ? { texto: 'Entregado', clase: 'ok', icono: 'pi-check' }
    : { texto: 'Falta entregar', clase: 'falta', icono: 'pi-box' };
}

/**
 * "¿Ya se lo llevó?" después de cobrar. Ninguna opción viene marcada (regla 2.3): cerrar la
 * ventana cuenta como "todavía no", y queda el botón 📦 Entregar en la card.
 */
export async function preguntarSiSeLoLlevo(texto?: string): Promise<boolean> {
  const r = await Swal.fire({
    icon: 'question',
    title: '¿Ya se lo llevó?',
    text: texto ?? 'Si todavía no, queda como "Falta entregar" y lo marcas después con 📦 Entregar.',
    showConfirmButton: true,
    showDenyButton: true,
    confirmButtonText: '✅ Sí, ya se lo llevó',
    denyButtonText: '📦 Todavía no',
    allowOutsideClick: false
  });
  return r.isConfirmed;
}

/**
 * Pregunta y, si dijo que sí, lo marca entregado. Siempre termina llamando a `alTerminar`
 * (aunque falle la entrega: el cobro ya quedó y la card ofrecerá 📦 Entregar).
 */
export async function preguntarYEntregar(
  entregar: () => Observable<unknown>, alTerminar: () => void, texto?: string): Promise<void> {
  const seLoLlevo = await preguntarSiSeLoLlevo(texto);
  if (!seLoLlevo) { alTerminar(); return; }
  entregar().subscribe({
    next: () => {
      Swal.fire({ icon: 'success', title: 'Marcado como entregado', timer: 1500, showConfirmButton: false });
      alTerminar();
    },
    error: err => {
      Swal.fire({ icon: 'warning', title: 'Se cobró, pero no se pudo marcar como entregado',
        text: (err?.error?.mensaje ?? 'Márcalo con 📦 Entregar en la tarjeta.') });
      alTerminar();
    }
  });
}
