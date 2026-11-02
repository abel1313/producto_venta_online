import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { IScannerControls } from '@zxing/browser';
import { iniciarEscanerConAutofoco } from '../shared/barcode-scanner.util';
import { EscanerCelularService } from '../shared/escaner-celular/escaner-celular.service';

type Fase = 'iniciando' | 'escaneando' | 'enviando' | 'enviado' | 'sinCamara' | 'vencida' | 'error';

/**
 * Página que abre el CELULAR al leer el QR de la PC (`/escaner/:id`, pública). Abre la cámara, lee un código de barras y se lo
 * manda a la PC. Es de 1 en 1: al enviar, queda «Enviado»; «Escanear otro» vuelve a abrir la cámara (mientras la PC siga esperando).
 */
@Component({
  selector: 'app-escaner-celular-pagina',
  templateUrl: './escaner-celular-pagina.component.html',
  styleUrls: ['./escaner-celular-pagina.component.scss']
})
export class EscanerCelularPaginaComponent implements OnInit, OnDestroy {
  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;

  fase: Fase = 'iniciando';
  enviado = '';
  mensaje = '';

  private id = '';
  private controles: IScannerControls | null = null;
  private destruido = false;

  constructor(private readonly ruta: ActivatedRoute, private readonly svc: EscanerCelularService) {}

  ngOnInit(): void {
    this.id = this.ruta.snapshot.paramMap.get('id') ?? '';
    void this.escanear();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.apagarCamara();
  }

  async escanear(): Promise<void> {
    this.apagarCamara();
    this.fase = 'iniciando';
    this.mensaje = '';
    // El <video> existe solo cuando la fase lo muestra; se espera un ciclo de Angular antes de encenderlo.
    this.fase = 'escaneando';
    await new Promise(r => setTimeout(r, 150));
    if (!this.video || this.destruido) return;
    try {
      const controles = await iniciarEscanerConAutofoco(this.video.nativeElement, (result, _err, controls) => {
        if (result && this.fase === 'escaneando') {
          // Se apaga YA para no mandar el mismo código varias veces mientras sigue enfrente de la cámara.
          controls.stop();
          this.controles = null;
          this.enviar(result.getText());
        }
      });
      // Si la página se cerró mientras el navegador pedía el permiso de cámara, se apaga de inmediato.
      if (this.destruido) { controles.stop(); return; }
      this.controles = controles;
    } catch {
      this.fase = 'sinCamara';
    }
  }

  private enviar(codigo: string): void {
    this.fase = 'enviando';
    this.enviado = codigo;
    this.svc.enviar(this.id, codigo).subscribe({
      next: () => { this.fase = 'enviado'; },
      error: (err: HttpErrorResponse) => {
        if (err.status === 410 || err.status === 404) { this.fase = 'vencida'; return; }
        this.mensaje = err?.error?.mensaje ?? 'No se pudo mandar el código. Intenta de nuevo.';
        this.fase = 'error';
      }
    });
  }

  private apagarCamara(): void {
    this.controles?.stop();
    this.controles = null;
  }
}
