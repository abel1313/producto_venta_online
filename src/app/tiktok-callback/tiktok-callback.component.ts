import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

/**
 * Recibe el `?code=` que TikTok manda al terminar el login OAuth (ver TIKTOK_SETUP.md paso 4).
 * Ruta PÚBLICA a propósito -- sin AuthGuard -- por 2 razones:
 * 1. TikTok redirige aqui ANTES de que el navegador tenga sesion nuestra (es su propio login,
 *    no el nuestro), asi que un guard la rechazaria antes de poder leer el `code`.
 * 2. El App Review de TikTok exige que la URL de redirect resuelva a una pagina real -- antes
 *    esta ruta no existia y caia en la pantalla generica de "pagina no disponible".
 *
 * Llama automaticamente a POST /v1/redes-sociales/tiktok/autorizar (RedesSocialesController,
 * ver TIKTOK_SETUP.md paso 5) para completar el intercambio code -> access_token/refresh_token.
 * Ese endpoint no requiere el guard de sesion del admin -- si en el futuro lo requiere, revisar
 * este componente.
 */
@Component({
  selector: 'app-tiktok-callback',
  templateUrl: './tiktok-callback.component.html',
  styleUrls: ['./tiktok-callback.component.scss']
})
export class TiktokCallbackComponent implements OnInit {

  estado: 'procesando' | 'ok' | 'error' | 'sin-code' = 'procesando';
  mensaje = '';
  code: string | null = null;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    this.code = this.route.snapshot.queryParamMap.get('code');

    if (!this.code) {
      this.estado = 'sin-code';
      return;
    }

    const redirectUri = window.location.origin + '/tiktok/callback';

    this.http.post<any>(`${environment.api_Url}/v1/redes-sociales/tiktok/autorizar`, {
      code: this.code,
      redirectUri
    }).subscribe({
      next: () => {
        this.estado = 'ok';
      },
      error: (err) => {
        this.estado = 'error';
        this.mensaje = err?.error?.mensaje || err?.message || 'Error al autorizar con TikTok.';
      }
    });
  }
}
