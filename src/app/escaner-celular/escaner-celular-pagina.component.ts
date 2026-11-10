import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { IScannerControls } from '@zxing/browser';
import { iniciarEscanerConAutofoco } from '../shared/barcode-scanner.util';
import { EscanerCelularService } from '../shared/escaner-celular/escaner-celular.service';
import { esUuid, extraerCodigo, leerQrDeImagen } from '../shared/entrada-codigo-qr/codigo-qr.util';
import { hayVersionNueva } from '../shared/version-nueva.util';

type Tono = 'ok' | 'warn' | 'bad' | '';

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'codabar'];
const SALIDA_DEL_CUADRO_MS = 1000;
const REINTENTO_MS = 1500;

/**
 * Pantalla del CELULAR de la cuenta (`/escaner-celular`, con sesión iniciada): la cámara queda siempre lista y cada código leído se manda a la
 * cuenta; llega a la pantalla que tengas abierta en la computadora (con el mismo usuario), sin QR ni pasos en medio. Manda una señal cada 15 s
 * para que la computadora sepa que el celular está conectado.
 */
@Component({
  selector: 'app-escaner-celular-pagina',
  templateUrl: './escaner-celular-pagina.component.html',
  styleUrls: ['./escaner-celular-pagina.component.scss']
})
export class EscanerCelularPaginaComponent implements OnInit, OnDestroy {
  @ViewChild('video', { static: true }) video!: ElementRef<HTMLVideoElement>;

  estado = 'Conectando…';
  tono: Tono = 'warn';
  ultimo = '';
  enviadoAhora = false;
  error: { titulo: string; texto: string } | null = null;
  /** Foto tomada, esperando que se confirme el envío (data URL JPEG). */
  fotoPrevia: string | null = null;
  enviandoFoto = false;

  /** `/escaner-qr`: lee solo el QR del código de cliente de una campaña (con la cámara o con una foto) y lo manda a la computadora como código. */
  readonly modoQr: boolean;

  private stream: MediaStream | null = null;
  private controlesZxing: IScannerControls | null = null;
  private cicloNativo: ReturnType<typeof setTimeout> | null = null;
  private latidos: ReturnType<typeof setInterval> | null = null;
  /** Revisa cada 10 min si hay una versión nueva del front: esta página se deja abierta todo el día y nunca se recargaría sola. */
  private vigiaVersion: ReturnType<typeof setInterval> | null = null;
  private wakeLock: { release: () => Promise<void> } | null = null;
  private destruido = false;
  private arrancando = false;
  /** Un código frente a la cámara cuenta como UN escaneo: se vuelve a mandar solo si salió del cuadro ≥1 s y regresó. */
  private visto = { texto: '', ultimaVez: 0, enviado: false, reintentoDesde: 0 };

  constructor(
    private readonly svc: EscanerCelularService,
    private readonly location: Location,
    private readonly router: Router,
    route: ActivatedRoute
  ) {
    this.modoQr = route.snapshot.data['modo'] === 'qr';
  }

  /** Lo que dice el estado cuando todo está listo. */
  get textoListo(): string {
    return this.modoQr ? 'Listo: apunta al QR del cliente' : 'Listo: apunta al código de barras';
  }

