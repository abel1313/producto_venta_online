
import { Component, OnInit } from '@angular/core';
import { ViewChild, AfterViewInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BrowserQRCodeReader } from '@zxing/browser';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';
import { ITokenData } from './login/models/ITokenData.model';




@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  imageUrl: string | undefined;
  private readonly urlRefresh: string = `${environment.api_auth}/auth/refresh`;
  resultadoCodigo: string = '';
  constructor(private sanitizer: DomSanitizer,
              private readonly http: HttpClient,
              private readonly auth: AuthService
  ) {}


  sanitizeImage(imageUrl: string) {
    return this.sanitizer.bypassSecurityTrustUrl(imageUrl);
  }
  
  ngOnInit(): void {
        this.http.post<ITokenData>(this.urlRefresh, {}, { withCredentials: true })
    .subscribe({
      next: tokenData => {
        this.auth.setAccessToken(tokenData.accessToken);
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
