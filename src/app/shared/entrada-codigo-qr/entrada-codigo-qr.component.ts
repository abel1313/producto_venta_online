import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { IScannerControls } from '@zxing/browser';
import Swal from 'sweetalert2';
import { iniciarEscanerConAutofoco } from '../barcode-scanner.util';
import { AuthService } from 'src/app/auth/auth.service';
import { EscanerReceptorService } from '../escaner-celular/escaner-receptor.service';
import { extraerCodigo, esUuid, leerQrDeImagen } from './codigo-qr.util';

/**
 * Campo para el código de cliente de una campaña. Tres formas de ponerlo: escribirlo o pegarlo, 📷 escanear su QR con la cámara, o 🖼️ subir
 * (o pegar) la imagen del QR. Siempre emite el UUID limpio (si el QR trae una liga, se queda con el código).
 */
@Component({
  selector: 'app-entrada-codigo-qr',
  templateUrl: './entrada-codigo-qr.component.html',
  styleUrls: ['./entrada-codigo-qr.component.scss']
})
export class EntradaCodigoQrComponent implements OnInit, OnDestroy {
  @Input() valor = '';
  @Input() placeholder = 'Código del cliente (pega o escanea su QR)';
  @Output() valorChange = new EventEmitter<string>();

  camaraAbierta = false;
  errorCamara = '';
  private controles: IScannerControls | null = null;

  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;

  private desregistrar: (() => void) | null = null;

  constructor(private readonly receptor: EscanerReceptorService, private readonly authService: AuthService) {}

  /**
   * El celular que ya se usa para códigos de barras también puede mandar el QR: mientras este campo existe se registra como receptor de los códigos que
   * son UUID (los de barras siguen yendo al buscador de siempre). Solo con sesión iniciada, igual que el botón 📱.
   */
  ngOnInit(): void {
    if (this.authService.rolesValue.length === 0) return;
    this.desregistrar = this.receptor.registrar(codigo => this.poner(codigo), codigo => esUuid(codigo));
  }

  ngOnDestroy(): void {
    this.cerrarCamara();
    this.desregistrar?.();
    this.desregistrar = null;
  }

  /** Un lector USB con otra distribución de teclado escribe `'` donde va `-`: se corrige antes de reconocer el código. */
  private arreglarLector(texto: string): string {
    return /^[0-9a-f]{8}['-][0-9a-f]{4}['-][0-9a-f]{4}['-][0-9a-f]{4}['-][0-9a-f]{12}$/i.test(texto.trim()) ? texto.trim().replace(/'/g, '-') : texto;
  }

  /** Enter (el lector USB lo manda al terminar): se avisa para buscar el código ya mismo. */
  @Output() enter = new EventEmitter<void>();

  alEscribir(texto: string): void {
    this.valor = extraerCodigo(this.arreglarLector(texto));
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
