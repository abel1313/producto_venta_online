import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { extraerCodigo } from 'src/app/shared/entrada-codigo-qr/codigo-qr.util';

/**
 * Página pública `/codigo-campana/:uuid` (la liga del correo): dibuja el QR del código. No pide sesión ni llama al servidor, y no muestra ningún dato
 * personal: el código por sí solo no dice de quién es. El cliente puede **descargar** el QR como imagen o **compartirlo** (por ejemplo, por WhatsApp)
 * y mostrarlo en la tienda; el QR va grande y con margen para que se lea bien aunque la imagen se comprima.
 */
@Component({
  selector: 'app-codigo-publico',
  template: `
    <main class="cpub">
      <h1 class="cpub__marca">Novedades Jade</h1>
      <p class="cpub__texto">Tu código de cliente. Enséñalo al comprar para llevar tu avance en la campaña.</p>
      <div class="cpub__qr" *ngIf="codigo; else invalido" #caja>
        <qrcode [qrdata]="codigo" [width]="600" [errorCorrectionLevel]="'M'" [margin]="4" elementType="canvas"></qrcode>
      </div>
      <code class="cpub__codigo" *ngIf="codigo">{{ codigo }}</code>
      <div class="cpub__acciones" *ngIf="codigo">
        <button type="button" class="cpub__btn" (click)="descargar()">⬇️ Descargar imagen</button>
        <button type="button" class="cpub__btn" *ngIf="puedeCompartir" (click)="compartir()">📤 Compartir</button>
      </div>
      <p class="cpub__aviso" *ngIf="aviso">{{ aviso }}</p>
      <ng-template #invalido><p class="cpub__texto">Esta liga no trae un código válido.</p></ng-template>
    </main>
  `,
  styles: [`
    .cpub { min-height: 100vh; display: grid; align-content: center; justify-items: center; gap: 14px; padding: 24px 16px;
            background: var(--app-bg); color: var(--app-text); text-align: center; }
    .cpub__marca { margin: 0; font-size: 1.4rem; }
    .cpub__texto { margin: 0; max-width: 32rem; color: var(--app-text-muted); }
    .cpub__qr { padding: 12px; background: #fff; border-radius: 14px; border: 1px solid var(--card-border); max-width: 100%; }
    .cpub__qr ::ng-deep canvas { width: min(320px, 80vw) !important; height: auto !important; display: block; }
    .cpub__codigo { max-width: 100%; overflow-wrap: anywhere; font-size: .85rem; color: var(--app-text); }
    .cpub__acciones { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
    .cpub__btn { padding: 10px 16px; border-radius: 10px; cursor: pointer; font-size: .95rem;
                 background: var(--btn-primary-bg); color: var(--btn-primary-text); border: 1px solid var(--btn-primary-border); }
    .cpub__aviso { margin: 0; font-size: .85rem; color: var(--app-text-muted); }
  `]
})
export class CodigoPublicoComponent {
  readonly codigo: string;
  aviso = '';
  @ViewChild('caja') caja?: ElementRef<HTMLElement>;

  constructor(ruta: ActivatedRoute) {
    const crudo = ruta.snapshot.paramMap.get('uuid') ?? '';
    const limpio = extraerCodigo(crudo);
    // Solo se dibuja si de verdad es un UUID: así la página no sirve para pintar QR de texto arbitrario.
    this.codigo = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(limpio) ? limpio : '';
  }

  get puedeCompartir(): boolean {
    return typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';
  }

  /** El QR sobre fondo blanco, con el código escrito abajo (por si hay que teclearlo), como PNG. */
  private imagen(): Promise<Blob | null> {
    const origen = this.caja?.nativeElement.querySelector('canvas');
    if (!origen) return Promise.resolve(null);
    const margen = 24, texto = 40;
    const c = document.createElement('canvas');
    c.width = origen.width + margen * 2;
    c.height = origen.height + margen * 2 + texto;
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = false;
    g.drawImage(origen, margen, margen);
    g.fillStyle = '#222';
    g.font = '18px monospace';
    g.textAlign = 'center';
    g.fillText(this.codigo, c.width / 2, c.height - 14);
    return new Promise(res => c.toBlob(b => res(b), 'image/png'));
  }

  async descargar(): Promise<void> {
    const b = await this.imagen();
    if (!b) { this.aviso = 'No se pudo preparar la imagen. Haz una captura de pantalla.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'codigo-novedades-jade.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async compartir(): Promise<void> {
    const b = await this.imagen();
    if (!b) { this.aviso = 'No se pudo preparar la imagen. Haz una captura de pantalla.'; return; }
    const archivo = new File([b], 'codigo-novedades-jade.png', { type: 'image/png' });
    const nav: any = navigator;
    try {
      if (nav.canShare && nav.canShare({ files: [archivo] })) {
        await nav.share({ files: [archivo], title: 'Mi código de cliente · Novedades Jade' });
      } else {
        await this.descargar();
      }
    } catch { /* el cliente canceló */ }
  }
}
