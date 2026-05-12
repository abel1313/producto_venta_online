import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

export interface CompartirImagenData {
  titulo:    string;
  precio:    number;
  imagenUrl: string;
}

@Injectable({ providedIn: 'root' })
export class CompartirService {

  constructor(private readonly http: HttpClient) {}

  async compartirImagen(data: CompartirImagenData): Promise<void> {
    let blob: Blob;
    let ext:  string;

    try {
      const result = await this.fetchBlob(data.imagenUrl);
      blob = result.blob;
      ext  = result.ext;
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo cargar la imagen', timer: 2000, showConfirmButton: false });
      return;
    }

    const nombre  = `${data.titulo}.${ext}`;
    const archivo = new File([blob], nombre, { type: blob.type });

    // ── Móvil: Web Share API con archivo ──────────────────────────────
    if (this.puedeCompartirArchivo()) {
      try {
        await navigator.share({
          files: [archivo],
          title: data.titulo,
          text:  `${data.titulo} — $${data.precio}`
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') this.descargarArchivo(archivo);
      }
      return;
    }

    // ── Desktop: muestra la imagen en el diálogo (sin descarga automática)
    const dataUrl = URL.createObjectURL(blob);

    const { isConfirmed, isDenied } = await Swal.fire({
      title: data.titulo,
      html: `
        <p style="color:#6b7280;font-size:.82rem;margin-bottom:10px">
          <b>Clic derecho</b> en la imagen → <b>Copiar imagen</b><br>
          Luego pega con <b>Ctrl + V</b> en WhatsApp o Facebook.
        </p>
        <img src="${dataUrl}"
             style="max-width:100%;max-height:280px;border-radius:10px;cursor:context-menu;box-shadow:0 4px 16px rgba(0,0,0,.15)"
             alt="${data.titulo}" />
      `,
      showConfirmButton: true,
      showDenyButton:    true,
      showCancelButton:  true,
      confirmButtonText:  '💬 WhatsApp Web',
      denyButtonText:     '📘 Facebook',
      cancelButtonText:   '⬇️ Descargar',
      confirmButtonColor: '#25d366',
      denyButtonColor:    '#1877f2',
      cancelButtonColor:  '#6b7280',
      width: '420px'
    });

    URL.revokeObjectURL(dataUrl);

    if (isConfirmed) {
      window.open('https://web.whatsapp.com', '_blank');
    } else if (isDenied) {
      window.open('https://www.facebook.com', '_blank');
    } else {
      // Solo descarga si el admin lo pide explícitamente
      this.descargarArchivo(archivo);
    }
  }

  // ── Helpers privados ───────────────────────────────────────────────

  private puedeCompartirArchivo(): boolean {
    return !!navigator.share && !!navigator.canShare;
  }

  private descargarArchivo(archivo: File): void {
    const url = URL.createObjectURL(archivo);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = archivo.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  private fetchBlob(imagenUrl: string): Promise<{ blob: Blob; ext: string }> {
    return new Promise((resolve, reject) => {
      this.http.get<{ imagen: string; contentType: string } | Array<{ imagen: string; contentType: string }>>(imagenUrl)
        .subscribe({
          next: res => {
            const item    = Array.isArray(res) ? res[0] : res;
            const byteStr = atob(item.imagen);
            const buffer  = new Uint8Array(byteStr.length);
            for (let i = 0; i < byteStr.length; i++) buffer[i] = byteStr.charCodeAt(i);
            const blob = new Blob([buffer], { type: item.contentType });
            const ext  = item.contentType.split('/')[1] ?? 'jpg';
            resolve({ blob, ext });
          },
          error: reject
        });
    });
  }
}
