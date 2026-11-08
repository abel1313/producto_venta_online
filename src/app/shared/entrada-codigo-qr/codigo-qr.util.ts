import { BrowserQRCodeReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const UUID_EXACTO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ¿Este texto es exactamente un código de cliente (UUID)? Los códigos de barras NO lo son. */
export function esUuid(texto: string | null | undefined): boolean {
  return UUID_EXACTO.test((texto ?? '').trim());
}

/**
 * Lo que llega de un QR o de lo que se pega: el código es un UUID, pero el QR puede traer la liga completa
 * (`…/codigo-campana/<uuid>`) o el UUID solo. Se queda con el UUID; si no hay, devuelve el texto tal cual (sin espacios).
 */
export function extraerCodigo(texto: string | null | undefined): string {
  const t = (texto ?? '').trim();
  const m = t.match(UUID);
  return m ? m[0].toLowerCase() : t;
}

/** Un lector de QR que se esfuerza más (TRY_HARDER): tarda un poco más pero lee imágenes comprimidas por WhatsApp o capturas con ruido. */
function lector(): BrowserQRCodeReader {
  return new BrowserQRCodeReader(new Map<DecodeHintType, unknown>([[DecodeHintType.TRY_HARDER, true]]));
}

/** Dibuja la imagen en un lienzo del tamaño pedido (sin suavizado al ampliar: los cuadros del QR se mantienen nítidos). */
function lienzo(img: ImageBitmap | HTMLImageElement, ancho: number, alto: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(ancho));
  c.height = Math.max(1, Math.round(alto));
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/**
 * Lee el QR de una imagen (archivo subido o pegado: una captura, una foto reenviada por WhatsApp o Facebook). Prueba varias veces: la imagen
 * como viene; a un tamaño de trabajo de unos 1000 px del lado mayor (las fotos enormes o las chiquitas se leen mejor así); y ampliada ×2 y ×3.
 * Si el navegador trae `BarcodeDetector` con `qr_code`, lo usa primero (es más tolerante). Rechaza si ninguna prueba encuentra un QR.
 */
export async function leerQrDeImagen(archivo: Blob): Promise<string> {
  // 1) Detector nativo, si el navegador lo trae.
  try {
    const Detector = (window as any).BarcodeDetector;
    const formatos: string[] = Detector?.getSupportedFormats ? await Detector.getSupportedFormats() : [];
    if (Detector && formatos.includes('qr_code')) {
      const bmp = await createImageBitmap(archivo);
      const hallados = await new Detector({ formats: ['qr_code'] }).detect(bmp);
      if (hallados?.length && hallados[0].rawValue) {
        return extraerCodigo(hallados[0].rawValue);
      }
    }
  } catch { /* se sigue con zxing */ }

  // 2) zxing, con la imagen a distintos tamaños.
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const lado = Math.max(img.naturalWidth, img.naturalHeight) || 1;
    const intentos: HTMLCanvasElement[] = [lienzo(img, img.naturalWidth, img.naturalHeight)];
    const objetivo = 1000;
    if (lado > objetivo * 1.3 || lado < objetivo * 0.7) {
      const f = objetivo / lado;
      intentos.push(lienzo(img, img.naturalWidth * f, img.naturalHeight * f));
    }
    if (lado < 500) {
      intentos.push(lienzo(img, img.naturalWidth * 2, img.naturalHeight * 2), lienzo(img, img.naturalWidth * 3, img.naturalHeight * 3));
    }
    for (const c of intentos) {
      try {
        return extraerCodigo(lector().decodeFromCanvas(c).getText());
      } catch { /* siguiente intento */ }
    }
    throw new Error('No se encontró un QR en la imagen');
  } finally {
    URL.revokeObjectURL(url);
  }
}
