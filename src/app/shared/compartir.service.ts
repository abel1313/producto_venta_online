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

    // Nombre neutro: el dueño no quiere que al pegar salga el nombre del producto (2026-10-14).
    const nombre  = `imagen.${ext}`;
    const archivo = new File([blob], nombre, { type: blob.type });

    // ── Móvil: Web Share API con archivo ──────────────────────────────
    if (this.puedeCompartirArchivo(archivo)) {
      try {
        // Solo la imagen: sin título ni texto ("Nombre — $150"), que se pegaban junto a la foto.
        await navigator.share({ files: [archivo] });
      } catch (err: any) {
        if (err?.name !== 'AbortError') this.descargarArchivo(archivo);
      }
      return;
    }

    // ── Desktop: muestra la imagen en el diálogo (sin descarga automática)
    const dataUrl = URL.createObjectURL(blob);

    // En escritorio NO se puede mandar la imagen a WhatsApp Web desde aquí: son sitios
    // distintos y el navegador lo impide por seguridad. Lo más cerca que se puede llegar es
    // dejarla en el portapapeles de un clic, para que el admin solo pegue con Ctrl + V.
    const puedeCopiar = !!navigator.clipboard?.write && !!(window as any).ClipboardItem;

    const { isConfirmed, isDenied } = await Swal.fire({
      title: data.titulo,
      html: `
        <p style="color:#6b7280;font-size:.82rem;margin-bottom:10px">
          ${puedeCopiar
            ? 'Copia la imagen y pégala con <b>Ctrl + V</b> en WhatsApp o Facebook.'
            : '<b>Clic derecho</b> en la imagen → <b>Copiar imagen</b><br>Luego pega con <b>Ctrl + V</b> en WhatsApp o Facebook.'}
        </p>
        ${puedeCopiar ? `
          <button id="cp-copiar" type="button"
                  style="width:100%;margin-bottom:12px;padding:10px;border:none;border-radius:10px;
                         font-weight:600;cursor:pointer;background:var(--brand-1);color: var(--app-accent-ink)">
            📋 Copiar imagen
          </button>` : ''}
        <img src="${dataUrl}"
             style="max-width:100%;max-height:280px;border-radius:10px;cursor:context-menu;box-shadow:0 4px 16px rgba(0,0,0,.15)"
             alt="${data.titulo}" />
      `,
      didOpen: () => {
        const btn = document.getElementById('cp-copiar');
        if (!btn) return;
        // El copiado va en el listener del clic a propósito: el navegador exige un gesto
        // reciente del usuario para escribir en el portapapeles, y el clic original del
        // botón de compartir ya expiró después de descargar la imagen.
        btn.addEventListener('click', async () => {
          try {
            const png = await this.aPng(blob);
            await navigator.clipboard.write([new (window as any).ClipboardItem({ 'image/png': png })]);
            btn.textContent = '✅ Copiada — pégala con Ctrl + V';
            btn.setAttribute('style', btn.getAttribute('style')!.replace('var(--brand-1)', '#0f766e'));
          } catch {
            btn.textContent = '⚠️ No se pudo copiar — usa clic derecho sobre la imagen';
          }
        });
      },
      showConfirmButton: true,
      showDenyButton:    true,
      showCancelButton:  true,
      confirmButtonText:  '💬 WhatsApp Web',
      denyButtonText:     '📘 Facebook',
      cancelButtonText:   '⬇️ Descargar',
      confirmButtonColor: '#25d366',
      denyButtonColor:    '#1877f2',
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

  /**
   * Hay que preguntar por ESTE archivo en concreto, no solo si el navegador "sabe compartir".
   *
   * En Windows, Chrome y Edge sí exponen `navigator.share`/`canShare`, pero varios no aceptan
   * archivos. Con el chequeo genérico anterior entrábamos por la rama de móvil igual,
   * `navigator.share({ files })` fallaba, y el `catch` terminaba **descargando la imagen sin
   * avisar** — el admin daba clic en compartir y le aparecía un archivo en Descargas, en vez
   * del cuadro con la imagen para copiarla.
   */
  private puedeCompartirArchivo(archivo: File): boolean {
    return !!navigator.share
        && !!navigator.canShare
        && navigator.canShare({ files: [archivo] });
  }

  /**
   * Convierte la imagen a PNG. **Es obligatorio, no un capricho:** el portapapeles de los
   * navegadores solo acepta `image/png` para imágenes — si se le pasa el JPEG tal cual,
   * `clipboard.write` lanza `NotAllowedError` y no copia nada.
   */
  private aPng(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error('sin canvas')); return; }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(png => png ? resolve(png) : reject(new Error('sin png')), 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('no cargó')); };
      img.src = url;
    });
  }

  private descargarArchivo(archivo: File): void {
    const url = URL.createObjectURL(archivo);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = archivo.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Las miniaturas (`/v1/imagenes/thumbnail/{id}`) responden BYTES de imagen, no JSON; el endpoint
   * viejo (`/file/{id}`) respondía JSON con la imagen en base64. Antes se pedía siempre JSON y la
   * miniatura contestaba 400 ("No se pudo cargar la imagen"). Se pide como blob y se mira qué llegó.
   */
  private async fetchBlob(imagenUrl: string): Promise<{ blob: Blob; ext: string }> {
    // La miniatura es pública: se pide con fetch SIN `Accept: application/json` ni `Authorization`
    // (el micro de imágenes contestaba 400 a esa petición, aunque la URL abre bien en el navegador).
    let respuesta: Blob | undefined;
    if (/\/imagenes\/thumbnail\//.test(imagenUrl)) {
      const r = await fetch(imagenUrl, { credentials: 'omit' });
      if (!r.ok) throw new Error(`Imagen: ${r.status}`);
      respuesta = await r.blob();
    } else {
      respuesta = await this.http.get(imagenUrl, { responseType: 'blob' }).toPromise();
    }
    if (!respuesta) throw new Error('Respuesta vacía');

    if (respuesta.type.includes('json')) {
      const res  = JSON.parse(await respuesta.text()) as { imagen: string; contentType: string } | Array<{ imagen: string; contentType: string }>;
      const item = Array.isArray(res) ? res[0] : res;
      const byteStr = atob(item.imagen);
      const buffer  = new Uint8Array(byteStr.length);
      for (let i = 0; i < byteStr.length; i++) buffer[i] = byteStr.charCodeAt(i);
      return { blob: new Blob([buffer], { type: item.contentType }), ext: item.contentType.split('/')[1] ?? 'jpg' };
    }
    return { blob: respuesta, ext: respuesta.type.split('/')[1] ?? 'jpg' };
  }
}
