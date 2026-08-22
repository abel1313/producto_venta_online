/**
 * Deja una foto lista para mandarla en base64 dentro de un JSON.
 *
 * ⚠️ Comprimir NO es opcional: una foto de cámara pesa 3-8 MB y en base64 crece ~33%. Mandar
 * varias sin redimensionar da **413 Request Entity Too Large** — ya pasó al subir imágenes de
 * variantes, y por eso la pantalla de editar variante hace exactamente esto mismo. Aquí está
 * extraído para que flores use el mismo camino y no se separen con el tiempo.
 */

export const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/gif'];

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
 * Rechaza (promesa fallida) si el tipo no está permitido, para que quien llame decida cómo
 * avisarle al usuario en vez de fallar en silencio.
 */
export function comprimirImagen(file: File): Promise<IImagenBase64> {
  return new Promise((resolve, reject) => {
    if (!TIPOS_IMAGEN_PERMITIDOS.includes(file.type)) {
      reject(new Error(`"${file.name}" no es JPG, PNG ni GIF.`));
      return;
    }

    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
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
