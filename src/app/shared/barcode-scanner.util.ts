import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Exception, Result } from '@zxing/library';

// @zxing/browser define este tipo pero no lo exporta desde su entrada publica (index.d.ts) --
// se declara igual aqui para no perder el tipado de los 3 parametros en cada callback.
type CallbackEscaneo = (result: Result | undefined, error: Exception | undefined, controls: IScannerControls) => void;

// Cámara trasera con autoenfoque continuo -- sin esto (deviceId undefined = constraints por
// default del navegador), algunos celulares no reenfocan solos y el código sale borroso hasta
// que el usuario aleja/acerca la cámara a mano. focusMode:'continuous' va en `advanced` porque
// no todos los navegadores lo soportan (un constraint no soportado ahí se ignora, no truena) --
// Safari en particular no lo soporta, así que si decodeFromConstraints falla igual cae al
// comportamiento anterior (decodeFromVideoDevice) para no romper el escaneo por completo.
export async function iniciarEscanerConAutofoco(
  videoEl: HTMLVideoElement,
  callback: CallbackEscaneo
): Promise<IScannerControls> {
  const reader = new BrowserMultiFormatReader();
  try {
    return await reader.decodeFromConstraints(
      {
        video: {
          facingMode: { ideal: 'environment' },
          advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet]
        }
      },
      videoEl,
      callback
    );
  } catch {
    return await reader.decodeFromVideoDevice(undefined, videoEl, callback);
  }
}
