/**
 * Deja una foto lista para mandarla en base64 dentro de un JSON.
 *
 * ⚠️ Comprimir NO es opcional: una foto de cámara pesa 3-8 MB y en base64 crece ~33%. Mandar
 * varias sin redimensionar da **413 Request Entity Too Large** — ya pasó al subir imágenes de
 * variantes, y por eso la pantalla de editar variante hace exactamente esto mismo. Aquí está
 * extraído para que flores use el mismo camino y no se separen con el tiempo.
 */

/**
 * Lo que decide si una foto entra es si el navegador la puede abrir, no el tipo que reporta:
 * las fotos de la galería del celular llegan muchas veces con `file.type` vacío o como
 * HEIC/WEBP aunque el nombre diga .jpg, y un filtro por tipo las descartaba ("Formato no
 * permitido"). Como todo se reencoda a JPEG antes de subir, al back siempre le llega JPEG.
 * Solo se rechaza de entrada lo que el navegador marca claramente como NO imagen (un PDF).
 */
export function puedeSerImagen(file: File): boolean {
  return !file.type || file.type.startsWith('image/');
}

export function mensajeNoEsImagen(nombre: string): string {
  return `"${nombre}" no es una imagen.`;
}

export function mensajeFotoIlegible(nombre: string): string {
  return `No se pudo abrir "${nombre}". Si es una foto HEIC del celular, compártela primero ` +
    `por WhatsApp o cámbiala a JPG y vuelve a intentarlo.`;
}

/** Lado mayor en píxeles tras redimensionar. */
const DIMENSION_MAX = 1280;
const CALIDAD_JPEG = 0.8;

export interface IImagenBase64 {
  /** Sin el prefijo `data:...;base64,` — el back espera solo la carga. */
  base64: string;
  extension: string;
  nombreImagen: string;
}

/**
 * Lee el archivo, lo redimensiona y lo reencoda como JPEG.
 *
 * Rechaza (promesa fallida) si no es imagen o no se puede abrir, para que quien llame decida cómo
 * avisarle al usuario en vez de fallar en silencio.
 */
export function comprimirImagen(file: File): Promise<IImagenBase64> {
  return new Promise((resolve, reject) => {
    if (!puedeSerImagen(file)) {
      reject(new Error(mensajeNoEsImagen(file.name)));
      return;
    }

    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(mensajeFotoIlegible(file.name)));
      img.onload = () => {
        const escala = Math.min(1, DIMENSION_MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', CALIDAD_JPEG);
        resolve({
          base64: dataUrl.split(',')[1],
          extension: 'image/jpeg',
          nombreImagen: file.name
        });
      };
      img.src = lector.result as string;
    };
    lector.readAsDataURL(file);
  });
}
