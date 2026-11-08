import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { extraerCodigo } from 'src/app/shared/entrada-codigo-qr/codigo-qr.util';

/**
 * Página pública `/codigo-campana/:uuid` (la liga del correo): solo dibuja el QR del código. No pide sesión ni llama al servidor, y no muestra
 * ningún dato personal: el código por sí solo no dice de quién es.
 */
@Component({
  selector: 'app-codigo-publico',
  template: `
    <main class="cpub">
      <h1 class="cpub__marca">Novedades Jade</h1>
      <p class="cpub__texto">Tu código de cliente. Enséñalo al comprar para llevar tu avance en la campaña.</p>
      <div class="cpub__qr" *ngIf="codigo; else invalido">
        <qrcode [qrdata]="codigo" [width]="260" [errorCorrectionLevel]="'M'" [margin]="2" elementType="canvas"></qrcode>
      </div>
      <code class="cpub__codigo" *ngIf="codigo">{{ codigo }}</code>
      <ng-template #invalido><p class="cpub__texto">Esta liga no trae un código válido.</p></ng-template>
    </main>
  `,
  styles: [`
    .cpub { min-height: 100vh; display: grid; align-content: center; justify-items: center; gap: 14px; padding: 24px 16px;
            background: var(--app-bg); color: var(--app-text); text-align: center; }
    .cpub__marca { margin: 0; font-size: 1.4rem; }
    .cpub__texto { margin: 0; max-width: 32rem; color: var(--app-text-muted); }
    .cpub__qr { padding: 12px; background: #fff; border-radius: 14px; border: 1px solid var(--card-border); }
    .cpub__codigo { max-width: 100%; overflow-wrap: anywhere; font-size: .85rem; color: var(--app-text); }
  `]
})
export class CodigoPublicoComponent {
  readonly codigo: string;

  constructor(ruta: ActivatedRoute) {
    const crudo = ruta.snapshot.paramMap.get('uuid') ?? '';
    const limpio = extraerCodigo(crudo);
    // Solo se dibuja si de verdad es un UUID: así la página no sirve para pintar QR de texto arbitrario.
    this.codigo = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(limpio) ? limpio : '';
  }
}
