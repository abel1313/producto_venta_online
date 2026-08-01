
import { Component, OnInit } from '@angular/core';
import { ViewChild, AfterViewInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BrowserQRCodeReader } from '@zxing/browser';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { AuthenticateService } from './auth.service';
import { environment } from 'src/environments/environment';
import { ITokenData } from './login/models/ITokenData.model';
import { AuthService } from './auth/auth.service';
import { ThemeService } from './services/theme/theme.service';




@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  imageUrl: string | undefined;
  private readonly urlRefresh: string = `${environment.api_Url}/v1/auth/refresh`;
  resultadoCodigo: string = '';
  constructor(private sanitizer: DomSanitizer,
              private readonly http: HttpClient,
              private readonly auth: AuthenticateService,
              private readonly roles: AuthService,
              private readonly themeService: ThemeService,
  ) {
    this.themeService.init(); // aplica la clase al body antes de pintar la vista

    // Select-on-focus global para TODOS los inputs de precio/monto/cantidad
    // (type="number") de la app. Antes, al dar clic en un campo con "0", el cursor se
    // posicionaba pero no seleccionaba nada — había que borrar el 0 a mano o "atinarle"
    // exacto para escribir encima. Con esto, el valor completo queda seleccionado al
    // enfocar, así que escribir directo lo reemplaza. Un solo listener global (no un
    // directive por input) porque el pedido explícito fue "para todos los montos" —
    // tocar cada template de precio/cantidad de la app sería un cambio de docenas de
    // archivos para el mismo comportamiento.
    document.addEventListener('focusin', (event: Event) => {
      const target = event.target as HTMLElement;
      if (target instanceof HTMLInputElement && target.type === 'number') {
        // setTimeout(0): en algunos navegadores (sobre todo móvil) el foco nativo
        // todavía no terminó de asentarse cuando dispara 'focusin' — seleccionar en el
        // mismo tick a veces no aplica. Correrlo después del ciclo actual es más fiable.
        setTimeout(() => target.select(), 0);
      }
    }, true);
  }


  sanitizeImage(imageUrl: string) {
    return this.sanitizer.bypassSecurityTrustUrl(imageUrl);
  }
  
  ngOnInit(): void {
    this.http.post<ITokenData>(this.urlRefresh, {}, { withCredentials: true })
    .subscribe({
      next: tokenData => {
        this.auth.setAccessToken(tokenData.accessToken);
        this.roles.setRolesFromToken(tokenData.accessToken);
      },
      error: () => {
        // Si falla, significa que no hay refresh token válido → pedir login
        this.auth.clearAccessToken();
      }
    });
  }
  ngAfterViewInit() {
    
  }

  async openCamera() {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera
    });

    this.imageUrl = image.webPath; // Usa la URL válida en lugar de dataUrl
    this.scanBarcode(this.imageUrl);
  
  }

  async scanBarcode(imageUrl: string | undefined ) {
    if (!imageUrl) {
      console.error('No se proporcionó una URL válida para el escaneo');
      return;
    }

    
    const codeReader = new BrowserQRCodeReader();
    try {
      const result = await codeReader.decodeFromImageUrl(imageUrl);
      this.resultadoCodigo = 'paso '+result.getText();
    } catch (error) {
      this.resultadoCodigo = 'error '+error;
    }
  }
  
  
}
