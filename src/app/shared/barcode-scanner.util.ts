import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Exception, Result } from '@zxing/library';

// @zxing/browser define este tipo pero no lo exporta desde su entrada publica (index.d.ts) --
// se declara igual aqui para no perder el tipado de los 3 parametros en cada callback.
type CallbackEscaneo = (result: Result | undefined, error: Exception | undefined, controls: IScannerControls) => void;

// Camara trasera con autoenfoque continuo y 1280x720 (la misma configuracion de la pagina del celular, menu «Escaner»).
// Sin pedir resolucion, muchos celulares abren la camara en 640x480: enfoca lento y los codigos finos no se leen.
// focusMode:'continuous' va en `advanced` porque no todos los navegadores lo soportan (un constraint no soportado ahi se
// ignora, no truena).
const VIDEO_CAMARA: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1280 },
  height: { ideal: 720 },
  advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet]
};

const MS_ENTRE_LECTURAS = 100;

/**
 * Enfoque rapido. El `advanced` de getUserMedia a veces se ignora; por eso, ya con la camara abierta, se pide de nuevo el
 * autoenfoque continuo y, si el navegador lo permite, se baja la distancia minima de enfoque. Ademas, al TOCAR la imagen se
 * dispara un enfoque inmediato en ese punto (y luego vuelve al continuo). Devuelve la funcion que quita el toque.
 * Safari / iPhone no exponen estos controles: ahi no hace nada (el iPhone enfoca solo).
 */
function acelerarEnfoque(videoEl: HTMLVideoElement, stream: MediaStream | null): () => void {
  const pista = stream?.getVideoTracks?.()[0] as any;
  if (!pista) return () => undefined;
  let caps: any = {};
  try { caps = pista.getCapabilities?.() ?? {}; } catch { /* sin capacidades */ }
  const modos: string[] = caps.focusMode ?? [];
  const aplicar = (avanzado: any) => { try { void pista.applyConstraints({ advanced: [avanzado] }).catch(() => undefined); } catch { /* no soportado */ } };

  if (modos.includes('continuous')) aplicar({ focusMode: 'continuous' });

  const alTocar = (ev: MouseEvent | TouchEvent) => {
    if (!modos.length) return;
    const r = videoEl.getBoundingClientRect();
    const t = (ev as TouchEvent).touches?.[0] ?? (ev as MouseEvent);
    const x = Math.min(1, Math.max(0, (t.clientX - r.left) / Math.max(1, r.width)));
    const y = Math.min(1, Math.max(0, (t.clientY - r.top) / Math.max(1, r.height)));
    const punto = caps.pointsOfInterest ? { pointsOfInterest: [{ x, y }] } : {};
    if (modos.includes('single-shot')) aplicar({ focusMode: 'single-shot', ...punto });
    else if (modos.includes('manual')) aplicar({ focusMode: 'manual', ...punto });
    setTimeout(() => { if (modos.includes('continuous')) aplicar({ focusMode: 'continuous' }); }, 1200);
  };
  videoEl.addEventListener('click', alTocar);
  return () => videoEl.removeEventListener('click', alTocar);
}

/**
 * Escaner para los buscadores y campos de codigo de barras.
 *
 * 1) Si el navegador trae el lector NATIVO (BarcodeDetector: Chrome en Android y en escritorio), se usa ese: lo hace el
 *    propio telefono con su motor optimizado, igual que la pagina del celular que manda el codigo a la PC (rapido).
 * 2) Si no (Safari / iPhone, Firefox), se usa zxing, tambien pidiendo 1280x720 y autoenfoque; si el navegador rechaza los
 *    constraints, cae al comportamiento anterior (decodeFromVideoDevice) para no romper el escaneo.
 *
 * Los dos caminos entregan lo mismo que antes: `result.getText()` y `controls.stop()`.
 */
export async function iniciarEscanerConAutofoco(
  videoEl: HTMLVideoElement,
  callback: CallbackEscaneo,
  opciones: { soloZxing?: boolean } = {}
): Promise<IScannerControls> {
  // soloZxing: la pagina del celular ya decidio que el lector nativo no sirve para lo que lee (p. ej. QR) y usa esta funcion de respaldo.
  const nativo = opciones.soloZxing ? null : await iniciarNativo(videoEl, callback).catch(() => null);
  if (nativo) return nativo;
  return iniciarConZxing(videoEl, callback);
}

async function iniciarNativo(videoEl: HTMLVideoElement, callback: CallbackEscaneo): Promise<IScannerControls | null> {
  const Detector = (window as any).BarcodeDetector;
  if (!Detector || !navigator.mediaDevices?.getUserMedia) return null;
  const soportados: string[] | null = Detector.getSupportedFormats
    ? await Promise.resolve(Detector.getSupportedFormats()).catch(() => null)
    : null;
  // Si el telefono no sabe leer codigos de producto, mejor zxing.
  if (!soportados || !(soportados.includes('ean_13') || soportados.includes('code_128'))) return null;

  const detector = new Detector({ formats: soportados });
  const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: VIDEO_CAMARA });
  videoEl.muted = true;
  videoEl.setAttribute('playsinline', 'true');
  videoEl.srcObject = stream;
  try {
    await videoEl.play();
  } catch (e) {
    stream.getTracks().forEach(t => t.stop());
    throw e;
  }

  const quitarToque = acelerarEnfoque(videoEl, stream);
  let activo = true;
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  const controles = {
    stop: () => {
      activo = false;
      quitarToque();
      if (temporizador) { clearTimeout(temporizador); temporizador = null; }
      try { stream.getTracks().forEach(t => t.stop()); } catch { /* ya estaba apagada */ }
      if (videoEl.srcObject === stream) videoEl.srcObject = null;
    }
  } as IScannerControls;

  const ciclo = () => {
    if (!activo) return;
    const siguiente = () => { if (activo) temporizador = setTimeout(ciclo, MS_ENTRE_LECTURAS); };   // el siguiente ciclo espera a que termine este
    if (videoEl.readyState >= 2 && !videoEl.paused) {
      detector.detect(videoEl)
        .then((r: Array<{ rawValue: string }>) => {
          if (activo && r?.length && r[0].rawValue) {
            callback({ getText: () => r[0].rawValue } as unknown as Result, undefined, controles);
          }
        })
        .catch(() => undefined)
        .then(siguiente);
    } else {
      siguiente();
    }
  };
  ciclo();
  return controles;
}

async function iniciarConZxing(videoEl: HTMLVideoElement, callback: CallbackEscaneo): Promise<IScannerControls> {
  const reader = new BrowserMultiFormatReader();
  let controles: IScannerControls;
  try {
    controles = await reader.decodeFromConstraints({ video: VIDEO_CAMARA }, videoEl, callback);
  } catch {
    controles = await reader.decodeFromVideoDevice(undefined, videoEl, callback);
  }
  const quitarToque = acelerarEnfoque(videoEl, videoEl.srcObject as MediaStream | null);
  const detener = controles.stop.bind(controles);
  controles.stop = () => { quitarToque(); detener(); };
  return controles;
}
