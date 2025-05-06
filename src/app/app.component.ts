import { Component } from '@angular/core';
import { ViewChild, AfterViewInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BrowserQRCodeReader } from '@zxing/browser';
import { DomSanitizer } from '@angular/platform-browser';




@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  imageUrl: string | undefined;

  resultadoCodigo: string = '';
  constructor(private sanitizer: DomSanitizer) {}

  sanitizeImage(imageUrl: string) {
    return this.sanitizer.bypassSecurityTrustUrl(imageUrl);
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
