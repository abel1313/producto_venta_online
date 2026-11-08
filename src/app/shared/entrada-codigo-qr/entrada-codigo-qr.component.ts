import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { IScannerControls } from '@zxing/browser';
import Swal from 'sweetalert2';
import { iniciarEscanerConAutofoco } from '../barcode-scanner.util';
import { extraerCodigo, leerQrDeImagen } from './codigo-qr.util';

/**
 * Campo para el código de cliente de una campaña. Tres formas de ponerlo: escribirlo o pegarlo, 📷 escanear su QR con la cámara, o 🖼️ subir
 * (o pegar) la imagen del QR. Siempre emite el UUID limpio (si el QR trae una liga, se queda con el código).
 */
@Component({
  selector: 'app-entrada-codigo-qr',
  templateUrl: './entrada-codigo-qr.component.html',
  styleUrls: ['./entrada-codigo-qr.component.scss']
})
export class EntradaCodigoQrComponent implements OnDestroy {
  @Input() valor = '';
  @Input() placeholder = 'Código del cliente (pega o escanea su QR)';
  @Output() valorChange = new EventEmitter<string>();

  camaraAbierta = false;
  errorCamara = '';
  private controles: IScannerControls | null = null;

  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;

  ngOnDestroy(): void { this.cerrarCamara(); }

  alEscribir(texto: string): void {
    this.valor = extraerCodigo(texto);
    this.valorChange.emit(this.valor);
  }

  private poner(codigo: string): void {
    this.valor = extraerCodigo(codigo);
    this.valorChange.emit(this.valor);
  }

  // ── Imagen del QR (subir o pegar) ──────────────────────────────────────────
  async alElegirArchivo(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (archivo) await this.leerImagen(archivo);
  }

  async alPegar(ev: ClipboardEvent): Promise<void> {
    const imagen = Array.from(ev.clipboardData?.files ?? []).find(f => f.type.startsWith('image/'));
    if (!imagen) return;          // texto: lo maneja el campo normal
    ev.preventDefault();
    await this.leerImagen(imagen);
  }

  private async leerImagen(archivo: Blob): Promise<void> {
    try {
      this.poner(await leerQrDeImagen(archivo));
    } catch {
      Swal.fire({ icon: 'warning', title: 'No se pudo leer el QR', text: 'Prueba con una imagen más nítida o escribe el código.' });
    }
  }

  // ── Cámara ─────────────────────────────────────────────────────────────────
  async abrirCamara(): Promise<void> {
    this.errorCamara = '';
    this.camaraAbierta = true;
    setTimeout(async () => {
      const el = this.video?.nativeElement;
      if (!el) return;
      try {
        this.controles = await iniciarEscanerConAutofoco(el, (resultado) => {
          if (resultado) {
            this.poner(resultado.getText());
            this.cerrarCamara();
          }
        });
      } catch {
        this.errorCamara = 'No se pudo abrir la cámara. Revisa el permiso del navegador.';
      }
    });
  }

  cerrarCamara(): void {
    this.controles?.stop();
    this.controles = null;
    this.camaraAbierta = false;
  }
}
