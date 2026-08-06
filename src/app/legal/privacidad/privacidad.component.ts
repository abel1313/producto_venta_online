import { Component } from '@angular/core';

/**
 * Política de Privacidad — página PÚBLICA (sin `AuthGuard`), ruta `/privacidad`.
 *
 * Existe porque Meta la exige en Configuración → Básico de la app de Facebook: sin una URL de
 * política de privacidad accesible **sin iniciar sesión**, ni siquiera deja generar el token de
 * prueba en el Graph API Explorer. Por eso la ruta no lleva ningún guard: si Meta se topa con
 * un redirect al login, la da por inválida.
 */
@Component({
  selector: 'app-privacidad',
  templateUrl: './privacidad.component.html',
  styleUrls: ['./privacidad.component.scss']
})
export class PrivacidadComponent {

  /**
   * ⚠️ CONFIRMAR ANTES DE PUBLICAR: este es el correo al que van a escribir los clientes que
   * quieran consultar, corregir o eliminar sus datos. Tiene que ser una cuenta que alguien
   * realmente lea.
   */
  readonly correoContacto = 'contacto@novedades-jade.com.mx';

  /** Se muestra al pie. Actualizar cuando cambie el contenido de la política. */
  readonly ultimaActualizacion = '5 de agosto de 2026';
}
