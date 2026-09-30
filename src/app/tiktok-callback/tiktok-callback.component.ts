import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import {
  CLAVE_STATE_TIKTOK,
  IConexionTikTok,
  RedesSocialesService
} from '../redes-sociales/service/redes-sociales.service';

/**
 * A donde TikTok regresa al dueño después de iniciar sesión y dar permiso, con `?code=&state=`.
 * El viaje empieza en el botón "Conectar TikTok" de Publicar en redes (admin/facebook).
 *
 * Ruta PÚBLICA a propósito -- sin AuthGuard -- por 2 razones:
 * 1. Si el guard redirige al login se pierde el `code` de la URL.
 * 2. El App Review de TikTok exige que la URL de redirect resuelva a una pagina real.
 *
 * Pero el POST /v1/redes-sociales/tiktok/autorizar SÍ exige sesión con permiso de escritura en
 * admin/facebook: el interceptor manda el JWT del admin que empezó el viaje en esta misma pestaña.
 * Sin sesión responde 401/403 y aquí se dice que hay que entrar primero.
 */
@Component({
  selector: 'app-tiktok-callback',
  templateUrl: './tiktok-callback.component.html',
  styleUrls: ['./tiktok-callback.component.scss']
})
export class TiktokCallbackComponent implements OnInit {

  estado: 'procesando' | 'ok' | 'error' | 'cancelado' | 'sin-code' = 'procesando';
  mensaje = '';
  cuenta: IConexionTikTok | null = null;

  constructor(private route: ActivatedRoute, private redes: RedesSocialesService) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const code = q.get('code');
    const state = q.get('state');
    // El code sirve una sola vez: se quita de la barra para que recargar no lo vuelva a mandar.
    history.replaceState(null, '', window.location.pathname);

    // El dueño tocó "Cancelar" en TikTok: regresa con ?error= y sin code.
    if (q.get('error')) {
      this.estado = 'cancelado';
      return;
    }
    if (!code) {
      this.estado = 'sin-code';
      return;
    }

    // Se consume una sola vez: recargar esta página no debe volver a mandar el mismo code.
    let esperado: string | null = null;
    try {
      esperado = sessionStorage.getItem(CLAVE_STATE_TIKTOK);
      sessionStorage.removeItem(CLAVE_STATE_TIKTOK);
    } catch { /* sin storage: esperado queda null y se rechaza abajo */ }

    if (!esperado || state !== esperado) {
      this.fallar('Esta respuesta de TikTok no la pidió esta pantalla. Vuelve a Publicar en redes y toca "Conectar TikTok".');
      return;
    }

    const redirectUri = window.location.origin + '/tiktok/callback';
    this.redes.autorizarTikTok(code, redirectUri)
      .pipe(switchMap(() => this.redes.conexionTikTok()))
      .subscribe({
        next: cuenta => {
          this.cuenta = cuenta;
          this.estado = 'ok';
        },
        error: err => {
          if (err?.status === 401 || err?.status === 403) {
            this.fallar('Tu sesión venció o no tienes permiso para Publicar en redes. Entra de nuevo y vuelve a conectar.');
            return;
          }
          this.fallar(err?.error?.mensaje || 'TikTok no aceptó la conexión. Intenta de nuevo.');
        }
      });
  }

  private fallar(mensaje: string): void {
    this.estado = 'error';
    this.mensaje = mensaje;
  }
}
