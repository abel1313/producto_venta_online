import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CORREO_CONTACTO_RESPALDO, DatosLegalesService, telefonoLegible } from '../datos-legales.service';

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
export class PrivacidadComponent implements OnDestroy {

  /**
   * Responsable, domicilio, teléfono y correo: Configuración del negocio → Datos legales. El correo
   * es al que escriben los clientes para sus derechos ARCO: tiene que ser una cuenta que alguien lea.
   */
  readonly datos$ = this.datosLegales.obtener();
  readonly telefonoLegible = telefonoLegible;
  correo = CORREO_CONTACTO_RESPALDO;
  private readonly sub: Subscription;

  /** Se muestra al pie. Actualizar cuando cambie el contenido del aviso. */
  readonly ultimaActualizacion = '7 de octubre de 2026';

  constructor(private readonly datosLegales: DatosLegalesService) {
    this.sub = this.datos$.subscribe(d => this.correo = d.correo || CORREO_CONTACTO_RESPALDO);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
