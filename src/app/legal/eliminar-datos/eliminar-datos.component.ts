import { Component } from '@angular/core';

/**
 * Instrucciones para eliminar datos — página PÚBLICA (sin guards), ruta `/eliminar-datos`.
 * Es la "URL de instrucciones de eliminación de datos" que pide Meta en Configuración → Básica.
 */
@Component({
  selector: 'app-eliminar-datos',
  templateUrl: './eliminar-datos.component.html',
  styleUrls: ['../privacidad/privacidad.component.scss']
})
export class EliminarDatosComponent {

  /** Mismo buzón que el de la Política de Privacidad. */
  readonly correoContacto = 'contacto@novedades-jade.com.mx';

  readonly ultimaActualizacion = '24 de septiembre de 2026';
}
