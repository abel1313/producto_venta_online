import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { Subscription } from 'rxjs';
import { AuthService } from '../../auth/auth.service';

/** Una opción a explicar: el texto que se ve en pantalla y qué significa. */
export interface OpcionConAyuda {
  texto: string;
  ayuda?: string;
}

/**
 * Ícono ⓘ que explica cada opción de un grupo (filtros, estados…). Pedido del dueño 2026-10-07:
 * "poner el ícono de la descripción de cada cosa".
 *
 * - Los textos son fijos (van en las opciones, campo `ayuda`): si el dueño pide cambiar uno, se
 *   cambia en el código. Decidido 2026-10-07.
 * - Lo ven los mismos que el "?" de cada pantalla: el administrador y los roles con el permiso
 *   **Ayuda contextual** (Sistema → Gestión de roles). Sin ese permiso el ícono no aparece.
 * - Las opciones sin `ayuda` no salen en la lista; si ninguna tiene, no sale el ícono.
 *
 * Uso: `<app-ayuda-opciones titulo="Forma de cobro" [opciones]="opcionesForma"></app-ayuda-opciones>`
 */
@Component({
  selector: 'app-ayuda-opciones',
  templateUrl: './ayuda-opciones.component.html',
  styleUrls: ['./ayuda-opciones.component.scss']
})
export class AyudaOpcionesComponent implements OnInit, OnDestroy {

  @Input() titulo = '';
  @Input() opciones: OpcionConAyuda[] = [];

  abierto = false;
  puedeVer = false;

  readonly posiciones: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top',    offsetY:  6 },
    { originX: 'end',   originY: 'bottom', overlayX: 'end',   overlayY: 'top',    offsetY:  6 },
    { originX: 'start', originY: 'top',    overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
    { originX: 'end',   originY: 'top',    overlayX: 'end',   overlayY: 'bottom', offsetY: -6 }
  ];

  private readonly subs = new Subscription();

  constructor(private readonly auth: AuthService, private readonly host: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    // Los permisos viajan en el token y se re-emiten al refrescar la sesión.
    this.subs.add(this.auth.pantallas$.subscribe(() => this.recalcularPermiso()));
    this.recalcularPermiso();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get conAyuda(): OpcionConAyuda[] {
    return (this.opciones ?? []).filter(o => !!o.ayuda);
  }

  alternar(evento: Event): void {
    // El ícono vive dentro de títulos y botones: que el clic no dispare lo de abajo.
    evento.stopPropagation();
    this.abierto = !this.abierto;
  }

  cerrarPorFuera(evento: MouseEvent): void {
    if (this.host.nativeElement.contains(evento.target as Node)) return;
    this.abierto = false;
  }

  @HostListener('document:keydown.escape')
  escape(): void { this.abierto = false; }

  private recalcularPermiso(): void {
    this.puedeVer = this.auth.isAdminService || this.auth.tienePantalla('ayuda-contextual');
  }
}