  /** La página cubre toda la pantalla (es del celular) y tapaba el menú: sin este botón, en la computadora no había cómo salir. */
  volver(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      void this.router.navigate(['/home']);
    }
  }

  ngOnInit(): void {
    void this.iniciar();
    this.vigiaVersion = setInterval(() => void this.recargarSiHayVersionNueva(), 10 * 60 * 1000);
  }

  /** Si se publicó una versión nueva, se recarga la página (vuelve sola al escáner; la sesión y el enlace con la PC no se pierden). */
  private async recargarSiHayVersionNueva(): Promise<void> {
    if (this.destruido || this.fotoPrevia || this.enviandoFoto) return;
    if (await hayVersionNueva()) window.location.reload();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.vigiaVersion) clearInterval(this.vigiaVersion);
    this.apagar();
    if (this.latidos) clearInterval(this.latidos);
    void this.wakeLock?.release().catch(() => undefined);
  }

  /** Al volver de segundo plano o de la pantalla bloqueada la cámara puede haberse detenido (sobre todo en iPhone): se revisa y se reinicia. */
  @HostListener('document:visibilitychange')
  alCambiarVisibilidad(): void {
    if (document.hidden || this.destruido || this.error) return;
    void this.recargarSiHayVersionNueva();
    this.pedirPantallaEncendida();
    this.latido();
    if (!this.camaraViva() && !this.arrancando) { this.apagar(); void this.iniciar(); }
  }

  reintentar(): void {
    this.error = null;
    void this.iniciar();
  }

  private async iniciar(): Promise<void> {
    if (this.arrancando || this.destruido) return;
    this.arrancando = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.arrancando = false;
      this.fallar('No se pudo abrir la cámara', 'Abre la tienda con el navegador del celular (Chrome o Safari), con la dirección que empieza con https.');
      return;
    }
    try {
      const Detector = (window as any).BarcodeDetector;
      const soportados: string[] | null = Detector?.getSupportedFormats ? await Promise.resolve(Detector.getSupportedFormats()).catch(() => null) : null;
      const nativo = !!soportados && (this.modoQr ? soportados.includes('qr_code') : (soportados.includes('ean_13') || soportados.includes('code_128')));
      if (nativo) await this.conDetectorNativo(Detector, soportados); else await this.conZxing();
      if (this.destruido) { this.apagar(); return; }
      this.arrancando = false;
      this.mostrar(this.textoListo, 'ok');
      this.latido();
      if (this.latidos) clearInterval(this.latidos);
      this.latidos = setInterval(() => this.latido(), 15000);
      this.pedirPantallaEncendida();
    } catch {
      this.arrancando = false;
      this.fallar('No se pudo abrir la cámara', 'Revisa que el navegador tenga permiso de cámara y que la dirección empiece con https.');
    }
  }

  private async conDetectorNativo(Detector: any, soportados: string[] | null): Promise<void> {
    // También el QR del código de cliente de una campaña, si este celular lo sabe leer (zxing ya lo lee en cualquier caso). Solo se pide lo que el detector soporta.
    const formatos = this.modoQr ? ['qr_code'] : (soportados && soportados.includes('qr_code') ? [...FORMATOS, 'qr_code'] : FORMATOS);
    const detector = new Detector({ formats: formatos });
    const video = this.video.nativeElement;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }
    });
    video.srcObject = this.stream;
    await video.play();
    const ciclo = () => {
      if (this.destruido || !this.stream) return;
      const siguiente = () => { if (!this.destruido && this.stream) this.cicloNativo = setTimeout(ciclo, 120); };   // el siguiente ciclo espera a que termine este
      if (video.readyState >= 2 && !video.paused) {
        detector.detect(video).then((r: Array<{ rawValue: string }>) => { if (r?.length) this.alLeer(r[0].rawValue); }).catch(() => undefined).then(siguiente);
      } else { siguiente(); }
    };
    ciclo();
  }

  private async conZxing(): Promise<void> {
    this.controlesZxing = await iniciarEscanerConAutofoco(this.video.nativeElement, result => { if (result) this.alLeer(result.getText()); });
  }

  private camaraViva(): boolean {
    const v = this.video.nativeElement;
    const pista = ((v.srcObject as MediaStream | null)?.getVideoTracks?.() ?? [])[0];
    return !!pista && pista.readyState === 'live' && !pista.muted && !v.paused;
  }

  private apagar(): void {
    try { this.stream?.getTracks().forEach(t => t.stop()); } catch { /* ya estaba apagada */ }
    this.stream = null;
    if (this.cicloNativo) { clearTimeout(this.cicloNativo); this.cicloNativo = null; }
    try { this.controlesZxing?.stop(); } catch { /* ya estaba apagada */ }
    this.controlesZxing = null;
  }

  // ── Señal de vida: así la computadora sabe que el celular está conectado ──
  private latido(): void {
    if (this.destruido) return;
    this.svc.canalLatido().subscribe({
      next: () => { if (!this.arrancando && !this.enviadoAhora && !this.error) this.mostrar(this.textoListo, 'ok'); },
      error: (err: HttpErrorResponse) => { if (err.status === 401 || err.status === 403) this.fallar('La sesión terminó', 'Vuelve a iniciar sesión en la tienda y abre el Escáner otra vez.'); else this.mostrar('Sin conexión a internet…', 'warn'); }
    });
  }

  // ── Cada lectura: decide si es un escaneo nuevo y lo manda ──
  private alLeer(texto: string): void {
    if (this.destruido || !texto || this.fotoPrevia) return;   // mientras se fotografía, no se mandan códigos (se colaría la etiqueta del producto)
    if (this.modoQr) {
      // Solo vale el QR del código de cliente (UUID, solo o dentro de una liga); cualquier otro se ignora.
      texto = extraerCodigo(texto);
      if (!esUuid(texto)) { this.mostrar('Ese QR no es un código de cliente', 'warn'); return; }
    } else if (/^https?:\/\//i.test(texto)) {
      // Una dirección (p. ej. un QR de enlace) no es un código de barras de producto.
      return;
    }
    const ahora = Date.now();
    const v = this.visto;
    const mismo = texto === v.texto && ahora - v.ultimaVez < SALIDA_DEL_CUADRO_MS;
    v.ultimaVez = ahora;
    if (mismo) {
      if (v.enviado || ahora < v.reintentoDesde) return;           // sigue enfrente: solo se reintenta si el envío anterior falló
    } else { v.texto = texto; v.enviado = false; v.reintentoDesde = 0; }
    v.enviado = true;                                               // en vuelo: no se manda dos veces

    this.svc.canalEnviar(texto).subscribe({
      next: entregado => {
        if (navigator.vibrate) { try { navigator.vibrate(60); } catch { /* sin vibración */ } }
        if (!entregado) {
          // Se guardó, pero ninguna pantalla de la computadora lo estaba pidiendo.
          this.ultimo = `Sin entregar: ${texto}`;
          this.mostrar(this.modoQr ? 'La computadora no tiene abierta Venta directa con campaña vigente' : 'La computadora no tiene abierta una pantalla con código de barras', 'warn');
          return;
        }
        this.ultimo = `✔ Enviado: ${texto}`;
        this.enviadoAhora = true;
        this.mostrar('✔ Enviado', 'ok');
        setTimeout(() => { this.enviadoAhora = false; this.mostrar(this.textoListo, 'ok'); }, 1500);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 400) { this.mostrar('Ese código no es válido', 'bad'); return; }
        if (err.status === 429) { v.enviado = false; v.reintentoDesde = Date.now() + 3000; this.mostrar('Demasiado rápido, espera un momento', 'warn'); return; }
        if (err.status === 401 || err.status === 403) { this.fallar('La sesión terminó', 'Vuelve a iniciar sesión en la tienda y abre el Escáner otra vez.'); return; }
        v.enviado = false; v.reintentoDesde = Date.now() + REINTENTO_MS;                     // 5xx o sin internet: se reintenta
        this.mostrar('No se pudo enviar, reintentando…', 'bad');
      }
    });
  }

  // ── Fotos: se toman aquí y llegan al campo de imagen de la pantalla que esté abierta en la computadora ──
  /** Foto instantánea de lo que ve la cámara (sin salir del escáner). */
  tomarFoto(): void {
    const v = this.video.nativeElement;
    if (!v.videoWidth || !v.videoHeight || !this.camaraViva()) { this.mostrar('La cámara no está lista todavía', 'warn'); return; }
    this.fotoPrevia = this.comprimir(v, v.videoWidth, v.videoHeight);
    if (!this.fotoPrevia) this.mostrar('No se pudo tomar la foto', 'bad');
  }

  /** Foto de la cámara nativa del celular (mejor calidad, enfoque y flash) o de la galería. */
  alElegirArchivo(e: Event): void {
    const input = e.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    // La cámara nativa pudo dejar la del escáner sin imagen (sobre todo en iPhone): se revisa y se reinicia.
    setTimeout(() => { if (!this.destruido && !this.error && !this.camaraViva() && !this.arrancando) { this.apagar(); void this.iniciar(); } }, 300);
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      this.fotoPrevia = this.comprimir(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(url);
      if (!this.fotoPrevia) this.mostrar('No se pudo preparar la foto', 'bad');
    };
    img.onerror = () => { URL.revokeObjectURL(url); this.mostrar('No se pudo abrir esa foto', 'bad'); };
    img.src = url;
  }

  /** Modo QR: una foto del QR (cámara nativa o galería). Se lee AQUÍ y, si es un código de cliente, se manda como código (no como foto). */
  async alElegirFotoQr(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    // La cámara nativa pudo dejar la del escáner sin imagen (sobre todo en iPhone): se revisa y se reinicia.
    setTimeout(() => { if (!this.destruido && !this.error && !this.camaraViva() && !this.arrancando) { this.apagar(); void this.iniciar(); } }, 300);
    if (!archivo) return;
    this.mostrar('Leyendo la foto…', 'warn');
    let codigo = '';
    try { codigo = extraerCodigo(await leerQrDeImagen(archivo)); } catch { codigo = ''; }
    if (!esUuid(codigo)) {
      this.ultimo = 'No encontré un código de cliente en esa foto';
      this.mostrar('No encontré un QR en esa foto: acércate y que se vea completo', 'bad');
      return;
    }
    this.svc.canalEnviar(codigo).subscribe({
      next: entregado => {
        if (navigator.vibrate) { try { navigator.vibrate(60); } catch { /* sin vibración */ } }
        if (!entregado) {
          this.ultimo = `Sin entregar: ${codigo}`;
          this.mostrar('La computadora no tiene abierta Venta directa con campaña vigente', 'warn');
          return;
        }
        this.ultimo = `✔ Enviado: ${codigo}`;
        this.mostrar('✔ Enviado', 'ok');
        setTimeout(() => this.mostrar(this.textoListo, 'ok'), 1500);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401 || err.status === 403) { this.fallar('La sesión terminó', 'Vuelve a iniciar sesión en la tienda y abre el Escáner otra vez.'); return; }
        if (err.status === 429) { this.mostrar('Demasiado rápido, espera un momento', 'warn'); return; }
        this.mostrar('No se pudo enviar, intenta de nuevo', 'bad');
      }
    });
  }

  descartarFoto(): void { if (!this.enviandoFoto) this.fotoPrevia = null; }

  enviarFoto(): void {
    if (!this.fotoPrevia || this.enviandoFoto) return;
    this.enviandoFoto = true;
    this.svc.canalEnviarFoto(this.fotoPrevia).subscribe({
      next: entregada => {
        this.enviandoFoto = false;
        this.fotoPrevia = null;
        if (navigator.vibrate) { try { navigator.vibrate(60); } catch { /* sin vibración */ } }
        if (entregada) { this.ultimo = '✔ Foto enviada'; this.mostrar('✔ Foto enviada', 'ok'); }
        else { this.ultimo = 'Foto sin entregar'; this.mostrar('La computadora no tiene abierta una pantalla que reciba fotos (Nuevo producto o Agregar artículo)', 'warn'); }
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoFoto = false;               // la foto previa se conserva para reintentar
        if (err.status === 401 || err.status === 403) { this.fallar('La sesión terminó', 'Vuelve a iniciar sesión en la tienda y abre el Escáner otra vez.'); return; }
        if (err.status === 429) { this.mostrar('Demasiadas fotos seguidas, espera un momento', 'warn'); return; }
        if (err.status === 400 || err.status === 413) { this.fotoPrevia = null; this.mostrar('La foto es demasiado grande o no es válida. Toma otra.', 'bad'); return; }
        this.mostrar('No se pudo enviar la foto, intenta de nuevo', 'bad');
      }
    });
  }

  /** Reduce a 1280 px y baja la calidad hasta que quepa (el servidor acepta ~700 000 caracteres y el ingreso de la tienda ~1 MB). */
  private comprimir(fuente: CanvasImageSource, ancho: number, alto: number): string | null {
    const escala = Math.min(1, 1280 / Math.max(ancho, alto));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(ancho * escala);
    canvas.height = Math.round(alto * escala);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(fuente, 0, 0, canvas.width, canvas.height);
    for (const calidad of [0.82, 0.7, 0.58, 0.46, 0.34]) {
      const url = canvas.toDataURL('image/jpeg', calidad);
      if (url.length <= 640000) return url;
    }
    return null;
  }

  private pedirPantallaEncendida(): void {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
      void nav.wakeLock?.request('screen').then(w => { this.wakeLock = w; }).catch(() => undefined);
    } catch { /* sin pantalla encendida: el celular podría bloquearse */ }
  }

  private mostrar(texto: string, tono: Tono): void {
    this.estado = texto;
    this.tono = tono;
  }

  private fallar(titulo: string, texto: string): void {
    this.apagar();
    if (this.latidos) { clearInterval(this.latidos); this.latidos = null; }
    this.error = { titulo, texto };
  }
}
