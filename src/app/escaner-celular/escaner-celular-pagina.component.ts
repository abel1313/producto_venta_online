import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { IScannerControls } from '@zxing/browser';
import { iniciarEscanerConAutofoco } from '../shared/barcode-scanner.util';
import { EscanerCelularService } from '../shared/escaner-celular/escaner-celular.service';

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

  private stream: MediaStream | null = null;
  private controlesZxing: IScannerControls | null = null;
  private cicloNativo: ReturnType<typeof setTimeout> | null = null;
  private latidos: ReturnType<typeof setInterval> | null = null;
  private wakeLock: { release: () => Promise<void> } | null = null;
  private destruido = false;
  private arrancando = false;
  /** Un código frente a la cámara cuenta como UN escaneo: se vuelve a mandar solo si salió del cuadro ≥1 s y regresó. */
  private visto = { texto: '', ultimaVez: 0, enviado: false, reintentoDesde: 0 };

  constructor(private readonly svc: EscanerCelularService) {}

  ngOnInit(): void {
    void this.iniciar();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.apagar();
    if (this.latidos) clearInterval(this.latidos);
    void this.wakeLock?.release().catch(() => undefined);
  }

  /** Al volver de segundo plano o de la pantalla bloqueada la cámara puede haberse detenido (sobre todo en iPhone): se revisa y se reinicia. */
  @HostListener('document:visibilitychange')
  alCambiarVisibilidad(): void {
    if (document.hidden || this.destruido || this.error) return;
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
      const nativo = !!soportados && (soportados.includes('ean_13') || soportados.includes('code_128'));
      if (nativo) await this.conDetectorNativo(Detector); else await this.conZxing();
      if (this.destruido) { this.apagar(); return; }
      this.arrancando = false;
      this.mostrar('Listo: apunta al código de barras', 'ok');
      this.latido();
      if (this.latidos) clearInterval(this.latidos);
      this.latidos = setInterval(() => this.latido(), 15000);
      this.pedirPantallaEncendida();
    } catch {
      this.arrancando = false;
      this.fallar('No se pudo abrir la cámara', 'Revisa que el navegador tenga permiso de cámara y que la dirección empiece con https.');
    }
  }

  private async conDetectorNativo(Detector: any): Promise<void> {
    const detector = new Detector({ formats: FORMATOS });
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
      next: () => { if (!this.arrancando && !this.enviadoAhora && !this.error) this.mostrar('Listo: apunta al código de barras', 'ok'); },
      error: (err: HttpErrorResponse) => { if (err.status === 401 || err.status === 403) this.fallar('La sesión terminó', 'Vuelve a iniciar sesión en la tienda y abre el Escáner otra vez.'); else this.mostrar('Sin conexión a internet…', 'warn'); }
    });
  }

  // ── Cada lectura: decide si es un escaneo nuevo y lo manda ──
  private alLeer(texto: string): void {
    if (this.destruido || !texto) return;
    // Una dirección (p. ej. un QR de enlace) no es un código de barras de producto.
    if (/^https?:\/\//i.test(texto)) return;
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
          this.mostrar('La computadora no tiene abierta una pantalla con código de barras', 'warn');
          return;
        }
        this.ultimo = `✔ Enviado: ${texto}`;
        this.enviadoAhora = true;
        this.mostrar('✔ Enviado', 'ok');
        setTimeout(() => { this.enviadoAhora = false; this.mostrar('Listo: apunta al código de barras', 'ok'); }, 1500);
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
