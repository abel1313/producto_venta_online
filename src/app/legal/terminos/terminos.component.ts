import { Component } from '@angular/core';
import { DatosLegalesService, telefonoLegible } from '../datos-legales.service';

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

  /** Quién vende, domicilio, teléfono y correo (LFPC 76 bis III): Configuración del negocio → Datos legales. */
  readonly datos$ = this.datosLegales.obtener();
  readonly telefonoLegible = telefonoLegible;

  /**
   * Se muestra al pie. Actualizar cuando cambie el contenido de los términos (el registro guarda
   * la fecha en que cada cliente los aceptó, así se sabe qué versión aceptó).
   */
  readonly ultimaActualizacion = '7 de octubre de 2026';

  constructor(private readonly datosLegales: DatosLegalesService) {}
}
