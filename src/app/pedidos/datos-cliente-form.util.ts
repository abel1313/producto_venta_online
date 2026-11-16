import Swal from 'sweetalert2';
import { escaparHtml } from '../shared/escapar-html.util';
import { hoyIso } from '../shared/fecha.util';

/** Los datos del cliente del pedido: los mismos campos del formulario «Cliente sin registro» de Venta directa. */
export interface DatosDelCliente {
  nombre: string;
  segundoNombre?: string;
  apellido?: string;
  apellidoMaterno?: string;
  /** yyyy-MM-dd */
  fechaNacimiento?: string;
  sexo?: string;
  correo?: string;
  telefono?: string;
}

const CORREO_VALIDO = /^[A-Za-z0-9._%+'\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const letras = (t: string): number => t.replace(/[^\p{L}]/gu, '').length;

/**
 * Modal con los mismos datos que el de Venta directa (nombre, segundo nombre, apellidos, fecha de nacimiento, sexo, correo y teléfono) y las mismas
 * reglas que el back: nombre de 3 letras o más; los demás nombres, si se escriben, 3 letras o más; correo con forma de correo; teléfono de 10 dígitos.
 * Devuelve lo capturado, o null si se cancela. Lo usan «Agregar datos del cliente» y «Editar datos del cliente» del detalle del pedido.
 */
export async function pedirDatosDelCliente(opciones: { titulo: string; aviso?: string; textoBoton: string; inicial?: Partial<DatosDelCliente> }): Promise<DatosDelCliente | null> {
  const i = opciones.inicial ?? {};
  const v = (t: string | undefined | null) => escaparHtml(t ?? '');
  const campo = (id: string, etiqueta: string, valor: string | undefined | null, extra = '') =>
    `<label style="display:block;text-align:left;font-size:.8rem;margin:.35rem 0 0">${etiqueta}`
    + `<input id="dcf-${id}" class="swal2-input" style="margin:.15rem 0 0;width:100%;box-sizing:border-box" value="${v(valor)}" ${extra}></label>`;
  const r = await Swal.fire({
    title: opciones.titulo,
    html: (opciones.aviso ? `<p style="font-size:.85rem;margin:0 0 .4rem">${escaparHtml(opciones.aviso)}</p>` : '')
      + campo('nombre', 'Nombre *', i.nombre, 'type="text" required aria-required="true" placeholder="Nombre"')
      + campo('segundo', 'Segundo nombre', i.segundoNombre, 'type="text" placeholder="Segundo nombre (opcional)"')
      + campo('apellido', 'Apellido paterno', i.apellido, 'type="text" placeholder="Apellido paterno (opcional)"')
      + campo('materno', 'Apellido materno', i.apellidoMaterno, 'type="text" placeholder="Apellido materno (opcional)"')
      + campo('nacimiento', 'Fecha de nacimiento', i.fechaNacimiento, `type="date" max="${hoyIso()}"`)
      + campo('sexo', 'Sexo', i.sexo, 'type="text" maxlength="10" placeholder="M / F (opcional)"')
      + campo('correo', 'Correo electrónico', i.correo, 'type="email" placeholder="correo@ejemplo.com (opcional)"')
      + campo('tel', 'Número telefónico', i.telefono, 'type="tel" placeholder="10 dígitos (opcional)"'),
    showCancelButton: true, confirmButtonText: opciones.textoBoton, cancelButtonText: 'Cancelar', focusConfirm: false,
    preConfirm: () => {
      const val = (id: string) => ((document.getElementById('dcf-' + id) as HTMLInputElement | null)?.value ?? '').trim();
      const d: DatosDelCliente = {
        nombre: val('nombre'), segundoNombre: val('segundo'), apellido: val('apellido'), apellidoMaterno: val('materno'),
        fechaNacimiento: val('nacimiento'), sexo: val('sexo'), correo: val('correo'), telefono: val('tel')
      };
      if (letras(d.nombre) < 3) { Swal.showValidationMessage('El nombre debe tener al menos 3 letras'); return false; }
      for (const [t, etiqueta] of [[d.segundoNombre, 'El segundo nombre'], [d.apellido, 'El apellido paterno'], [d.apellidoMaterno, 'El apellido materno']] as [string, string][]) {
        if (t && letras(t) < 3) { Swal.showValidationMessage(`${etiqueta} debe tener al menos 3 letras (o déjalo vacío)`); return false; }
      }
      if (d.fechaNacimiento && d.fechaNacimiento > hoyIso()) { Swal.showValidationMessage('La fecha de nacimiento no puede ser futura'); return false; }
      if (d.correo && (d.correo.length > 150 || !CORREO_VALIDO.test(d.correo))) { Swal.showValidationMessage('El correo no es válido: debe verse como nombre@dominio.com'); return false; }
      if (d.telefono && !/^\d{10}$/.test(d.telefono.replace(/[\s()+-]/g, '').replace(/^52(?=\d{10}$)/, ''))) { Swal.showValidationMessage('El teléfono debe tener 10 dígitos (solo números)'); return false; }
      d.telefono = d.telefono ? d.telefono.replace(/[\s()+-]/g, '').replace(/^52(?=\d{10}$)/, '') : '';
      return d;
    }
  });
  return r.isConfirmed && r.value ? (r.value as DatosDelCliente) : null;
}
