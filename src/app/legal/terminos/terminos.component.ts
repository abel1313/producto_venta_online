import { Component } from '@angular/core';

/**
 * Términos y Condiciones — página PÚBLICA (sin `AuthGuard`), ruta `/termConditions`.
 *
 * Mismo motivo que `/privacidad` (ver ese componente): TikTok exige una URL de Términos de
 * Servicio accesible sin iniciar sesión para aprobar la app de developers.tiktok.com. La URL
 * exacta (`termConditions`, sin guiones) ya estaba registrada en el portal de TikTok antes de
 * que existiera esta página -- se respeta ese nombre en vez de renombrarla, para no tener que
 * volver a editar la configuración de la app ahí.
 */
@Component({
  selector: 'app-terminos',
  templateUrl: './terminos.component.html',
  styleUrls: ['./terminos.component.scss']
})
export class TerminosComponent {

  readonly correoContacto = 'contacto@novedades-jade.com.mx';

  /** Se muestra al pie. Actualizar cuando cambie el contenido de los términos. */
  readonly ultimaActualizacion = '25 de agosto de 2026';
}
