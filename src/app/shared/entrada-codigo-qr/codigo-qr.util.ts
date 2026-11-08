import { BrowserQRCodeReader } from '@zxing/browser';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Lo que llega de un QR o de lo que se pega: el código es un UUID, pero el QR puede traer la liga completa
 * (`…/codigo-campana/<uuid>`) o el UUID solo. Se queda con el UUID; si no hay, devuelve el texto tal cual (sin espacios).
 */
export function extraerCodigo(texto: string | null | undefined): string {
  const t = (texto ?? '').trim();
  const m = t.match(UUID);
  return m ? m[0].toLowerCase() : t;
}

/** Lee el QR de una imagen (archivo subido o pegado). Rechaza si no hay un QR legible. */
export async function leerQrDeImagen(archivo: Blob): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const r = await new BrowserQRCodeReader().decodeFromImageUrl(url);
    return extraerCodigo(r.getText());
  } finally {
    URL.revokeObjectURL(url);
  }
}
